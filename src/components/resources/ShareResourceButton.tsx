import React from 'react';
import { ActivityIndicator,StyleSheet,Text,TouchableOpacity,ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from '../ui/Icon';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  style?: ViewStyle;
};

const ShareResourceButton: React.FC<Props> = ({
  onPress,
  disabled = false,
  loading = false,
  label = 'Share',
  style,
}) => {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, inactive && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text.inverse} />
      ) : (
        <Icon name="share-social" size={18} color={colors.text.inverse} />
      )}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 40,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ShareResourceButton;

