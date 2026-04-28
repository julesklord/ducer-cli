/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type FC } from 'react';
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
    const textInterval = setInterval(() => {
      setLoadingText((prev) => {
        if (prev.includes('Audio')) return 'Loading Music Plugins...';
        if (prev.includes('Plugins')) return 'Connecting to DAW...';
        return 'Initializing Audio Engine...';
      });
    }, 2000);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(textInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <ThemedGradient>
        <Text>{ducerBrandingLogo}</Text>
      </ThemedGradient>
      <Box marginTop={1}>
        <Text color="cyan" bold>
          DUCER CLI
        </Text>
        <Text color="gray"> v{version}</Text>
      </Box>
      <Box marginTop={2}>
        <Text color="magenta">{spectrumSplash}</Text>
      </Box>
      <Box marginTop={2}>
        <Text color="yellow">
          {loadingText}
          {dots}
        </Text>
      </Box>
    </Box>
  );
};
