// Bookmark Button Component

import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { colors } from '../../theme/colors';
import { useBookmarks } from '../../hooks/useBookmarks';

interface BookmarkButtonProps {
  resourceId: string;
  size?: number;
  color?: string;
  activeColor?: string;
  onToggle?: (isBookmarked: boolean) => void;
  showTooltip?: boolean;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  resourceId,
  size = 24,
  color = colors.text.secondary,
  activeColor = colors.accent[500],
  onToggle,
}) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [isToggling, setIsToggling] = useState(false);
  
  const isActive = isBookmarked(resourceId);
  
  const handlePress = useCallback(async () => {
    setIsToggling(true);
    try {
      const success = await toggleBookmark(resourceId);
      if (success && onToggle) {
        onToggle(!isActive);
      }
    } finally {
      setIsToggling(false);
    }
  }, [resourceId, isActive, toggleBookmark, onToggle]);
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isToggling}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      {isToggling ? (
        <ActivityIndicator size="small" color={activeColor} />
      ) : (
        <Icon
          name={isActive ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={isActive ? activeColor : color}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
});

export default BookmarkButton;
