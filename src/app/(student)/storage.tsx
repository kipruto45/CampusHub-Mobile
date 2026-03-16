// Storage Screen for CampusHub
// Personal storage usage and management - Backend connected

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI, trashAPI } from '../../services/api';

// Storage Categories
interface StorageCategory {
  name: string;
  size: string;
  sizeBytes: number;
  percentage: number;
  icon: string;
  color: string;
  fileCount: number;
}

interface StorageData {
  total_storage: number;
  storage_used: number;
  storage_limit: number;
}

const StorageScreen: React.FC = () => {
  const router = useRouter();
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [trashItems, setTrashItems] = useState<any[]>([]);

  const fetchStorageData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch storage data from dashboard
      const dashboardRes = await userAPI.getStorage();
      const data = dashboardRes.data?.data || dashboardRes.data || {};
      
      setStorageData({
        total_storage: data.storage_limit || 5 * 1024 * 1024 * 1024,
        storage_used: data.storage_used || 0,
        storage_limit: data.storage_limit || 5 * 1024 * 1024 * 1024,
      });
      
      // Fetch trash items count
      const trashRes = await trashAPI.list({ page: 1 });
      const trashData = trashRes.data?.data?.results || trashRes.data?.data || trashRes.data || [];
      setTrashItems(trashData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load storage data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStorageData();
  }, [fetchStorageData]);

  // Storage data from API
  const totalStorage = storageData?.storage_limit || 5 * 1024 * 1024 * 1024;
  const usedStorage = storageData?.storage_used || 0;
  const availableStorage = totalStorage - usedStorage;
  const percentage = totalStorage > 0 ? (usedStorage / totalStorage) * 100 : 0;

  // Warning level calculation
  const getWarningLevel = () => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  const warningLevel = getWarningLevel();

  const getWarningColor = () => {
    switch (warningLevel) {
      case 'critical': return colors.error;
      case 'warning': return colors.warning;
      default: return colors.primary[500];
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Categories - would need backend API for detailed breakdown
  // For now, show single category based on used storage
  const categories: StorageCategory[] = usedStorage > 0 ? [
    { name: 'Used Storage', size: formatSize(usedStorage), sizeBytes: usedStorage, percentage: percentage, icon: 'folder', color: colors.primary[500], fileCount: 0 },
  ] : [];

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove temporary files and free up storage space.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => {
            setShowClearCacheModal(false);
            Alert.alert('Success', 'Cache cleared successfully!');
          }
        }
      ]
    );
  };

  const renderProgressCircle = () => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    return (
      <View style={styles.circleContainer}>
        <View style={styles.progressOuter}>
          <View style={[styles.progressBg, { borderColor: colors.gray[200] }]} />
          <View style={[
            styles.progressFill, 
            { 
              borderColor: getWarningColor(),
              transform: [{ rotate: `${percentage * 3.6}deg` }]
            }
          ]} />
          <View style={styles.progressCenter}>
            <Text style={[styles.usedText, { color: getWarningColor() }]}>
              {formatSize(usedStorage)}
            </Text>
            <Text style={styles.usedLabel}>
              of {formatSize(totalStorage)} used
            </Text>
            {warningLevel !== 'normal' && (
              <View style={[styles.warningBadge, { backgroundColor: getWarningColor() + '20' }]}>
                <Icon name="warning" size={12} color={getWarningColor()} />
                <Text style={[styles.warningText, { color: getWarningColor() }]}>
                  {warningLevel === 'critical' ? 'Critical' : 'Low Space'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Storage</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading storage data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Storage</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to load storage</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStorageData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Storage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Storage Overview Card */}
        <View style={styles.overviewCard}>
          {renderProgressCircle()}

          <View style={styles.storageInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Icon name="cloud" size={16} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Total Storage</Text>
              </View>
              <Text style={styles.infoValue}>{formatSize(totalStorage)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Icon name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.infoLabel}>Used</Text>
              </View>
              <Text style={[styles.infoValue, { color: getWarningColor() }]}>
                {formatSize(usedStorage)} ({percentage.toFixed(0)}%)
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Icon name="ellipse" size={16} color={colors.text.tertiary} />
                <Text style={styles.infoLabel}>Available</Text>
              </View>
              <Text style={styles.infoValue}>{formatSize(availableStorage)}</Text>
            </View>
          </View>
        </View>

        {/* Storage Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Breakdown</Text>
          <View style={styles.breakdownCard}>
            {categories.map((category, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.categoryItem}
                activeOpacity={0.7}
              >
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                    <Icon name={category.icon as any} size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.bar, { width: `${category.percentage}%`, backgroundColor: category.color }]} />
                    </View>
                  </View>
                  <View style={styles.categorySizeContainer}>
                    <Text style={styles.categorySize}>{category.size}</Text>
                    <Text style={styles.categoryFiles}>{category.fileCount} files</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => setShowClearCacheModal(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                <Icon name="trash" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Clear Cache</Text>
                <Text style={styles.actionSubtitle}>Free up 120 MB</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: colors.accent[50] }]}>
                <Icon name="download" size={22} color={colors.accent[500]} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Manage Downloads</Text>
                <Text style={styles.actionSubtitle}>12 files saved offline</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => router.push('/(student)/trash')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
                <Icon name="trash" size={22} color={colors.warning} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Trash</Text>
                <Text style={styles.actionSubtitle}>3 items • 5.4 MB</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: colors.info + '20' }]}>
                <Icon name="time" size={22} color={colors.info} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Auto-Delete</Text>
                <Text style={styles.actionSubtitle}>Trash clears every 30 days</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Storage Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Tips</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, { backgroundColor: colors.success + '20' }]}>
                <Icon name="cloud-done" size={18} color={colors.success} />
              </View>
              <Text style={styles.tipText}>Upload important files to keep them safe</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, { backgroundColor: colors.info + '20' }]}>
                <Icon name="checkmark-circle" size={18} color={colors.info} />
              </View>
              <Text style={styles.tipText}>Delete files you no longer need</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, { backgroundColor: colors.primary[50] }]}>
                <Icon name="archive" size={18} color={colors.primary[500]} />
              </View>
              <Text style={styles.tipText}>Archive old files to free up space</Text>
            </View>
          </View>
        </View>

        {/* Upgrade Banner */}
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => router.push('/(student)/billing' as any)}
        >
          <View style={styles.upgradeContent}>
            <View style={styles.upgradeIconContainer}>
              <Icon name="diamond" size={24} color={colors.text.inverse} />
            </View>
            <View style={styles.upgradeInfo}>
              <Text style={styles.upgradeTitle}>Need More Storage?</Text>
              <Text style={styles.upgradeText}>Get 50 GB for just $2.99/month</Text>
            </View>
          </View>
          <View style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Clear Cache Modal */}
      <Modal
        visible={showClearCacheModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearCacheModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Icon name="warning" size={32} color={colors.warning} />
            </View>
            <Text style={styles.modalTitle}>Clear Cache?</Text>
            <Text style={styles.modalText}>
              This will remove temporary files and free up 120 MB of storage. Your important files will not be affected.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowClearCacheModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={handleClearCache}
              >
                <Text style={styles.modalConfirmText}>Clear Cache</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.primary 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing[4], 
    paddingTop: spacing[10], 
    paddingBottom: spacing[4], 
    backgroundColor: colors.card.light, 
    ...shadows.sm 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  headerTitle: { 
    flex: 1, 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary, 
    textAlign: 'center' 
  },
  placeholder: { 
    width: 40 
  },
  overviewCard: { 
    backgroundColor: colors.card.light, 
    margin: spacing[4], 
    borderRadius: 24, 
    padding: spacing[6], 
    ...shadows.md 
  },
  circleContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  progressOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressBg: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
  },
  progressFill: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressCenter: { 
    alignItems: 'center' 
  },
  usedText: { 
    fontSize: 28, 
    fontWeight: '700', 
  },
  usedLabel: { 
    fontSize: 13, 
    color: colors.text.secondary, 
    marginTop: 2 
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: spacing[2],
    gap: 4,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
  },
  storageInfo: { 
    borderTopWidth: 1, 
    borderTopColor: colors.border.light, 
    paddingTop: spacing[4] 
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: spacing[3] 
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoLabel: { 
    fontSize: 14, 
    color: colors.text.secondary 
  },
  infoValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text.primary 
  },
  section: { 
    paddingHorizontal: spacing[4], 
    marginTop: spacing[4] 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[3] 
  },
  breakdownCard: { 
    backgroundColor: colors.card.light, 
    borderRadius: 20, 
    padding: spacing[2], 
    ...shadows.sm 
  },
  categoryItem: { 
    paddingVertical: spacing[2], 
    paddingHorizontal: spacing[2] 
  },
  categoryHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  categoryIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  categoryInfo: { 
    flex: 1, 
    marginLeft: spacing[3] 
  },
  categoryName: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: colors.text.primary, 
    marginBottom: 6 
  },
  barContainer: { 
    height: 6, 
    backgroundColor: colors.gray[200], 
    borderRadius: 3, 
    overflow: 'hidden' 
  },
  bar: { 
    height: '100%', 
    borderRadius: 3 
  },
  categorySizeContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing[2],
  },
  categorySize: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.text.primary 
  },
  categoryFiles: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actionsCard: { 
    backgroundColor: colors.card.light, 
    borderRadius: 20, 
    overflow: 'hidden', 
    ...shadows.sm 
  },
  actionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing[4], 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  actionIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  actionInfo: { 
    flex: 1, 
    marginLeft: spacing[3] 
  },
  actionTitle: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: colors.text.primary 
  },
  actionSubtitle: { 
    fontSize: 12, 
    color: colors.text.secondary, 
    marginTop: 2 
  },
  tipsCard: {
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: spacing[4],
    ...shadows.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
  },
  upgradeBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.primary[500], 
    margin: spacing[4], 
    borderRadius: 20, 
    padding: spacing[4] 
  },
  upgradeContent: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  upgradeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.text.inverse + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeInfo: { 
    marginLeft: spacing[3] 
  },
  upgradeTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text.inverse 
  },
  upgradeText: { 
    fontSize: 12, 
    color: colors.text.inverse, 
    opacity: 0.9 
  },
  upgradeBtn: { 
    backgroundColor: colors.text.inverse, 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[2], 
    borderRadius: 12, 
  },
  upgradeBtnText: {
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.primary[500],
  },
  bottomSpacing: {
    height: spacing[10],
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: colors.card.light,
    borderRadius: 24,
    padding: spacing[6],
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  modalText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  errorText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});

export default StorageScreen;
