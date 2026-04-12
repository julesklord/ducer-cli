/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface VisualizationResult {
    imagePath: string;
    panels: string[];
}
export interface TranscriptionResult {
    text: string;
    format: string;
}
/**
 * AudioAnalyzer provides wrappers for external sensory tools (songsee, whisper).
 */
export declare class AudioAnalyzer {
    private readonly reportsDir;
    constructor();
    /**
     * Generates a visualization using songsee.
     */
    visualize(audioPath: string, options?: {
        viz?: string;
        start?: number;
        duration?: number;
        style?: string;
    }): Promise<VisualizationResult>;
    /**
     * Transcribes audio using Whisper.
     */
    transcribe(audioPath: string, options?: {
        model?: string;
    }): Promise<TranscriptionResult>;
}
