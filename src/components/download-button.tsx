'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Archive } from 'lucide-react';
import type { ImageFile } from '@/types/compression';

interface DownloadButtonProps {
    files: ImageFile[];
    disabled?: boolean;
}

export function DownloadButton({ files, disabled }: DownloadButtonProps) {
    const [isZipping, setIsZipping] = useState(false);

    const completedFiles = files.filter(f => f.status === 'done' && f.compressedBlob);
    const hasFiles = completedFiles.length > 0;

    const handleDownload = async () => {
        if (!hasFiles) return;

        // For single file, download directly
        if (completedFiles.length === 1) {
            const file = completedFiles[0];
            const blob = file.compressedBlob;
            if (!blob) return; // Guard against missing blob

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }

        // For multiple files, create ZIP
        setIsZipping(true);

        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            for (const file of completedFiles) {
                if (file.compressedBlob) {
                    zip.file(file.name, file.compressedBlob);
                }
            }

            const blob = await zip.generateAsync({
                type: 'blob',
                compression: 'STORE', // No additional compression for already-compressed images
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compressed-images-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to create ZIP:', error);
        } finally {
            setIsZipping(false);
        }
    };

    return (
        <Button
            size="default"
            onClick={handleDownload}
            disabled={disabled || !hasFiles || isZipping}
            className="gap-2 text-sm sm:text-base"
        >
            {isZipping ? (
                <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">Creating ZIP...</span>
                    <span className="sm:hidden">ZIP...</span>
                </>
            ) : completedFiles.length > 1 ? (
                <>
                    <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Download All ({completedFiles.length})</span>
                    <span className="sm:hidden">All ({completedFiles.length})</span>
                </>
            ) : (
                <>
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{hasFiles ? 'Download' : 'No files'}</span>
                </>
            )}
        </Button>
    );
}
