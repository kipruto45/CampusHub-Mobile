import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '../../theme/colors';
import Icon from '../ui/Icon';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  isBookmarked,
  onPress,
  disabled = false,
}) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={disabled} hitSlop={10}>
      <Icon
        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
        size={20}
        color={isBookmarked ? colors.warning : colors.text.tertiary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BookmarkButton;
