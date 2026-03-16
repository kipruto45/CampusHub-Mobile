import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '../../theme/colors';
import Icon from '../ui/Icon';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorited,
  onPress,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, isFavorited && styles.buttonActive]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
    >
      <Icon
        name={isFavorited ? 'heart' : 'heart-outline'}
        size={20}
        color={isFavorited ? colors.error : colors.text.tertiary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: `${colors.error}18`,
  },
});

export default FavoriteButton;
