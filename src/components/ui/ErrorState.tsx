// Error State Component for CampusHub
// Handles retry, no internet, server error, unauthorized, not found states

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius,spacing } from '../../theme/spacing';
import Icon from './Icon';

export type ErrorType = 
  | 'network'      // No internet connection
  | 'server'       // Server error (5xx)
  | 'unauthorized'  // Authentication required (401)
  | 'not_found'    // Resource not found (404)
  | 'upload'       // Upload failed
  | 'generic';     // Unknown error

interface ErrorStateProps {
  type: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

const errorConfig: Record<ErrorType, {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
}> = {
  network: {
    icon: 'cloud-offline',
    title: 'No Internet Connection',
    message: 'Please check your internet connection and try again.',
    actionLabel: 'Retry',
  },
  server: {
    icon: 'server',
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    actionLabel: 'Retry',
  },
  unauthorized: {
    icon: 'lock-closed',
    title: 'Session Expired',
    message: 'Please log in again to continue.',
    actionLabel: 'Log In',
  },
  not_found: {
    icon: 'search',
    title: 'Not Found',
    message: 'The resource you\'re looking for doesn\'t exist or has been removed.',
  },
  upload: {
    icon: 'cloud-upload',
    title: 'Upload Failed',
    message: 'Your file could not be uploaded. Please check your connection and try again.',
    actionLabel: 'Try Again',
  },
  generic: {
    icon: 'alert-circle',
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Try Again',
  },
};

const ErrorState: React.FC<ErrorStateProps> = ({
  type,
  title,
  message,
  onRetry,
  onBack,
}) => {
  const router = useRouter();
  const config = errorConfig[type];
  
  const handleAction = () => {
    if (type === 'unauthorized') {
      router.replace('/(auth)/login');
    } else if (onRetry) {
      onRetry();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={config.icon as any} size={48} color={colors.error} />
      </View>
      
      <Text style={styles.title}>{title || config.title}</Text>
      <Text style={styles.message}>{message || config.message}</Text>
      
      <View style={styles.actions}>
        {config.actionLabel && (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleAction}
          >
            <Text style={styles.primaryButtonText}>{config.actionLabel}</Text>
          </TouchableOpacity>
        )}
        
        {onBack && (
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={onBack}
          >
            <Icon name="arrow-back" size={18} color={colors.primary[500]} />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Help text for network errors */}
      {type === 'network' && (
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Tips:{'\n'}
            • Check if Wi-Fi or mobile data is enabled{'\n'}
            • Try restarting your router{'\n'}
            • Move to an area with better signal
          </Text>
        </View>
      )}
    </View>
  );
};

// Full screen error wrapper
interface ErrorBoundaryProps {
  children: React.ReactNode;
  error?: ErrorType | null;
  onRetry?: () => void;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  error,
  onRetry,
}) => {
  if (error) {
    return <ErrorState type={error} onRetry={onRetry} />;
  }
  
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[16],
    backgroundColor: colors.background.secondary,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
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
    alignItems: 'center',
    gap: spacing[3],
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    minWidth: 150,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[500],
  },
  helpContainer: {
    marginTop: spacing[8],
    padding: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  helpText: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default ErrorState;
