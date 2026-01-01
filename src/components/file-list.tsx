'use client';

import React, { useMemo, useCallback } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    FileImage,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Trash2,
    Clock,
    Download,
    RotateCcw,
    Eye
} from 'lucide-react';
import { formatBytes } from '@/lib/compression';
import { sendEvent } from '@/lib/analytics';
import type { ImageFile } from '@/types/compression';

interface FileListProps {
    files: ImageFile[];
    onRemoveFile: (id: string) => void;
    onClearAll: () => void;
    onRetryFile?: (file: ImageFile) => void;
    onPreview?: (file: ImageFile) => void;
}

export function FileList({ files, onRemoveFile, onClearAll, onRetryFile, onPreview }: FileListProps) {

    // Memoize expensive calculations to avoid recalculating on every render
    const stats = useMemo(() => {
        let totalOriginal = 0;
        let totalCompressed = 0;
        let completedCount = 0;
        let processingCount = 0;
        let errorCount = 0;

        files.forEach(f => {
            totalOriginal += f.originalSize;
            if (f.status === 'done') {
                completedCount++;
                totalCompressed += (f.compressedSize || 0);
            } else if (f.status === 'processing') {
                processingCount++;
            } else if (f.status === 'error') {
                errorCount++;
            }
        });

        return {
            totalOriginal,
            totalCompressed,
            completedCount,
            processingCount,
            errorCount,
            overallProgress: files.length > 0
                ? Math.round((completedCount / files.length) * 100)
                : 0,
            totalSaved: totalOriginal > 0 && totalCompressed > 0
                ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)
                : 0,
        };
    }, [files]);

    // Confirm before clearing all files
    const handleClearAll = useCallback(() => {
        if (files.length > 0 && window.confirm('Remove all files? This cannot be undone.')) {
            sendEvent('clear_all_clicked', { file_count: files.length });
            onClearAll();
        }
    }, [files.length, onClearAll]);

    const { totalOriginal, totalCompressed, completedCount, processingCount, errorCount, overallProgress, totalSaved } = stats;

    if (files.length === 0) {
        return null;
    }

    return (
        <Card className="max-w-full overflow-hidden">
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                    display: block; /* Force display */
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: var(--border);
                    border-radius: 9999px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: var(--muted-foreground);
                }
                /* Firefox */
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: var(--border) transparent;
                }
            `}</style>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <FileImage className="w-4 h-4" />
                        Files ({files.length})
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Clear All</span>
                        <span className="sm:hidden">Clear</span>
                    </Button>
                </div>

                {/* Overall Progress */}
                <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap justify-between gap-y-1 text-sm">
                        <span className="text-muted-foreground">
                            {completedCount} of {files.length} complete
                            {errorCount > 0 && ` • ${errorCount} failed`}
                        </span>
                        {totalSaved > 0 && (
                            <span className="font-medium text-green-600 dark:text-green-400">
                                -{totalSaved}% saved
                            </span>
                        )}
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                </div>

                {/* Summary Stats */}
                {completedCount > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm pt-2">
                        <div>
                            <span className="text-muted-foreground">Original: </span>
                            <span className="font-medium">{formatBytes(totalOriginal)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Compressed: </span>
                            <span className="font-medium">{formatBytes(totalCompressed)}</span>
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent className="pt-0">
                <div className="relative group/list">
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar overscroll-contain">
                        {files.map((file) => (
                            <FileItem
                                key={file.id}
                                file={file}
                                onRemove={onRemoveFile}
                                onRetry={onRetryFile}
                                onPreview={onPreview}
                            />
                        ))}
                    </div>
                    {/* Scroll hint gradient - visible when content overflows */}
                    <div className="absolute bottom-0 left-0 right-1 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none opacity-0 group-hover/list:opacity-100 transition-opacity" />
                </div>
            </CardContent>
        </Card>
    );
}

interface FileItemProps {
    file: ImageFile;
    onRemove: (id: string) => void;
    onRetry?: (file: ImageFile) => void;
    onPreview?: (file: ImageFile) => void;
}

// Download individual file
function downloadFile(file: ImageFile) {
    if (!file.compressedBlob) return;
    const url = URL.createObjectURL(file.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Memoized FileItem to prevent re-renders when other files change
const FileItem = React.memo(function FileItem({ file, onRemove, onRetry, onPreview }: FileItemProps) {
    return (
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors group min-h-[56px]">
            {/* Status Icon */}
            <div className="flex-shrink-0">
                {file.status === 'pending' && (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                {file.status === 'processing' && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {file.status === 'done' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                )}
            </div>

            {/* File Info - Clickable for Preview */}
            <div
                className={`flex-1 min-w-0 ${onPreview ? 'cursor-pointer' : ''}`}
                onClick={() => onPreview?.(file)}
            >
                <p className="text-sm font-medium truncate" title={file.name}>
                    <span className="sm:hidden">
                        {file.name.length > 25
                            ? `${file.name.slice(0, 16)}...${file.name.slice(-7)}`
                            : file.name}
                    </span>
                    <span className="hidden sm:inline">{file.name}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(file.originalSize)}</span>
                    {file.status === 'done' && file.compressedSize && (
                        <>
                            <span>→</span>
                            <span>{formatBytes(file.compressedSize)}</span>
                        </>
                    )}
                    {file.status === 'error' && file.error && (
                        <span className="text-destructive truncate max-w-[100px]">{file.error}</span>
                    )}
                </div>
            </div>

            {/* Badge */}
            <div className="flex-shrink-0">
                {file.status === 'done' && file.percentSaved !== undefined && (
                    <Badge
                        variant={file.percentSaved > 0 ? 'default' : 'secondary'}
                        className={file.percentSaved > 0 ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                        {file.percentSaved > 0 ? `-${file.percentSaved}%` : 'Same'}
                    </Badge>
                )}
                {file.status === 'processing' && (
                    <Badge variant="outline">Processing</Badge>
                )}
                {file.status === 'pending' && (
                    <Badge variant="secondary" className="bg-muted-foreground/10 hover:bg-muted-foreground/20 text-muted-foreground">Ready</Badge>
                )}
                {file.status === 'error' && (
                    <Badge variant="destructive">Failed</Badge>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Preview Button - Explicit action */}
                {onPreview && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(file);
                        }}
                        aria-label={`Preview ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                )}

                {/* Download button for completed files */}
                {file.status === 'done' && file.compressedBlob && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                        }}
                        aria-label={`Download ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                )}

                {/* Retry button for failed files */}
                {file.status === 'error' && onRetry && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRetry?.(file);
                        }}
                        aria-label={`Retry ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                )}

                {/* Remove Button - Always visible on touch, fade on desktop hover */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(file.id);
                    }}
                    aria-label={`Remove ${file.name}`}
                    className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
});
