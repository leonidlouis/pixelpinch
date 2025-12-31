// Compression orchestration - uses Web Worker pool for parallel processing
// HEIC conversion still happens on main thread (requires Canvas API)

import type { ImageFile, CompressionSettings, CompressionRequest } from '@/types/compression';
import { getWorkerPool } from './worker-pool';


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

        // Clear original file reference to free memory (keep only what we need)
        const result: ImageFile = {
            id: imageFile.id,
            file: null as unknown as File, // Release original file to free memory
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
 * Handles concurrency, error recovery, and status updates.
 * 
 * @param files - Array of ImageFile objects to compress
 * @param settings - Compression settings (quality, format)
 * @param onProgress - Callback function invoked when a file's status changes
 * @returns Promise resolving to the array of processed ImageFiles
 */
export async function compressFiles(
    files: ImageFile[],
    settings: CompressionSettings,
    onProgress: (file: ImageFile) => void
): Promise<ImageFile[]> {
    // Initialize worker pool (lazy initialization)
    const pool = getWorkerPool();
    await pool.initialize();

    // Process all files in parallel using allSettled for resilience
    // This ensures one failure doesn't break the entire batch
    const results = await Promise.allSettled(
        files.map(file => compressFileWithWorker(file, settings, onProgress))
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
