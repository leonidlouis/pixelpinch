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
            size="lg"
            onClick={handleDownload}
            disabled={disabled || !hasFiles || isZipping}
            className="w-full gap-2"
        >
            {isZipping ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating ZIP...
                </>
            ) : completedFiles.length > 1 ? (
                <>
                    <Archive className="w-5 h-5" />
                    Download All ({completedFiles.length} files)
                </>
            ) : (
                <>
                    <Download className="w-5 h-5" />
                    {hasFiles ? 'Download' : 'No files ready'}
                </>
            )}
        </Button>
    );
}
