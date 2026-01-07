// Web Worker for image compression using jSquash
// Runs in a separate thread to avoid blocking the main UI
// Pre-compiled by esbuild to bypass Turbopack blob URL issues

// Import shared types
import type {
    CompressionRequest,
    CompressionResponse,
    WorkerMessage,
    WorkerResponse
} from '../types/compression';

// Import encode/decode from jSquash packages
import * as jpegEncode from '@jsquash/jpeg/encode';
import * as jpegDecode from '@jsquash/jpeg/decode';
import * as webpEncode from '@jsquash/webp/encode';
import * as webpDecode from '@jsquash/webp/decode';
import * as pngDecode from '@jsquash/png/decode';

// Track initialization state
let wasmBaseUrl = '';
const initializedCodecs = new Set<string>();
const pendingInits = new Map<string, Promise<void>>();

// Fetch and compile WASM module
async function fetchWasm(filename: string): Promise<WebAssembly.Module> {
    const url = `${wasmBaseUrl}/${filename}`;
    console.log(`[Worker] Fetching WASM: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return WebAssembly.compile(buffer);
}

// Lazy load codec helper
async function ensureCodec(name: string, wasmFile: string, initFn: (module: WebAssembly.Module) => Promise<unknown>) {
    if (initializedCodecs.has(name)) return;

    let initPromise = pendingInits.get(name);
    if (!initPromise) {
        initPromise = (async () => {
            console.log(`[Worker] Initializing ${name}...`);
            const wasmModule = await fetchWasm(wasmFile);
            await initFn(wasmModule);
            initializedCodecs.add(name);
            console.log(`[Worker] ${name} initialized`);
        })();
        pendingInits.set(name, initPromise);
    }

    try {
        await initPromise;
    } finally {
        // Only delete from pending if it matches (though with await it should be fine)
        if (pendingInits.get(name) === initPromise) {
            pendingInits.delete(name);
        }
    }
}

async function initCodecs(baseUrl: string) {
    wasmBaseUrl = `${baseUrl}/wasm`;
    console.log('[Worker] Worker initialized with base URL:', wasmBaseUrl);
    // No eager loading - codecs are loaded on demand
}

async function decodeImage(data: ArrayBuffer, mimeType: string): Promise<ImageData> {
    // Try using native browser APIs first (faster + handles orientation)
    try {
        const blob = new Blob([data], { type: mimeType });
        
        // This is key: 'from-image' respects the EXIF orientation
        const bitmap = await self.createImageBitmap(blob, { 
            imageOrientation: 'from-image' 
        });

        // Use OffscreenCanvas to extract ImageData
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Failed to get 2d context from OffscreenCanvas');
        }

        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        
        // Clean up
        bitmap.close();
        
        return imageData;
    } catch (e) {
        console.warn('[Worker] Native decoding failed, falling back to WASM:', e);
        
        // Fallback to WASM decoders
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            await ensureCodec('jpeg_dec', 'mozjpeg_dec.wasm', jpegDecode.init);
            return await jpegDecode.default(data);
        } else if (mimeType === 'image/webp') {
            await ensureCodec('webp_dec', 'webp_dec.wasm', webpDecode.init);
            return await webpDecode.default(data);
        } else if (mimeType === 'image/png') {
            await ensureCodec('png_dec', 'squoosh_png_bg.wasm', pngDecode.init);
            return await pngDecode.default(data);
        } else {
            // For other formats (like converted HEIC), try PNG first, then JPEG
            try {
                await ensureCodec('png_dec', 'squoosh_png_bg.wasm', pngDecode.init);
                return await pngDecode.default(data);
            } catch {
                try {
                    await ensureCodec('jpeg_dec', 'mozjpeg_dec.wasm', jpegDecode.init);
                    return await jpegDecode.default(data);
                } catch {
                    throw new Error(`Unsupported image format: ${mimeType}`);
                }
            }
        }
    }
}

async function encodeImage(
    imageData: ImageData,
    format: 'webp' | 'jpeg',
    quality: number
): Promise<ArrayBuffer> {
    if (format === 'webp') {
        await ensureCodec('webp_enc', 'webp_enc.wasm', webpEncode.init);
        return await webpEncode.default(imageData, { quality });
    } else {
        await ensureCodec('jpeg_enc', 'mozjpeg_enc.wasm', jpegEncode.init);
        return await jpegEncode.default(imageData, { quality });
    }
}

async function compressImage(request: CompressionRequest): Promise<CompressionResponse> {
    try {
        // Decode the input image
        const imageData = await decodeImage(request.imageData, request.mimeType);

        // Encode to target format
        const compressed = await encodeImage(
            imageData,
            request.settings.format,
            request.settings.quality
        );

        return {
            id: request.id,
            status: 'success',
            compressedData: compressed,
            originalSize: request.imageData.byteLength,
            compressedSize: compressed.byteLength,
        };
    } catch (error) {
        return {
            id: request.id,
            status: 'error',
            originalSize: request.imageData.byteLength,
            error: error instanceof Error ? error.message : 'Unknown compression error',
        };
    }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    if (message.type === 'init') {
        try {
            await initCodecs(message.baseUrl);
            const response: WorkerResponse = { type: 'ready' };
            self.postMessage(response);
        } catch (error) {
            console.error('[Worker] Init failed:', error);
            // Send error response so main thread can handle it properly
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            self.postMessage({
                type: 'init-error',
                payload: { message: `Failed to initialize WASM codecs: ${errorMessage}` }
            } as WorkerResponse);
        }
        return;
    }

    if (message.type === 'compress') {
        // Check if base URL is set (init was called)
        if (!wasmBaseUrl) {
            const errorResponse: CompressionResponse = {
                id: message.payload.id,
                status: 'error',
                originalSize: message.payload.imageData.byteLength,
                error: 'Worker not initialized. Please refresh the page.',
            };
            self.postMessage({ type: 'result', payload: errorResponse } as WorkerResponse);
            return;
        }

        const result = await compressImage(message.payload);
        const response: WorkerResponse = { type: 'result', payload: result };

        // Transfer the compressed data buffer for efficiency
        if (result.compressedData) {
            self.postMessage(response, { transfer: [result.compressedData] });
        } else {
            self.postMessage(response);
        }
    }
};

// Signal that the worker script is loaded (not yet initialized)
console.log('[Worker] Compression worker loaded');
