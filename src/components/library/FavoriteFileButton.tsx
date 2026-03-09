import React from 'react';

import FavoriteButton from '../resources/FavoriteButton';

interface FavoriteFileButtonProps {
  isFavorited: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const FavoriteFileButton: React.FC<FavoriteFileButtonProps> = ({
  isFavorited,
  onPress,
  disabled = false,
}) => {
  return <FavoriteButton isFavorited={isFavorited} onPress={onPress} disabled={disabled} />;
};

export default FavoriteFileButton;
