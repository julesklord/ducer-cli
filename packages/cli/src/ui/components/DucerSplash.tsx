/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { ducerBrandingLogo, spectrumSplash } from './DucerAscii.js';
import { ThemedGradient } from './ThemedGradient.js';

interface DucerSplashProps {
  version: string;
}

export const DucerSplash: React.FC<DucerSplashProps> = ({ version }) => {
  const [loadingText, setLoadingText] = useState('Initializing Audio Engine...');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const messages = [
      'Initializing Audio Engine...',
      'Booting Gemini AI Core...',
      'Syncing DAW Workflows...',
      'Calibrating Audio Analysis...',
      'Ducer Ready.'
    ];
    let msgIndex = 0;
    
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingText(messages[msgIndex]);
    }, 400);

    const dotsInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 200);

    return () => {
      clearInterval(msgInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      width="100%" 
      paddingY={2}
    >
      <ThemedGradient>
        <Text bold>{ducerBrandingLogo}</Text>
      </ThemedGradient>
      
      <Box marginTop={1} marginBottom={1}>
        <Text color="cyan">{spectrumSplash}</Text>
      </Box>

      <Box flexDirection="column" alignItems="center">
        <Text dimColor>Producer Edition v{version}</Text>
        <Box marginTop={1}>
          <Text italic color="yellow">
            {loadingText}{dots}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
