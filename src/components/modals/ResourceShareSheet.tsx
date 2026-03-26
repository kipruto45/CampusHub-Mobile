import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCopyLink: () => Promise<boolean> | boolean;
  onNativeShare: () => Promise<boolean> | boolean;
  onSaveToLibrary?: () => void;
  onFavorite?: () => void;
  loading?: boolean;
  canShare?: boolean;
  error?: string | null;
};

type ActionConfig = {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
};

const ResourceShareSheet: React.FC<Props> = ({
  visible,
  onClose,
  onCopyLink,
  onNativeShare,
  onSaveToLibrary,
  onFavorite,
  loading = false,
  canShare = true,
  error,
}) => {
  const actions: ActionConfig[] = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: 'clipboard',
      onPress: () => {
        void onCopyLink();
      },
      disabled: !canShare,
    },
    {
      id: 'share',
      label: 'Share Resource',
      icon: 'share-social',
      onPress: () => {
        void onNativeShare();
      },
      disabled: !canShare,
    },
    {
      id: 'library',
      label: 'Save to Library',
      icon: 'folder',
      onPress: () => {
        onSaveToLibrary?.();
      },
    },
    {
      id: 'favorite',
      label: 'Favorite Resource',
      icon: 'heart-outline',
      onPress: () => {
        onFavorite?.();
      },
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Share Resource"
      height={360}
      showCloseButton
    >
      <View style={styles.content}>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.success} />
            <Text style={styles.loadingText}>Preparing share data...</Text>
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionRow, action.disabled && styles.actionRowDisabled]}
            onPress={action.onPress}
            disabled={loading || !!action.disabled}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Icon
                name={action.icon as any}
                size={18}
                color={action.disabled ? colors.text.tertiary : colors.success}
              />
            </View>
            <Text
              style={[
                styles.actionLabel,
                action.disabled && styles.actionLabelDisabled,
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  loadingRow: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing[1],
  },
  actionRow: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.card.light,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
  },
  actionLabelDisabled: {
    color: colors.text.tertiary,
  },
});

export default ResourceShareSheet;
