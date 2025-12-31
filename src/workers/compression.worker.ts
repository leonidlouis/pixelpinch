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
let isInitialized = false;
let wasmBaseUrl = '';

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

async function initCodecs(baseUrl: string) {
    if (isInitialized) return;

    wasmBaseUrl = `${baseUrl}/wasm`;
    console.log('[Worker] Initializing codecs with base URL:', wasmBaseUrl);

    try {
        // Pre-fetch all WASM modules in parallel
        const [
            mozjpegEncWasm,
            mozjpegDecWasm,
            webpEncWasm,
            webpDecWasm,
            pngWasm,
        ] = await Promise.all([
            fetchWasm('mozjpeg_enc.wasm'),
            fetchWasm('mozjpeg_dec.wasm'),
            fetchWasm('webp_enc.wasm'),
            fetchWasm('webp_dec.wasm'),
            fetchWasm('squoosh_png_bg.wasm'),
        ]);

        console.log('[Worker] WASM modules fetched, initializing codecs...');

        // Initialize each codec with the pre-compiled WASM module
        await Promise.all([
            jpegEncode.init(mozjpegEncWasm),
            jpegDecode.init(mozjpegDecWasm),
            webpEncode.init(webpEncWasm),
            webpDecode.init(webpDecWasm),
            pngDecode.init(pngWasm),
        ]);

        isInitialized = true;
        console.log('[Worker] All codecs initialized successfully');
    } catch (error) {
        console.error('[Worker] Failed to initialize codecs:', error);
        throw error;
    }
}

async function decodeImage(data: ArrayBuffer, mimeType: string): Promise<ImageData> {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        return await jpegDecode.default(data);
    } else if (mimeType === 'image/webp') {
        return await webpDecode.default(data);
    } else if (mimeType === 'image/png') {
        return await pngDecode.default(data);
    } else {
        // For other formats (like converted HEIC), try PNG first, then JPEG
        try {
            return await pngDecode.default(data);
        } catch {
            try {
                return await jpegDecode.default(data);
            } catch {
                throw new Error(`Unsupported image format: ${mimeType}`);
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
        return await webpEncode.default(imageData, { quality });
    } else {
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
        // Ensure codecs are initialized before compressing
        if (!isInitialized) {
            const errorResponse: CompressionResponse = {
                id: message.payload.id,
                status: 'error',
                originalSize: message.payload.imageData.byteLength,
                error: 'Codecs not initialized. Please refresh the page.',
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
