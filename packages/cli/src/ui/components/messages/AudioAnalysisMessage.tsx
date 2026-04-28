/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FC } from 'react';
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

export const AudioAnalysisMessage: FC<AudioAnalysisMessageProps> = ({
  filename,
  waveform,
  bpm,
  key,
  summary,
}) => {
  return (
    <Box flexDirection="column" paddingY={1}>
      <ThemedGradient>
        <Text bold underline>
          Audio Analysis: {filename}
        </Text>
      </ThemedGradient>
      <Box flexDirection="row" marginTop={1}>
        <Box flexDirection="column" width={20}>
          <Text color={theme.colors.textSecondary}>BPM:</Text>
          <Text color={theme.colors.textSecondary}>Key:</Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.colors.textPrimary}>{bpm || 'Unknown'}</Text>
          <Text color={theme.colors.textPrimary}>{key || 'Unknown'}</Text>
        </Box>
      </Box>
      {waveform && (
        <Box marginTop={1}>
          <Text color={theme.colors.accentPrimary}>
            Waveform: {waveform.length} points
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.colors.textPrimary}>{summary}</Text>
      </Box>
    </Box>
  );
};
