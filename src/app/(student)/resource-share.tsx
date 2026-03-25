// Resource Share Screen - Handle shared resource links
// CampusHub Mobile App

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { resourcesAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

interface SharedResource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  course: { id: string; name: string; code: string };
  file_format: string;
  file_size: number;
  uploader: { id: string; first_name: string; last_name: string };
  created_at: string;
}

export default function ResourceShareScreen() {
  const { token, resource_id } = useLocalSearchParams<{ token?: string; resource_id?: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<SharedResource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resource_id) {
      fetchResource();
    } else if (token) {
      // Try to validate token and get resource info
      validateShareLink();
    } else {
      setError('Invalid share link');
      setLoading(false);
    }
  }, [token, resource_id]);

  const fetchResource = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await resourcesAPI.get(resource_id!);
      const data = response.data?.data || response.data;
      setResource(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load shared resource');
    } finally {
      setLoading(false);
    }
  };

  const validateShareLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If there's a token, validate it via backend
      const response = await resourcesAPI.getSharedResource(token!);
      const data = response.data?.data || response.data;
      setResource(data);
    } catch (err: any) {
      // If token validation fails, try direct resource ID
      if (err.response?.status === 404 && resource_id) {
        await fetchResource();
      } else {
        setError(err.response?.data?.message || 'Invalid or expired share link');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewResource = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to view this resource',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    // Check if user is active
    if (user && !user.is_active) {
      Alert.alert(
        'Account Inactive',
        'Your account is not active. Please contact support.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (resource?.id) {
      router.push(`/(student)/resource/${resource.id}`);
    }
  };

  const handleLoginAndView = () => {
    // Store the resource ID for redirect after login
    if (resource?.id) {
      router.push({
        pathname: '/(auth)/login',
        params: { redirect: `/resource/${resource.id}` }
      });
    } else {
      router.push('/(auth)/login');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading shared resource...</Text>
        </View>
      </View>
    );
  }

  if (error || !resource) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Icon name="alert-circle" size={64} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Resource Unavailable</Text>
          <Text style={styles.errorMessage}>
            {error || 'This shared resource is no longer available'}
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(student)/tabs/resources')}
          >
            <Text style={styles.primaryButtonText}>Browse Resources</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        {/* Resource Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.resourceIcon}>
            <Icon name="document-text" size={40} color={colors.primary[500]} />
          </View>
          
          <Text style={styles.resourceTitle}>{resource.title}</Text>
          
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{resource.resource_type}</Text>
          </View>
          
          {resource.course && (
            <Text style={styles.courseText}>
              {resource.course.code} - {resource.course.name}
            </Text>
          )}
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Icon name="document" size={16} color={colors.text.secondary} />
              <Text style={styles.statText}>
                {resource.file_format?.toUpperCase()} • {formatFileSize(resource.file_size)}
              </Text>
            </View>
          </View>
          
          {resource.description && (
            <Text style={styles.description} numberOfLines={3}>
              {resource.description}
            </Text>
          )}
          
          <View style={styles.uploaderRow}>
            <View style={styles.uploaderAvatar}>
              <Text style={styles.uploaderInitial}>
                {resource.uploader?.first_name?.[0] || 'U'}
              </Text>
            </View>
            <View style={styles.uploaderInfo}>
              <Text style={styles.uploaderName}>
                {resource.uploader?.first_name} {resource.uploader?.last_name}
              </Text>
              <Text style={styles.uploadDate}>
                Uploaded {formatDate(resource.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Status */}
        <View style={styles.actionStatus}>
          {isAuthenticated && user?.is_active ? (
            <View style={styles.statusReady}>
              <Icon name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.statusText}>
                You're ready to view this resource
              </Text>
            </View>
          ) : (
            <View style={styles.statusLogin}>
              <Icon name="person-add" size={24} color={colors.warning} />
              <Text style={styles.statusText}>
                {isAuthenticated ? 'Account inactive' : 'Login required to view'}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isAuthenticated && user?.is_active ? (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleViewResource}
            >
              <Text style={styles.primaryButtonText}>View Resource</Text>
            </TouchableOpacity>
          ) : isAuthenticated ? (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => Alert.alert('Account Inactive', 'Please contact support to activate your account.')}
            >
              <Text style={styles.primaryButtonText}>Contact Support</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleLoginAndView}
            >
              <Text style={styles.primaryButtonText}>Login to View</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/(student)/tabs/resources')}
          >
            <Text style={styles.secondaryButtonText}>Browse Resources</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: 16,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: spacing[5],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  errorIcon: {
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  errorMessage: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  previewCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.md,
  },
  resourceIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  resourceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  typeBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
  },
  courseText: {
    fontSize: 14,
    color: colors.primary[600],
    marginBottom: spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
    width: '100%',
  },
  uploaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  uploaderInitial: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  uploaderInfo: {
    flex: 1,
  },
  uploaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  uploadDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  actionStatus: {
    marginTop: spacing[6],
    padding: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
  },
  statusReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing[3],
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
