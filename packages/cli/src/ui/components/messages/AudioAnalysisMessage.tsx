/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../semantic-colors.js';
import { ThemedGradient } from '../ThemedGradient.js';

interface AudioAnalysisMessageProps {
  filename: string;
  waveform?: number[];
  bpm?: number;
  key?: string;
  summary: string;
}

export const AudioAnalysisMessage: React.FC<AudioAnalysisMessageProps> = ({
  filename,
  waveform = [],
  bpm,
  key,
  summary,
}) => {
  // Simple Braille-like waveform renderer
  const renderWaveform = () => {
    if (!waveform.length) return null;
    const bars = waveform.map((v) => {
      const height = Math.floor(v * 4);
      const chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      return chars[Math.min(height, chars.length - 1)];
    });
    return (
      <Box marginTop={1} marginBottom={1}>
        <Text color="cyan">{bars.join('')}</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" paddingX={2} borderStyle="round" borderColor="blue">
      <Box justifyContent="space-between">
        <Text bold color={theme.text.primary}>
          AUDIO AUDIT: {filename}
        </Text>
        <Box>
          {bpm && <Text color="yellow"> {bpm} BPM </Text>}
          {key && <Text color="magenta"> KEY: {key} </Text>}
        </Box>
      </Box>

      {renderWaveform()}

      <Box marginTop={1}>
        <ThemedGradient>
          <Text italic>{summary}</Text>
        </ThemedGradient>
      </Box>
    </Box>
  );
};
