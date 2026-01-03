'use client';

import React, { useCallback, useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { isValidImageFile, SUPPORTED_EXTENSIONS } from '@/lib/compression';

interface DropZoneProps {
    onFilesAdded: (files: File[]) => void;
    disabled?: boolean;
}

// Memoized to prevent re-renders when parent state updates (e.g. compression progress)
export const DropZone = React.memo(function DropZone({ onFilesAdded, disabled }: DropZoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragActive(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(isValidImageFile);

        if (validFiles.length > 0) {
            onFilesAdded(validFiles);
        }
    }, [onFilesAdded, disabled]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
        const validFiles = selectedFiles.filter(isValidImageFile);

        if (validFiles.length > 0) {
            onFilesAdded(validFiles);
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    }, [onFilesAdded]);

    return (
        <div
            role="region"
            aria-label="Image upload area"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
        relative flex flex-col items-center justify-center
        min-h-[180px] sm:min-h-[240px] md:min-h-[280px] rounded-2xl border-2 border-dashed
        transition-all duration-300 ease-out cursor-pointer
        ${isDragActive
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            <label htmlFor="image-upload-input" className="sr-only">
                Select images to compress
            </label>
            <input
                id="image-upload-input"
                type="file"
                multiple
                accept={SUPPORTED_EXTENSIONS.join(',')}
                onChange={handleFileInput}
                disabled={disabled}
                aria-label="Select images to compress"
                aria-describedby="upload-instructions"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className={`
        flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 text-center
        transition-transform duration-300
        ${isDragActive ? 'scale-110' : ''}
      `}>
                <div className={`
          p-3 sm:p-4 rounded-full transition-colors duration-300
          ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
        `}>
                    {isDragActive ? (
                        <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                    ) : (
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10" />
                    )}
                </div>

                <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1">
                        {isDragActive ? 'Drop images here' : 'Drag & drop images'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        or tap to browse files
                    </p>
                </div>

                <p id="upload-instructions" className="text-xs text-muted-foreground">
                    Supports JPEG, PNG, WebP, HEIC • as many images as you want
                </p>
            </div>
        </div>
    );
});
