// Screen Container Component for CampusHub
// Provides consistent padding, headers, and layout for all screens

import React from 'react';
import { StatusBar,StyleSheet,View,ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
  safeArea?: boolean;
  statusBar?: 'light' | 'dark';
}

const paddingSizes = {
  none: 0,
  small: 12,
  medium: 16,
  large: 24,
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  padding = 'medium',
  safeArea = true,
  statusBar = 'dark',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        safeArea && { paddingTop: insets.top },
        { paddingHorizontal: paddingSizes[padding] },
        style,
      ]}
    >
      <StatusBar barStyle={statusBar === 'light' ? 'light-content' : 'dark-content'} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

export default ScreenContainer;
