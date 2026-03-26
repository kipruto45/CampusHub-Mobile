import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList,RefreshControl,StyleSheet,Text,TouchableOpacity,View } from 'react-native';

import FavoriteItemCard from '../../components/favorites/FavoriteItemCard';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Icon from '../../components/ui/Icon';
import Loading from '../../components/ui/Loading';
import { useFavorites } from '../../hooks/useFavorites';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';

const tabs = [
  { label: 'Resources', value: 'resources' as const },
  { label: 'Files', value: 'files' as const },
  { label: 'Folders', value: 'folders' as const },
];

const FavoritesScreen: React.FC = () => {
  const router = useRouter();
  const {
    activeType,
    setActiveType,
    items,
    loading,
    refreshing,
    error,
    refresh,
    removeFavorite,
  } = useFavorites('resources');

  if (loading) {
    return (
      <View style={styles.container}>
        <Loading message="Loading favorites..." />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        type="server"
        title="Unable to load favorites"
        message={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Priority items for quick access</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = activeType === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, active ? styles.tabActive : null]}
              onPress={() => setActiveType(tab.value)}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FavoriteItemCard
            item={item}
            onPress={() => {
              if (item?.favorite_type === 'resource' && item?.resource?.id) {
                router.push(`/(student)/resource/${item.resource.id}`);
                return;
              }
              if (item?.favorite_type === 'folder' && item?.personal_folder?.id) {
                router.push(`/(student)/folder/${item.personal_folder.id}`);
              }
            }}
            onRemove={() => removeFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="No favorites yet"
            description="Favorite resources, files, and folders to prioritize what matters most."
            actionLabel="Browse Resources"
            onAction={() => router.push('/(student)/tabs/resources')}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary[500]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card.light,
  },
  backText: {
    fontSize: 26,
    color: colors.text.secondary,
    marginTop: -2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  tabActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  tabText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.text.inverse,
  },
  list: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[20],
    flexGrow: 1,
  },
});

export default FavoritesScreen;
