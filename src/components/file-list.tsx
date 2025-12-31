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
    RotateCcw
} from 'lucide-react';
import { formatBytes } from '@/lib/compression';
import type { ImageFile } from '@/types/compression';

interface FileListProps {
    files: ImageFile[];
    onRemoveFile: (id: string) => void;
    onClearAll: () => void;
    onRetryFile?: (id: string) => void;
}

export function FileList({ files, onRemoveFile, onClearAll, onRetryFile }: FileListProps) {

    // Memoize expensive calculations to avoid recalculating on every render
    const stats = useMemo(() => {
        const completed = files.filter(f => f.status === 'done');
        const totalOriginal = files.reduce((sum, f) => sum + f.originalSize, 0);
        const totalCompressed = completed.reduce((sum, f) => sum + (f.compressedSize || 0), 0);

        return {
            totalOriginal,
            totalCompressed,
            completedCount: completed.length,
            processingCount: files.filter(f => f.status === 'processing').length,
            errorCount: files.filter(f => f.status === 'error').length,
            overallProgress: files.length > 0
                ? Math.round((completed.length / files.length) * 100)
                : 0,
            totalSaved: totalOriginal > 0 && totalCompressed > 0
                ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)
                : 0,
        };
    }, [files]);

    // Confirm before clearing all files
    const handleClearAll = useCallback(() => {
        if (files.length > 0 && window.confirm('Remove all files? This cannot be undone.')) {
            onClearAll();
        }
    }, [files.length, onClearAll]);

    const { totalOriginal, totalCompressed, completedCount, processingCount, errorCount, overallProgress, totalSaved } = stats;

    if (files.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
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
                        Clear All
                    </Button>
                </div>

                {/* Overall Progress */}
                <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            {completedCount} of {files.length} complete
                            {processingCount > 0 && ` • ${processingCount} processing`}
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
                    <div className="flex gap-4 text-sm pt-2">
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
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                    {files.map((file) => (
                        <FileItem
                            key={file.id}
                            file={file}
                            onRemove={() => onRemoveFile(file.id)}
                            onRetry={onRetryFile ? () => onRetryFile(file.id) : undefined}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

interface FileItemProps {
    file: ImageFile;
    onRemove: () => void;
    onRetry?: () => void;
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
const FileItem = React.memo(function FileItem({ file, onRemove, onRetry }: FileItemProps) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors group min-h-[56px]">
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

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(file.originalSize)}</span>
                    {file.status === 'done' && file.compressedSize && (
                        <>
                            <span>→</span>
                            <span>{formatBytes(file.compressedSize)}</span>
                        </>
                    )}
                    {file.status === 'error' && file.error && (
                        <span className="text-destructive truncate">{file.error}</span>
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
                    <Badge variant="secondary">Pending</Badge>
                )}
                {file.status === 'error' && (
                    <Badge variant="destructive">Failed</Badge>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Download button for completed files */}
                {file.status === 'done' && file.compressedBlob && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadFile(file)}
                        aria-label={`Download ${file.name}`}
                        className="h-9 w-9 opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                )}

                {/* Retry button for failed files */}
                {file.status === 'error' && onRetry && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRetry}
                        aria-label={`Retry ${file.name}`}
                        className="h-9 w-9"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                )}

                {/* Remove Button - Always visible on touch, fade on desktop hover */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    aria-label={`Remove ${file.name}`}
                    className="h-9 w-9 opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity touch-manipulation"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
});
