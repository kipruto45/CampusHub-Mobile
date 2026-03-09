// Avatar Component for CampusHub

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
}

const sizes = {
  sm: 32,
  md: 44,
  lg: 60,
  xl: 80,
};

const fontSizes = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
};

export const Avatar: React.FC<AvatarProps> = ({ 
  source, 
  name, 
  size = 'md', 
  showBorder = false 
}) => {
  const dimension = sizes[size];
  const fontSize = fontSizes[size];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View 
      style={[
        styles.container, 
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        showBorder && styles.bordered
      ]}
    >
      {source ? (
        <Image 
          source={{ uri: source }} 
          style={[
            styles.image, 
            { width: dimension, height: dimension, borderRadius: dimension / 2 }
          ]} 
        />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>
          {name ? getInitials(name) : '?'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: 2,
    borderColor: colors.card.light,
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

export default Avatar;
