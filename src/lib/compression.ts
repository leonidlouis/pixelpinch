// Compression orchestration - uses Web Worker pool for parallel processing
// HEIC conversion still happens on main thread (requires Canvas API)

import type { ImageFile, CompressionSettings, CompressionRequest } from '@/types/compression';
import { getWorkerPool } from './worker-pool';


/**
 * Async semaphore for limiting concurrent operations.
 * Used to prevent memory exhaustion when processing large batches of images.
 * 
 * The semaphore ensures that at most `permits` operations can run concurrently.
 * Additional operations wait in a queue and proceed as permits are released.
 */
class AsyncSemaphore {
    private permits: number;
    private waitQueue: (() => void)[] = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    /**
     * Acquire a permit. If no permits are available, wait in queue.
     */
    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        // No permits available - wait in queue
        return new Promise<void>(resolve => {
            this.waitQueue.push(resolve);
        });
    }

    /**
     * Release a permit. If tasks are waiting, wake the next one.
     */
    release(): void {
        const next = this.waitQueue.shift();
        if (next) {
            // Pass permit directly to next waiter
            next();
        } else {
            // No waiters - return permit to pool
            this.permits++;
        }
    }
}

// Detect iOS for more conservative memory limits
function isIOSDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Get optimal concurrency limit based on device
function getOptimalConcurrencyLimit(): number {
    const isIOS = isIOSDevice();
    // iOS Safari has stricter memory limits - use conservative value
    // Desktop can handle more concurrent preparations
    return isIOS ? 3 : 6;
}


/**
 * Generates a unique ID for file tracking.
 * @returns A random string ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}


/**
 * Formats bytes into a human-readable string (e.g., "1.5 MB").
 * @param bytes - The size in bytes
 * @returns Formatted string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}


/**
 * Calculates the percentage of space saved by compression.
 * @param original - Original file size in bytes
 * @param compressed - Compressed file size in bytes
 * @returns Integer percentage (e.g., 45 for 45% saved)
 */
export function calculatePercentSaved(original: number, compressed: number): number {
    if (original === 0) return 0;
    return Math.round(((original - compressed) / original) * 100);
}

// Check if file is HEIC
export function isHeicFile(file: File): boolean {
    return (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif')
    );
}

// Convert HEIC to PNG using heic2any (runs on main thread - needs Canvas)
async function convertHeicToBlob(file: File): Promise<Blob> {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({
        blob: file,
        toType: 'image/png',
        quality: 1,
    });

    return Array.isArray(result) ? result[0] : result;
}

// Prepare file for compression (handles HEIC conversion on main thread)
async function prepareFile(file: File): Promise<{ data: ArrayBuffer; mimeType: string }> {
    let blob: Blob = file;
    let mimeType = file.type;

    if (isHeicFile(file)) {
        blob = await convertHeicToBlob(file);
        mimeType = 'image/png';
    }

    const data = await blob.arrayBuffer();
    return { data, mimeType };
}

// Compression timeout in milliseconds (60 seconds per file)
const COMPRESSION_TIMEOUT_MS = 60000;

// Wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), ms)
        )
    ]);
}

