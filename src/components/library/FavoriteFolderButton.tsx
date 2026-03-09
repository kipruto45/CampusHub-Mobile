import React from 'react';

import FavoriteButton from '../resources/FavoriteButton';

interface FavoriteFolderButtonProps {
  isFavorited: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const FavoriteFolderButton: React.FC<FavoriteFolderButtonProps> = ({
  isFavorited,
  onPress,
  disabled = false,
}) => {
  return <FavoriteButton isFavorited={isFavorited} onPress={onPress} disabled={disabled} />;
};

export default FavoriteFolderButton;
