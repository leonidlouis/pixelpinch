'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DropZone } from '@/components/drop-zone';
import { SettingsPanel } from '@/components/settings-panel';
import { FileList } from '@/components/file-list';
import { DownloadButton } from '@/components/download-button';
import { Button } from '@/components/ui/button';
import { Play, Zap, CoffeeIcon, RefreshCw } from 'lucide-react';
import {
  generateId,
  compressFiles,
  isValidImageFile
} from '@/lib/compression';
import type { ImageFile, CompressionSettings } from '@/types/compression';

function SupportDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium transition-all text-[11px] uppercase tracking-wider"
      >
        <CoffeeIcon className="w-3.5 h-3.5 fill-current" />
        buy me a coffee
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-1.5 bg-popover border border-border/50 rounded-xl shadow-2xl min-w-[220px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
          <div className="flex flex-col gap-1">
            {[
              {
                label: 'Buy me a coffee',
                href: 'https://www.buymeacoffee.com/louvre_',
                emoji: '☕',
              },
              {
                label: 'Saweria (ID 🇮🇩)',
                href: 'https://saweria.co/louvre325',
                emoji: '💸',
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-all group"
              >
                <span className="text-xl flex-shrink-0 transition-transform group-hover:scale-110 group-active:scale-95">
                  {item.emoji}
                </span>
                <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground">
                  {item.label}
                </span>
              </a>
            ))}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px]">
            <div className="w-2.5 h-2.5 bg-popover border-r border-b border-border/50 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 80,
    format: 'jpeg',
  });
  const [lastRunSettings, setLastRunSettings] = useState<CompressionSettings | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if settings changed since last run
  const hasUnsavedChanges = lastRunSettings && (
    lastRunSettings.quality !== settings.quality ||
    lastRunSettings.format !== settings.format
  );

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
    setLastRunSettings(null);
  }, []);

  // Start compression or Re-compress
  const handleStartCompression = useCallback(async () => {
    let filesToProcess = files.filter(f => f.status === 'pending');

    // Re-compress mode: If no pending files but we have settings changes, re-do everything
    if (filesToProcess.length === 0 && files.length > 0) {
      filesToProcess = files.map(f => ({
        ...f,
        status: 'pending' as const,
        error: undefined,
        compressedSize: undefined,
        compressedBlob: undefined,
        percentSaved: undefined
      }));
      // Update UI immediately to show pending state
      setFiles(filesToProcess);
    }

    if (filesToProcess.length === 0) return;

    setIsProcessing(true);
    setLastRunSettings(settings);

    try {
      await compressFiles(filesToProcess, settings, updateFile);
    } finally {
      setIsProcessing(false);
    }
  }, [files, settings, updateFile]);

  // Retry a failed file
  const handleRetryFile = useCallback(async (file: ImageFile) => {
    if (file.status !== 'error' || !file.file) return;

    // Reset file to pending
    const resetFile: ImageFile = { ...file, status: 'pending', error: undefined };
    updateFile(resetFile);

    // Re-compress just this file
    setIsProcessing(true);
    try {
      await compressFiles([resetFile], settings, updateFile);
    } finally {
      setIsProcessing(false);
    }
  }, [settings, updateFile]);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const showRecompress = files.length > 0 && pendingCount === 0 && hasUnsavedChanges;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50 supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-neutral-900 flex-shrink-0 shadow-lg shadow-yellow-500/20">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">PixelPinch</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Instant batch compression</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="flex items-center gap-3 flex-shrink-0">
                <DownloadButton files={files} disabled={isProcessing} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full">
        {/* Drop Zone */}
        <DropZone
          onFilesAdded={handleFilesAdded}
          disabled={isProcessing}
        />

        {/* If we have files, show settings and file list */}
        {files.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:pb-0">
            {/* Sidebar: Settings + Actions */}
            <div className="space-y-4 order-2 lg:order-1">
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
                disabled={isProcessing}
              />

              {/* Desktop Compress Button */}
              <Button
                size="lg"
                onClick={handleStartCompression}
                disabled={(!pendingCount && !showRecompress) || isProcessing}
                className="w-full gap-2 hidden lg:flex shadow-lg shadow-primary/10"
              >
                {showRecompress ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isProcessing
                  ? `Processing (${processingCount})...`
                  : showRecompress
                    ? 'Re-compress'
                    : pendingCount > 0
                      ? `Compress ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                      : 'Finished'}
              </Button>
            </div>

            {/* Main: File List */}
            <div className="order-1 lg:order-2 min-w-0 w-full">
              <FileList
                files={files}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAll}
                onRetryFile={handleRetryFile}
              />
            </div>

            {/* Mobile Sticky Compress Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t z-40 lg:hidden safe-area-bottom shadow-2xl animate-in slide-in-from-bottom-full duration-300">
              <div className="max-w-md mx-auto">
                <Button
                  size="lg"
                  onClick={handleStartCompression}
                  disabled={(!pendingCount && !showRecompress) || isProcessing}
                  className="w-full gap-2 shadow-xl shadow-primary/20"
                >
                  {showRecompress ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isProcessing
                    ? `Processing (${processingCount})...`
                    : showRecompress
                      ? 'Re-compress'
                      : pendingCount > 0
                        ? `Compress ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                        : 'Finished'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['lightning fast', 'no limits', '100% private'].map((feature) => (
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
      <footer className="border-t border-border/50 lg:mt-auto pb-15 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-3">
          <p>
            All processing happens in your browser. Your images never leave your device.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <span>Made by <a href="https://bylouis.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Louis</a></span>
            <span className="text-border">•</span>
            <SupportDropdown />
          </div>
        </div>
      </footer>
    </div>
  );
}
