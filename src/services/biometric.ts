// Biometric Authentication Service for CampusHub
// Handles Face ID, Touch ID, and Fingerprint authentication

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_KEY = 'biometric_auth_key';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

class BiometricService {
  // Check if device supports biometric authentication
  async checkBiometricCapability(): Promise<BiometricCapability> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
    };
  }

  // Check if biometric authentication is enabled by user
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  // Enable biometric authentication
  async enableBiometric(): Promise<boolean> {
    try {
      // First, authenticate to verify user's identity
      const result = await this.authenticate('Enable biometric login');
      
      if (result.success) {
        // Store flag to indicate biometric is enabled
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }

  // Disable biometric authentication
  async disableBiometric(): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
    } catch (error) {
      console.error('Failed to disable biometric:', error);
    }
  }

  // Authenticate using biometrics
  async authenticate(reason?: string): Promise<BiometricResult> {
    try {
      const capability = await this.checkBiometricCapability();

      if (!capability.hasHardware) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      if (!capability.isEnrolled) {
        return {
          success: false,
          error: 'No biometric credentials are enrolled on this device',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      // Handle different error types
      const errorMessage = result.error || 'Authentication failed';
      if (errorMessage.includes('user_cancel')) {
        return { success: false, error: 'Authentication was cancelled' };
      } else if (errorMessage.includes('user_fallback')) {
        return { success: false, error: 'User chose to use passcode' };
      } else if (errorMessage.includes('system_cancel')) {
        return { success: false, error: 'System cancelled authentication' };
      } else if (errorMessage.includes('lockout')) {
        return { success: false, error: 'Too many attempts. Try again later' };
      }
      
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'An error occurred during authentication',
      };
    }
  }

  // Get biometric type string for display
  getBiometricTypeName(): string {
    return 'Biometric';
  }

  // Check if device supports Face ID
  async hasFaceId(): Promise<boolean> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  }

  // Check if device supports Touch ID / Fingerprint
  async hasFingerprint(): Promise<boolean> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  }

  // Store authentication key securely
  async storeAuthKey(key: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, key);
    } catch (error) {
      console.error('Failed to store auth key:', error);
    }
  }

  // Retrieve authentication key
  async getAuthKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_KEY);
    } catch {
      return null;
    }
  }

  // Delete stored authentication key
  async deleteAuthKey(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    } catch (error) {
      console.error('Failed to delete auth key:', error);
    }
  }

  // Check if should use biometric (user enabled it and device supports it)
  async shouldUseBiometric(): Promise<boolean> {
    const isEnabled = await this.isBiometricEnabled();
    const capability = await this.checkBiometricCapability();
    
    return isEnabled && capability.hasHardware && capability.isEnrolled;
  }
}

// Export singleton instance
export const biometricService = new BiometricService();

// React hook for biometric authentication
export const useBiometric = () => {
  return {
    checkCapability: () => biometricService.checkBiometricCapability(),
    isEnabled: () => biometricService.isBiometricEnabled(),
    enable: () => biometricService.enableBiometric(),
    disable: () => biometricService.disableBiometric(),
    authenticate: (reason?: string) => biometricService.authenticate(reason),
    hasFaceId: () => biometricService.hasFaceId(),
    hasFingerprint: () => biometricService.hasFingerprint(),
    shouldUseBiometric: () => biometricService.shouldUseBiometric(),
  };
};

export default BiometricService;
