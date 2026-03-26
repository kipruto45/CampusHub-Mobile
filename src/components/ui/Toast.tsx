// Toast Notification Component for CampusHub
// Success, error, info, and warning toasts

import React,{ createContext,useCallback,useContext,useEffect,useRef,useState } from 'react';
import { Animated,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

const toastConfig: Record<ToastType, {
  icon: string;
  color: string;
  bgColor: string;
}> = {
  success: {
    icon: 'checkmark-circle',
    color: colors.success,
    bgColor: colors.success + '15',
  },
  error: {
    icon: 'close-circle',
    color: colors.error,
    bgColor: colors.error + '15',
  },
  info: {
    icon: 'information-circle',
    color: colors.info,
    bgColor: colors.info + '15',
  },
  warning: {
    icon: 'warning',
    color: colors.warning,
    bgColor: colors.warning + '15',
  },
};

const Toast: React.FC<ToastProps> = ({
  type,
  message,
  visible,
  onHide,
  duration = 3000,
  actionLabel,
  onAction,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, [onHide, opacity, translateY]);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, hideToast, opacity, translateY, visible]);

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: config.bgColor,
          borderColor: config.color + '40',
          transform: [{ translateY }],
          opacity,
          shadowColor: config.color,
        },
      ]}
    >
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.row}>
        <View style={[styles.iconBadge, { backgroundColor: config.color + '12' }]}>
          <Icon name={config.icon as any} size={18} color={config.color} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.message, { color: colors.text.primary }]} numberOfLines={3}>
            {message}
          </Text>
          {actionLabel && onAction ? (
            <TouchableOpacity
              onPress={() => {
                onAction();
                hideToast();
              }}
              style={styles.actionButton}
            >
              <Text style={[styles.actionText, { color: config.color }]}>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Icon name="close" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Toast context for global toast management
interface ToastContextValue {
  showToast: (
    type: ToastType,
    message: string,
    options?: { actionLabel?: string; onAction?: () => void; duration?: number }
  ) => void;
  hideToast: () => void;
  toastState: {
    visible: boolean;
    type: ToastType;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState<{
    visible: boolean;
    type: ToastType;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
  }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const showToast = useCallback(
    (
      type: ToastType,
      message: string,
      options?: { actionLabel?: string; onAction?: () => void; duration?: number }
    ) => {
      setToastState({
        visible: true,
        type,
        message,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
        duration: options?.duration,
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toastState }}>
      {children}
      <Toast
        type={toastState.type}
        message={toastState.message}
        visible={toastState.visible}
        onHide={hideToast}
        actionLabel={toastState.actionLabel}
        onAction={toastState.onAction}
        duration={toastState.duration}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Helper functions for easy access
export const showSuccessToast = (message: string) => {
  // This would typically be called from within ToastProvider
  // For now, just a placeholder
  console.log('Success:', message);
};

export const showErrorToast = (message: string) => {
  console.log('Error:', message);
};

export const showInfoToast = (message: string) => {
  console.log('Info:', message);
};

export const showWarningToast = (message: string) => {
  console.log('Warning:', message);
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 12,
    right: 12,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 1000,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing[1],
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  actionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: '#ffffff25',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary[700],
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff10',
    opacity: 0.9,
  },
});

export default Toast;
