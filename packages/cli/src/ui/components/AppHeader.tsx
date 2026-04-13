/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { UserIdentity } from './UserIdentity.js';
import { Tips } from './Tips.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { Banner } from './Banner.js';
import { useBanner } from '../hooks/useBanner.js';
import { useTips } from '../hooks/useTips.js';
import { theme } from '../semantic-colors.js';
import { ThemedGradient } from './ThemedGradient.js';
import { CliSpinner } from './CliSpinner.js';
import { ducerBrandingLogo } from './DucerAscii.js';

import { isAppleTerminal } from '@google/gemini-cli-core';

interface AppHeaderProps {
  version: string;
  showDetails?: boolean;
}

const DEFAULT_ICON = `▝▜▄  
  ▝▜▄
 ▗▟▀ 
▝▀    `;

const MAC_TERMINAL_ICON = `▝▜▄  
  ▝▜▄
  ▗▟▀
▗▟▀  `;

export const AppHeader = ({ version, showDetails = true }: AppHeaderProps) => {
  const settings = useSettings();
  const config = useConfig();
  const {
    terminalWidth,
    bannerData,
    bannerVisible,
    updateInfo,
    ducerStatus,
  } = useUIState();

  const { bannerText } = useBanner(bannerData);
  const { showTips } = useTips();

  const showHeader = !(
    settings.merged.ui.hideBanner || config.getScreenReader()
  );

  const ICON = isAppleTerminal() ? MAC_TERMINAL_ICON : DEFAULT_ICON;

  // Ducer Brand Check
  const isDucer = ducerStatus?.isConnected; 

  const renderLogo = () => (
    <Box flexDirection="row">
      <Box flexShrink={0}>
        <ThemedGradient>
          <Text bold>{isDucer ? ducerBrandingLogo : ICON}</Text>
        </ThemedGradient>
      </Box>
    </Box>
  );

  const renderMetadata = (isBelow = false) => (
    <Box marginLeft={isBelow ? 0 : 2} flexDirection="column">
      <Box>
        <Text bold color={theme.text.primary}>
          {isDucer ? `DUCER [${ducerStatus.mode}]` : 'Gemini CLI'}
        </Text>
        <Text color={theme.text.secondary}> v{version}</Text>
        {isDucer && ducerStatus.project && (
          <Box marginLeft={2}>
            <Text color="cyan">| {ducerStatus.project} ({ducerStatus.bpm} BPM)</Text>
          </Box>
        )}
        {updateInfo?.isUpdating && (
          <Box marginLeft={2}>
            <Text color={theme.text.secondary}>
              <CliSpinner /> Updating
            </Text>
          </Box>
        )}
      </Box>

      {showDetails && (
        <>
          <Box height={1} />
          {settings.merged.ui.showUserIdentity !== false && (
            <UserIdentity config={config} />
          )}
        </>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Box
          flexDirection="column"
          marginTop={1}
          marginBottom={1}
          paddingLeft={1}
        >
          {renderLogo()}
          <Box marginTop={1}>{renderMetadata(true)}</Box>
        </Box>
      )}

      {bannerVisible && bannerText && (
        <Banner
          width={terminalWidth}
          bannerText={bannerText}
          isWarning={bannerData.warningText !== ''}
        />
      )}

      {!(settings.merged.ui.hideTips || config.getScreenReader()) &&
        showTips && <Tips config={config} />}
    </Box>
  );
};
