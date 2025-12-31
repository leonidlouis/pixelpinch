'use client';

import { useState, useCallback } from 'react';
import { DropZone } from '@/components/drop-zone';
import { SettingsPanel } from '@/components/settings-panel';
import { FileList } from '@/components/file-list';
import { DownloadButton } from '@/components/download-button';
import { Button } from '@/components/ui/button';
import { Play, Zap } from 'lucide-react';
import {
  generateId,
  compressFiles,
  isValidImageFile
} from '@/lib/compression';
import type { ImageFile, CompressionSettings } from '@/types/compression';

export default function Home() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 80,
    format: 'webp',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Add new files
  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const imageFiles: ImageFile[] = newFiles
      .filter(isValidImageFile)
      .map(file => ({
        id: generateId(),
        file,
        name: file.name,
        originalSize: file.size,
        status: 'pending' as const,
      }));

    setFiles(prev => [...prev, ...imageFiles]);
  }, []);

  // Update file in state
  const updateFile = useCallback((updatedFile: ImageFile) => {
    setFiles(prev =>
      prev.map(f => f.id === updatedFile.id ? updatedFile : f)
    );
  }, []);

  // Remove file
  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Clear all files
  const handleClearAll = useCallback(() => {
    setFiles([]);
  }, []);

  // Start compression
  const handleStartCompression = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);

    try {
      await compressFiles(pendingFiles, settings, updateFile);
    } finally {
      setIsProcessing(false);
    }
  }, [files, settings, updateFile]);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">PixelPinch</h1>
                <p className="text-xs text-muted-foreground">Batch image compression</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="flex items-center gap-3">
                <DownloadButton files={files} disabled={isProcessing} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Drop Zone */}
        <DropZone
          onFilesAdded={handleFilesAdded}
          disabled={isProcessing}
        />

        {/* If we have files, show settings and file list */}
        {files.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Sidebar: Settings + Actions */}
            <div className="lg:col-span-1 space-y-4">
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
                disabled={isProcessing}
              />

              {/* Compress Button */}
              <Button
                size="lg"
                onClick={handleStartCompression}
                disabled={!pendingCount || isProcessing}
                className="w-full gap-2"
              >
                <Play className="w-5 h-5" />
                {isProcessing
                  ? `Processing (${processingCount})...`
                  : pendingCount > 0
                    ? `Compress ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                    : 'All done!'}
              </Button>
            </div>

            {/* Main: File List */}
            <div className="lg:col-span-2">
              <FileList
                files={files}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAll}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Drop some images above to get started
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['50+ images', 'WebP & JPEG', 'HEIC support', 'No upload'].map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1 rounded-full bg-muted text-xs font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            All processing happens in your browser. Your images never leave your device.
          </p>
        </div>
      </footer>
    </div>
  );
}