// Compress a single file using the worker pool
async function compressFileWithWorker(
    imageFile: ImageFile,
    settings: CompressionSettings,
    onProgress: (file: ImageFile) => void
): Promise<ImageFile> {
    // Update status to processing
    const processingFile: ImageFile = { ...imageFile, status: 'processing' };
    onProgress(processingFile);

    try {
        // Prepare file data on main thread (HEIC conversion happens here)
        const { data, mimeType } = await prepareFile(imageFile.file);

        // Create request for worker
        const request: CompressionRequest = {
            id: imageFile.id,
            imageData: data,
            fileName: imageFile.name,
            mimeType,
            settings,
        };

        // Send to worker pool for compression with timeout
        const pool = getWorkerPool();
        const response = await withTimeout(
            pool.compress(request),
            COMPRESSION_TIMEOUT_MS,
            `Compression timed out after ${COMPRESSION_TIMEOUT_MS / 1000} seconds`
        );

        if (response.status === 'error') {
            throw new Error(response.error || 'Compression failed');
        }

        const extension = settings.format === 'webp' ? '.webp' : '.jpg';
        const baseName = imageFile.name.replace(/\.[^.]+$/, '');

        const compressedBlob = new Blob([response.compressedData!], {
            type: settings.format === 'webp' ? 'image/webp' : 'image/jpeg',
        });

        // Keep original file reference for re-compression capability
        const result: ImageFile = {
            id: imageFile.id,
            file: imageFile.file, // Preserve for re-compression
            name: `${baseName}${extension}`,
            originalSize: imageFile.originalSize,
            status: 'done',
            compressedSize: response.compressedSize,
            compressedBlob,
            percentSaved: calculatePercentSaved(imageFile.originalSize, response.compressedSize!),
        };

        onProgress(result);
        return result;
    } catch (error) {
        console.error('Compression error:', error);
        const errorFile: ImageFile = {
            ...imageFile,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        onProgress(errorFile);
        return errorFile;
    }
}


/**
 * Compress multiple files in parallel using the worker pool.
 * Uses a sliding window approach to limit memory usage while maximizing throughput.
 * 
 * Memory Management:
 * - Uses AsyncSemaphore to limit concurrent file preparations
 * - Concurrency limit is controlled by settings.parallelWorkers (user-configurable)
 * - Each file must acquire a permit before its ArrayBuffer is created
 * - Permits are released after compression completes
 * - This prevents iOS Safari from killing the page due to memory pressure
 * 
 * @param files - Array of ImageFile objects to compress
 * @param settings - Compression settings (quality, format, parallelWorkers)
 * @param onProgress - Callback function invoked when a file's status changes
 * @returns Promise resolving to the array of processed ImageFiles
 */
export async function compressFiles(
    files: ImageFile[],
    settings: CompressionSettings,
    onProgress: (file: ImageFile) => void
): Promise<ImageFile[]> {
    // Get/create worker pool with user-specified size
    // Pool will be recreated if size changed from last call
    const pool = getWorkerPool(settings.parallelWorkers);
    await pool.initialize();

    // Use same limit for semaphore (controls sliding window of preparations)
    const concurrencyLimit = settings.parallelWorkers || getOptimalConcurrencyLimit();
    const semaphore = new AsyncSemaphore(concurrencyLimit);

    // Process all files with controlled concurrency
    // Each file waits for a semaphore permit before preparing its ArrayBuffer
    // This creates a "sliding window" of files in memory
    const results = await Promise.allSettled(
        files.map(async (file) => {
            // Wait for a permit before preparing file (creating ArrayBuffer)
            await semaphore.acquire();
            try {
                return await compressFileWithWorker(file, settings, onProgress);
            } finally {
                // Release permit after compression completes (success or failure)
                // This allows the next file in queue to start preparing
                semaphore.release();
            }
        })
    );

    // Extract values, converting rejected promises to error results
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            // Convert rejected promise to error state
            const errorFile: ImageFile = {
                ...files[index],
                status: 'error',
                error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            };
            onProgress(errorFile);
            return errorFile;
        }
    });
}


/**
 * Legacy function for single file compression.
 * Note: Use compressFiles for batch operations to ensure proper concurrency management.
 * 
 * @param imageFile - Single file to compress
 * @param settings - Compression settings
 * @param onProgress - Progress callback
 * @returns Promise resolving to compressed file result
 */
export async function compressFile(
    imageFile: ImageFile,
    settings: CompressionSettings,
    onProgress: (file: ImageFile) => void
): Promise<ImageFile> {
    const pool = getWorkerPool();
    await pool.initialize();
    return compressFileWithWorker(imageFile, settings, onProgress);
}

// Supported file types
export const SUPPORTED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
];

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

// Validate file type
export function isValidImageFile(file: File): boolean {
    const typeValid = SUPPORTED_TYPES.includes(file.type.toLowerCase());
    const extensionValid = SUPPORTED_EXTENSIONS.some(ext =>
        file.name.toLowerCase().endsWith(ext)
    );
    return typeValid || extensionValid;
}
