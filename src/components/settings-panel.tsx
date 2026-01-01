'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Settings2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { CompressionSettings, OutputFormat } from '@/types/compression';

interface SettingsPanelProps {
    settings: CompressionSettings;
    onSettingsChange: (settings: CompressionSettings) => void;
    disabled?: boolean;
}

export function SettingsPanel({ settings, onSettingsChange, disabled }: SettingsPanelProps) {
    const [showGuide, setShowGuide] = useState(false);

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
                        <label htmlFor="quality-slider" className="text-sm font-medium">Quality</label>
                        <span className="text-sm text-muted-foreground">
                            {settings.quality}% • {getQualityLabel(settings.quality)}
                        </span>
                    </div>
                    <Slider
                        id="quality-slider"
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

                    {/* Quality Guide Toggle */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowGuide(!showGuide)}
                            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline focus:outline-none"
                        >
                            <Info className="w-3 h-3" />
                            <span>How to choose?</span>
                            {showGuide ? (
                                <ChevronUp className="w-3 h-3" />
                            ) : (
                                <ChevronDown className="w-3 h-3" />
                            )}
                        </button>

                        {showGuide && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <p><span className="font-semibold text-foreground">90-100%:</span> Virtually lossless. Best for photography.</p>
                                    <p><span className="font-semibold text-foreground">70-90%:</span> Recommended. Great balance for web.</p>
                                    <p><span className="font-semibold text-foreground">50-70%:</span> Good for thumbnails or previews.</p>
                                    <p className="text-destructive"><span className="font-semibold">Warning:</span> Anything below 50% have significant image quality degradation.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Format Selection */}
                <div className="space-y-3">
                    <span id="format-label" className="text-sm font-medium">Output Format</span>
                    <div
                        className="flex p-1 bg-muted rounded-xl"
                        role="group"
                        aria-labelledby="format-label"
                    >
                        <button
                            type="button"
                            onClick={() => handleFormatChange('jpeg')}
                            disabled={disabled}
                            className={`
                                flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all
                                ${settings.format === 'jpeg'
                                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
                                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            aria-pressed={settings.format === 'jpeg'}
                        >
                            <span>📷</span>
                            <span>JPEG</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFormatChange('webp')}
                            disabled={disabled}
                            className={`
                                flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all
                                ${settings.format === 'webp'
                                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
                                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            aria-pressed={settings.format === 'webp'}
                        >
                            <span>🌐</span>
                            <span>WebP</span>
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {settings.format === 'webp'
                            ? 'Smaller files, same quality'
                            : 'Works everywhere'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
