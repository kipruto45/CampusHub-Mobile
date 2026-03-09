// Toast Notification Component for CampusHub
// Success, error, info, and warning toasts

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import Icon from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
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
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
  }, [visible]);

  const hideToast = () => {
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
  };

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: config.bgColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon name={config.icon as any} size={22} color={config.color} />
        <Text style={[styles.message, { color: colors.text.primary }]}>
          {message}
        </Text>
      </View>
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Icon name="close" size={18} color={colors.text.secondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast context for global toast management
interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
  hideToast: () => void;
  toastState: {
    visible: boolean;
    type: ToastType;
    message: string;
  };
}

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState<{
    visible: boolean;
    type: ToastType;
    message: string;
  }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const showToast = useCallback((type: ToastType, message: string) => {
    setToastState({ visible: true, type, message });
  }, []);

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
    top: 60,
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
});

export default Toast;
