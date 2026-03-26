// Confirmation Modal Component for CampusHub
// For destructive actions and important confirmations

import React from 'react';
import { Modal,StyleSheet,Text,TouchableOpacity,TouchableWithoutFeedback,View } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from './Icon';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  icon,
}) => {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return { primary: colors.error, bg: colors.error + '15' };
      case 'warning':
        return { primary: colors.warning, bg: colors.warning + '15' };
      case 'info':
        return { primary: colors.info, bg: colors.info + '15' };
      default:
        return { primary: colors.error, bg: colors.error + '15' };
    }
  };

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return 'trash';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'alert-circle';
    }
  };

  const themeColors = getColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: themeColors.bg }]}>
                <Icon name={getIcon() as any} size={32} color={themeColors.primary} />
              </View>

              {/* Content */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onCancel}
                >
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.confirmButton, { backgroundColor: themeColors.primary }]} 
                  onPress={onConfirm}
                >
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Destructive action confirmation
interface DestructiveModalProps {
  visible: boolean;
  title?: string;
  itemName?: string;
  action: 'delete' | 'logout' | 'remove' | 'clear';
  onConfirm: () => void;
  onCancel: () => void;
}

export const DestructiveModal: React.FC<DestructiveModalProps> = ({
  visible,
  title,
  itemName,
  action,
  onConfirm,
  onCancel,
}) => {
  const getConfig = () => {
    switch (action) {
      case 'delete':
        return {
          title: title || 'Delete Item',
          message: itemName 
            ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.',
          confirmLabel: 'Delete',
          icon: 'trash',
        };
      case 'logout':
        return {
          title: 'Log Out',
          message: 'Are you sure you want to log out?',
          confirmLabel: 'Log Out',
          icon: 'log-out',
        };
      case 'remove':
        return {
          title: title || 'Remove Item',
          message: itemName
            ? `Are you sure you want to remove "${itemName}" from your list?`
            : 'Are you sure you want to remove this item?',
          confirmLabel: 'Remove',
          icon: 'close-circle',
        };
      case 'clear':
        return {
          title: title || 'Clear All',
          message: 'Are you sure you want to clear all items? This action cannot be undone.',
          confirmLabel: 'Clear All',
          icon: 'trash',
        };
      default:
        return {
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed?',
          confirmLabel: 'Confirm',
          icon: 'alert-circle',
        };
    }
  };

  const config = getConfig();

  return (
    <ConfirmationModal
      visible={visible}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      type="danger"
      icon={config.icon}
    />
  );
};

// Success confirmation
interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onDone: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  onDone,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDone}
    >
      <TouchableWithoutFeedback onPress={onDone}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Success Icon */}
              <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                <Icon name="checkmark-circle" size={32} color={colors.success} />
              </View>

              {/* Content */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Done Button */}
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.success }]} 
                onPress={onDone}
              >
                <Text style={styles.confirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Form validation error modal
interface ErrorModalProps {
  visible: boolean;
  title?: string;
  errors: string[];
  onDismiss: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title = 'Please Fix These Errors',
  errors,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Error Icon */}
              <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                <Icon name="alert-circle" size={32} color={colors.error} />
              </View>

              {/* Content */}
              <Text style={styles.title}>{title}</Text>
              
              <View style={styles.errorsList}>
                {errors.map((error, index) => (
                  <View key={index} style={styles.errorItem}>
                    <Icon name="close-circle" size={14} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ))}
              </View>

              {/* Dismiss Button */}
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.error }]} 
                onPress={onDismiss}
              >
                <Text style={styles.confirmText}>Got It</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  container: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  errorsList: {
    width: '100%',
    marginBottom: spacing[6],
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
  },
});

export default ConfirmationModal;
