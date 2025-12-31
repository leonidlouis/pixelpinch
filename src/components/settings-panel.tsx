'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import type { CompressionSettings, OutputFormat } from '@/types/compression';

interface SettingsPanelProps {
    settings: CompressionSettings;
    onSettingsChange: (settings: CompressionSettings) => void;
    disabled?: boolean;
}

export function SettingsPanel({ settings, onSettingsChange, disabled }: SettingsPanelProps) {
    const handleQualityChange = (value: number[]) => {
        onSettingsChange({ ...settings, quality: value[0] });
    };

    const handleFormatChange = (format: OutputFormat) => {
        onSettingsChange({ ...settings, format });
    };

    // Quality level labels
    const getQualityLabel = (quality: number): string => {
        if (quality >= 90) return 'Maximum';
        if (quality >= 75) return 'High';
        if (quality >= 50) return 'Medium';
        if (quality >= 25) return 'Low';
        return 'Minimum';
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="w-4 h-4" />
                    Compression Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Quality Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Quality</label>
                        <span className="text-sm text-muted-foreground">
                            {settings.quality}% • {getQualityLabel(settings.quality)}
                        </span>
                    </div>
                    <Slider
                        value={[settings.quality]}
                        onValueChange={handleQualityChange}
                        min={1}
                        max={100}
                        step={1}
                        disabled={disabled}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Smaller file</span>
                        <span>Better quality</span>
                    </div>
                </div>

                {/* Format Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Output Format</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant={settings.format === 'webp' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleFormatChange('webp')}
                            disabled={disabled}
                            className="w-full"
                        >
                            <span className="mr-2">🌐</span>
                            WebP
                        </Button>
                        <Button
                            variant={settings.format === 'jpeg' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleFormatChange('jpeg')}
                            disabled={disabled}
                            className="w-full"
                        >
                            <span className="mr-2">📷</span>
                            JPEG
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {settings.format === 'webp'
                            ? 'WebP offers best compression with good quality'
                            : 'JPEG for maximum compatibility'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
