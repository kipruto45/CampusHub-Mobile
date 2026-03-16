// Avatar Component for CampusHub

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  sizePx?: number;
  showBorder?: boolean;
  cacheKey?: string;
  /** When true, ignore source and render initials only. */
  forceInitials?: boolean;
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

const MAX_AVATAR_CACHE = 60;
const avatarCache = new Map<string, string>();

const getCachedAvatar = (key?: string): string | null => {
  if (!key) return null;
  return avatarCache.get(key) || null;
};

const setCachedAvatar = (key: string, uri: string) => {
  if (!key || !uri) return;
  if (avatarCache.has(key)) {
    avatarCache.delete(key);
  }
  avatarCache.set(key, uri);
  if (avatarCache.size > MAX_AVATAR_CACHE) {
    const oldestKey = avatarCache.keys().next().value;
    if (oldestKey) {
      avatarCache.delete(oldestKey);
    }
  }
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  sizePx,
  showBorder = false,
  cacheKey,
  forceInitials = false,
}) => {
  const cacheKeyValue = useMemo(() => (cacheKey ? String(cacheKey) : ''), [cacheKey]);
  const dimension = sizePx ?? sizes[size];
  const fontSize = sizePx ? Math.max(12, Math.round(sizePx / 2.8)) : fontSizes[size];

  const initialUri = useMemo(() => {
    if (forceInitials) return null;
    const cached = getCachedAvatar(cacheKeyValue);
    const normalizedSource = source?.trim();
    return cached || normalizedSource || null;
  }, [cacheKeyValue, source, forceInitials]);

  const [displayUri, setDisplayUri] = useState<string | null>(initialUri);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const normalizedSource = forceInitials ? null : source?.trim();
    const cached = getCachedAvatar(cacheKeyValue);

    if (!normalizedSource) {
      if (cached && cached !== displayUri) {
        setDisplayUri(cached);
      }
      return;
    }

    if (normalizedSource === displayUri) {
      return;
    }

    let cancelled = false;
    Image.prefetch(normalizedSource)
      .then((success) => {
        if (cancelled) return;
        if (success) {
          setDisplayUri(normalizedSource);
          if (cacheKeyValue) {
            setCachedAvatar(cacheKeyValue, normalizedSource);
          }
        }
      })
      .catch(() => {
        // Keep current display uri on prefetch failure.
      });

    return () => {
      cancelled = true;
    };
  }, [source, cacheKeyValue, displayUri]);

  const resolvedSource = forceInitials ? null : displayUri || source?.trim() || null;

  return (
    <View
      style={[
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        showBorder && styles.bordered,
      ]}
    >
      {resolvedSource ? (
        <Image
          source={{ uri: resolvedSource }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
          fadeDuration={0}
          onLoad={() => {
            if (cacheKeyValue && resolvedSource) {
              setCachedAvatar(cacheKeyValue, resolvedSource);
            }
          }}
          onError={() => {
            if (cacheKeyValue) {
              const cached = getCachedAvatar(cacheKeyValue);
              if (cached && cached !== resolvedSource) {
                setDisplayUri(cached);
                return;
              }
            }
            setDisplayUri(null);
          }}
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
