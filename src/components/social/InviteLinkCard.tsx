// InviteLinkCard Component - Display and manage an invite link
// CampusHub Mobile App

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../ui/Icon';
import { studyGroupsAPI } from '../../services/api';
import { copyToClipboard, openNativeShareSheet } from '../../utils/share';

interface InviteLink {
  id: string;
  token: string;
  invite_link: string;
  url: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  notes: string | null;
  created_by_name: string;
}

interface InviteLinkCardProps {
  link: InviteLink;
  onRevoke: (linkId: string) => void;
  onUpdate: (link: InviteLink) => void;
}

export default function InviteLinkCard({ link, onRevoke, onUpdate }: InviteLinkCardProps) {
  const [copying, setCopying] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExpirationText = () => {
    if (!link.expires_at) return 'Never expires';
    
    const expires = new Date(link.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
  const isExhausted = link.max_uses && link.use_count >= link.max_uses;
  const isUsable = link.is_active && !isExpired && !isExhausted;

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await copyToClipboard(link.invite_link);
      Alert.alert('Success', 'Invite link copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    } finally {
      setCopying(false);
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join my study group on CampusHub! ${link.invite_link}`,
        title: 'Join Study Group',
        url: link.invite_link,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Invite Link',
      'Are you sure you want to revoke this invite link? Anyone with this link will no longer be able to join.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Revoke', 
          style: 'destructive',
          onPress: () => onRevoke(link.token)
        },
      ]
    );
  };

  return (
    <View style={[styles.card, !isUsable && styles.cardDisabled]}>
      {/* Status Badge */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, isUsable ? styles.statusActive : styles.statusInactive]}>
          <Icon 
            name={isUsable ? 'checkmark-circle' : 'close-circle'} 
            size={14} 
            color={isUsable ? colors.success : colors.error} 
          />
          <Text style={[styles.statusText, isUsable ? styles.statusTextActive : styles.statusTextInactive]}>
            {isExpired ? 'Expired' : isExhausted ? 'Max uses reached' : link.is_active ? 'Active' : 'Revoked'}
          </Text>
        </View>
        
        <Text style={styles.usesText}>
          {link.use_count}{link.max_uses ? `/${link.max_uses}` : ''} uses
        </Text>
      </View>

      {/* Expiration Info */}
      <View style={styles.infoRow}>
        <Icon name="time" size={16} color={isExpired ? colors.error : colors.text.secondary} />
        <Text style={[styles.infoText, isExpired && styles.expiredText]}>
          {getExpirationText()}
        </Text>
      </View>

      {/* Created By */}
      <View style={styles.infoRow}>
        <Icon name="person" size={16} color={colors.text.secondary} />
        <Text style={styles.infoText}>
          Created by {link.created_by_name}
        </Text>
      </View>

      {/* Created At */}
      <View style={styles.infoRow}>
        <Icon name="calendar" size={16} color={colors.text.secondary} />
        <Text style={styles.infoText}>
          Created {formatDate(link.created_at)}
        </Text>
      </View>

      {/* Notes */}
      {link.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{link.notes}</Text>
        </View>
      )}

      {/* Invite Link Display */}
      <View style={styles.linkContainer}>
        <Text style={styles.linkLabel}>Invite Link:</Text>
        <Text style={styles.linkText} numberOfLines={1}>
          {link.invite_link}
        </Text>
      </View>

      {/* Actions */}
      {isUsable && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCopyLink}
            disabled={copying}
          >
            <Icon name="copy" size={18} color={colors.primary[500]} />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShareLink}
          >
            <Icon name="share-social" size={18} color={colors.primary[500]} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.revokeButton]}
            onPress={handleRevoke}
          >
            <Icon name="trash" size={18} color={colors.error} />
            <Text style={styles.revokeText}>Revoke</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  cardDisabled: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusInactive: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.error,
  },
  usesText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  expiredText: {
    color: colors.error,
  },
  notesContainer: {
    backgroundColor: colors.gray[50],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  notesText: {
    fontSize: 13,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    gap: spacing[3],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    gap: spacing[1],
  },
  actionText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '600',
  },
  revokeButton: {
    backgroundColor: colors.error + '10',
    marginLeft: 'auto',
  },
  revokeText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  linkLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  linkText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '500',
  },
});
