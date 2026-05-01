/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, type FC } from 'react';
import { Box, Text } from 'ink';
import { ducerBrandingLogo, spectrumSplash } from './DucerAscii.js';
import { ThemedGradient } from './ThemedGradient.js';

interface DucerSplashProps {
  version: string;
}

export const DucerSplash: FC<DucerSplashProps> = ({ version }) => {
  const [loadingText, setLoadingText] = useState('Initializing Audio Engine...');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <ThemedGradient>
          <Text>{ducerBrandingLogo}</Text>
        </ThemedGradient>
      </Box>
      <Box marginBottom={1}>
        <Text italic color="cyan">
          {spectrumSplash}
        </Text>
      </Box>
      <Box borderStyle="round" borderColor="magenta" paddingX={2} paddingY={1}>
        <Text bold>
          DUCER <Text color="yellow">v{version}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          {loadingText}
          {dots}
        </Text>
      </Box>
    </Box>
  );
};
