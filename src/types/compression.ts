// Compression types for the PixelPinch app

export type OutputFormat = 'webp' | 'jpeg';

export type CompressionStatus = 'pending' | 'processing' | 'done' | 'error';

export interface CompressionSettings {
  quality: number; // 1-100
  format: OutputFormat;
  parallelWorkers: number; // 1 to hardwareConcurrency-1
}

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize?: number;
  compressedBlob?: Blob;
  status: CompressionStatus;
  error?: string;
  percentSaved?: number;
}

// Worker message types
export interface CompressionRequest {
  id: string;
  imageData: ArrayBuffer;
  fileName: string;
  mimeType: string;
  settings: CompressionSettings;
}

export interface CompressionResponse {
  id: string;
  status: 'success' | 'error';
  compressedData?: ArrayBuffer;
  originalSize: number;
  compressedSize?: number;
  error?: string;
}

export type WorkerMessage =
  | { type: 'compress'; payload: CompressionRequest }
  | { type: 'init'; baseUrl: string };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'init-error'; payload: { message: string } }
  | { type: 'result'; payload: CompressionResponse }
  | { type: 'progress'; payload: { id: string; progress: number } };
