// Favorite Button Component

import React,{ useCallback,useState } from 'react';
import { ActivityIndicator,StyleSheet,TouchableOpacity } from 'react-native';
import { FavoriteTargetType,useFavorites } from '../../hooks/useFavorites';
import { colors } from '../../theme/colors';
import Icon from './Icon';

interface FavoriteButtonProps {
  targetType: FavoriteTargetType;
  targetId: string;
  size?: number;
  color?: string;
  activeColor?: string;
  onToggle?: (isFavorited: boolean) => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  targetType,
  targetId,
  size = 24,
  color = colors.text.secondary,
  activeColor = colors.error,
  onToggle,
}) => {
  const { isFavorited, toggleFavorite } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  
  const isActive = isFavorited(targetType, targetId);
  
  const handlePress = useCallback(async () => {
    setIsToggling(true);
    try {
      const success = await toggleFavorite(targetType, targetId);
      if (success && onToggle) {
        onToggle(!isActive);
      }
    } finally {
      setIsToggling(false);
    }
  }, [targetType, targetId, isActive, toggleFavorite, onToggle]);
  
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
          name={isActive ? 'heart' : 'heart-outline'}
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

export default FavoriteButton;
