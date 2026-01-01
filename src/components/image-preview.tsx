'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeftRight, FileImage, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/compression';
import { sendEvent } from '@/lib/analytics';
import { ImageFile } from '@/types/compression';
import { cn } from '@/lib/utils'; // Assuming this exists given shadcn usage, usually in lib/utils
// If lib/utils doesn't exist, I'll fallback to usage in file, check for clsx/tailwind-merge imports

interface ImagePreviewProps {
    file: ImageFile | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ImagePreview({ file, isOpen, onClose }: ImagePreviewProps) {
    const [showCompressed, setShowCompressed] = useState(true);

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [compressedSrc, setCompressedSrc] = useState<string | null>(null);

    // Initial state setup and updates
    useEffect(() => {
        if (isOpen && file) {
            // Set initial compressed view state based on file status
            // Only update if we're not already in that state (though this effect runs on file change)
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setShowCompressed(file.status === 'done');
        }
    }, [isOpen, file]);

    // Handle Object URLs safely
    useEffect(() => {
        if (!file) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setImageSrc(null);
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setCompressedSrc(null);
            return;
        }

        const newImageSrc = URL.createObjectURL(file.file);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setImageSrc(newImageSrc);

        let newCompressedSrc: string | null = null;
        if (file.compressedBlob) {
            newCompressedSrc = URL.createObjectURL(file.compressedBlob);
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setCompressedSrc(newCompressedSrc);
        } else {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            setCompressedSrc(null);
        }

        return () => {
            URL.revokeObjectURL(newImageSrc);
            if (newCompressedSrc) URL.revokeObjectURL(newCompressedSrc);
        };
    }, [file]);

    if (!isOpen || !file) return null;

    const isCompressedAvailable = file.status === 'done' && !!file.compressedBlob;
    const currentSrc = (showCompressed && isCompressedAvailable && compressedSrc) ? compressedSrc : imageSrc;

    // Stats
    const originalSize = file.originalSize;
    const compressedSize = file.compressedSize;
    const percentSaved = file.percentSaved;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-5xl h-[60vh] sm:h-[85vh] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 slide-in-from-bottom-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-1.5 sm:p-2 bg-background rounded-lg border border-border/50 shadow-sm shrink-0">
                            <FileImage className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">{file.name}</h3>
                            <p className="text-2xs text-muted-foreground">preview mode</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCompressedAvailable && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden sm:flex gap-2"
                                onClick={() => {
                                    if (file.compressedBlob) {
                                        const url = URL.createObjectURL(file.compressedBlob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = file.name;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    }
                                }}
                            >
                                <Download className="w-4 h-4" />
                                Save
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Main Preview Area */}
                <div className="flex-1 relative bg-black/5 dark:bg-black/20 overflow-hidden flex items-center justify-center p-4 checkerboard-bg">
                    {/* Checkerboard pattern css class would be ideal, but inline style for now if not global. 
                Using a subtle grid pattern or checkerboard for transparency.
             */}
                    <div className="absolute inset-0 z-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)`,
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }}
                    />

                    {currentSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={currentSrc}
                            alt="Preview"
                            className="relative z-10 max-w-full max-h-full object-contain shadow-xl rounded-md transition-all duration-300"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground z-10">
                            <FileImage className="w-12 h-12 opacity-20" />
                            <p>Loading preview...</p>
                        </div>
                    )}

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                        <Badge variant={showCompressed && isCompressedAvailable ? "default" : "secondary"} className="shadow-lg backdrop-blur-sm transition-all duration-300">
                            {showCompressed && isCompressedAvailable ? 'Compressed' : 'Original'}
                        </Badge>
                    </div>
                </div>

                {/* Footer / Controls */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border/50 bg-card flex flex-row items-center justify-between gap-3">

                    {/* Stats Comparison */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-sm">
                        <div className={cn("transition-opacity flex items-center sm:block gap-2 sm:gap-0", showCompressed && isCompressedAvailable ? "opacity-50" : "opacity-100 font-medium")}>
                            <p className="text-muted-foreground text-xs uppercase tracking-widest sm:mb-0.5">Orig<span className="hidden sm:inline">inal</span><span className="sm:hidden">:</span></p>
                            <p className="text-xs sm:text-sm font-medium">{formatBytes(originalSize)}</p>
                        </div>

                        <ArrowLeftRight className="w-4 h-4 text-muted-foreground/50 hidden sm:block" />

                        <div className={cn("transition-opacity flex items-center sm:block gap-2 sm:gap-0", !isCompressedAvailable ? "opacity-30" : (!showCompressed ? "opacity-50" : "opacity-100 font-medium"))}>
                            <p className="text-muted-foreground text-xs uppercase tracking-widest sm:mb-0.5">Comp<span className="hidden sm:inline">ressed</span><span className="sm:hidden">:</span></p>
                            <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm font-medium">{compressedSize ? formatBytes(compressedSize) : '---'}</p>
                                {percentSaved !== undefined && (
                                    <Badge variant={percentSaved > 0 ? 'default' : 'secondary'} className="text-2xs h-4 sm:h-5 px-1 sm:px-1.5 bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-green-500/20">
                                        -{percentSaved}%
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Toggle Control */}
                    {isCompressedAvailable ? (
                        <div className="flex items-center p-0.5 sm:p-1 bg-muted rounded-full border border-border/50 relative shrink-0">
                            <button
                                onClick={() => {
                                    setShowCompressed(false);
                                    sendEvent('preview_toggle_clicked', { view: 'original' });
                                }}
                                className={cn(
                                    "px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 relative z-10",
                                    !showCompressed
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Orig<span className="hidden sm:inline">inal</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowCompressed(true);
                                    sendEvent('preview_toggle_clicked', { view: 'compressed' });
                                }}
                                className={cn(
                                    "px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 relative z-10",
                                    showCompressed
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Comp<span className="hidden sm:inline">ressed</span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-xs sm:text-sm text-muted-foreground italic text-right">
                            Compress<span className="hidden sm:inline"> file</span> to compare
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
