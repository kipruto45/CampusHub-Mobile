import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { useToast } from '../../components/ui/Toast';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius, spacing } from '../../theme/spacing';

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

type Invitation = {
  id: string;
  email: string;
  role: string;
  roles: string[];
  role_details: Array<{
    code: string;
    name: string;
    is_primary: boolean;
  }>;
  status: InvitationStatus;
  note?: string;
  invited_by_name?: string;
  accepted_by_name?: string;
  has_existing_account?: boolean;
  expires_at: string;
  created_at: string;
};

const STATUS_FILTERS: Array<{ key: 'all' | InvitationStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'expired', label: 'Expired' },
  { key: 'revoked', label: 'Revoked' },
];

const statusVariantMap: Record<InvitationStatus, 'primary' | 'success' | 'warning' | 'error' | 'gray'> = {
  pending: 'primary',
  accepted: 'success',
  expired: 'warning',
  revoked: 'error',
};

export default function AdminInvitationsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus>('all');
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const fetchInvitations = useCallback(
    async (isRefresh: boolean = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await adminAPI.listInvitations({
          page_size: 50,
          search: search || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        });
        const payload = response.data?.data || response.data || {};
        setInvitations(Array.isArray(payload.results) ? payload.results : []);
      } catch (error: any) {
        console.error('Failed to fetch invitations:', error);
        showToast('error', error?.response?.data?.detail || 'Unable to load invitations');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, showToast, statusFilter]
  );

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const counts = useMemo(() => {
    return invitations.reduce(
      (acc, invitation) => {
        acc.total += 1;
        acc[invitation.status] += 1;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        accepted: 0,
        expired: 0,
        revoked: 0,
      }
    );
  }, [invitations]);

  const handleRevoke = useCallback(
    async (invitationId: string) => {
      try {
        setSubmittingId(invitationId);
        await adminAPI.revokeInvitation(invitationId);
        showToast('success', 'Invitation revoked');
        fetchInvitations(true);
      } catch (error: any) {
        showToast('error', error?.response?.data?.message || 'Failed to revoke invitation');
      } finally {
        setSubmittingId(null);
      }
    },
    [fetchInvitations, showToast]
  );

  const renderStatCard = (
    label: string,
    value: number,
    accentColor: string,
    icon: string
  ) => (
    <View style={[styles.statCard, { borderColor: `${accentColor}22` }]} key={label}>
      <View style={[styles.statIcon, { backgroundColor: `${accentColor}15` }]}>
        <Icon name={icon as any} size={18} color={accentColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <ScreenContainer style={styles.loaderShell} padding="large">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loaderText}>Loading invitation command center...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padding="none" style={styles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInvitations(true)}
            colors={[colors.primary[500]]}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.eyebrow}>Admin Invitations</Text>
          <Text style={styles.heroTitle}>Invite, track, and govern role access from one place.</Text>
          <Text style={styles.heroSubtitle}>
            Launch individual invites, prep bulk CSV runs, and keep a clean read on pending,
            accepted, and expired invitations.
          </Text>
          <View style={styles.heroActions}>
            <Button
              title="Create Invite"
              onPress={() => router.push('/(admin)/invite-user')}
              icon={<Icon name="add" size={16} color={colors.text.inverse} />}
              style={styles.heroPrimaryButton}
            />
            <Button
              title="Bulk CSV"
              variant="outline"
              onPress={() => router.push('/(admin)/invite-user?tab=bulk')}
              icon={<Icon name="cloud-upload" size={16} color={colors.primary[500]} />}
              style={styles.heroSecondaryButton}
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard('Pending', counts.pending, colors.primary[500], 'mail-unread')}
          {renderStatCard('Accepted', counts.accepted, colors.success, 'checkmark-circle')}
          {renderStatCard('Expired', counts.expired, colors.warning, 'time')}
          {renderStatCard('Revoked', counts.revoked, colors.error, 'close-circle')}
        </View>

        <Card style={styles.panel} variant="elevated">
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Invitation Queue</Text>
              <Text style={styles.panelSubtitle}>{counts.total} total invitations in the current view</Text>
            </View>
            <TouchableOpacity
              style={styles.inlineLink}
              onPress={() => router.push('/(admin)/users')}
            >
              <Text style={styles.inlineLinkText}>Users</Text>
              <Icon name="chevron-forward" size={14} color={colors.primary[600]} />
            </TouchableOpacity>
          </View>

          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search invited email"
            leftIcon={<Icon name="search" size={18} color={colors.text.tertiary} />}
            containerStyle={styles.searchInput}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {STATUS_FILTERS.map((filter) => {
              const selected = filter.key === statusFilter;
              return (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setStatusFilter(filter.key)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!invitations.length ? (
            <EmptyState
              icon="mail"
              title="No invitations match this view"
              description="Create your first role invitation or widen the filters to inspect older activity."
              actionLabel="Create Invite"
              onAction={() => router.push('/(admin)/invite-user')}
            />
          ) : (
            <View style={styles.invitationList}>
              {invitations.map((invitation) => (
                <View key={invitation.id} style={styles.invitationCardWrap}>
                  <Card style={styles.invitationCard} variant="outlined">
                    <View style={styles.invitationHeader}>
                      <View style={styles.invitationIdentity}>
                        <Text style={styles.invitationEmail}>{invitation.email}</Text>
                        <Badge
                          label={invitation.status.toUpperCase()}
                          variant={statusVariantMap[invitation.status]}
                        />
                      </View>
                      <View style={styles.invitationMetaRight}>
                        <Text style={styles.invitationDate}>
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </Text>
                        {invitation.has_existing_account ? (
                          <Badge label="Existing account" variant="outline" />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.roleRow}>
                      {(invitation.role_details?.length ? invitation.role_details : invitation.roles?.map((role) => ({
                        code: role,
                        name: role.replace(/_/g, ' '),
                        is_primary: role === invitation.role,
                      }))).map((roleDetail) => (
                        <View
                          key={roleDetail.code}
                          style={[
                            styles.rolePill,
                            roleDetail.is_primary && styles.rolePillPrimary,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rolePillText,
                              roleDetail.is_primary && styles.rolePillTextPrimary,
                            ]}
                          >
                            {roleDetail.name}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {invitation.note ? (
                      <Text style={styles.invitationNote}>{invitation.note}</Text>
                    ) : null}

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Invited by</Text>
                        <Text style={styles.metaValue}>{invitation.invited_by_name || 'CampusHub admin'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Expires</Text>
                        <Text style={styles.metaValue}>
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {invitation.status === 'pending' ? (
                      <View style={styles.cardActions}>
                        <Button
                          title="Revoke"
                          variant="ghost"
                          loading={submittingId === invitation.id}
                          onPress={() => handleRevoke(invitation.id)}
                          icon={<Icon name="close-circle" size={16} color={colors.primary[500]} />}
                          style={styles.actionButton}
                        />
                        <Button
                          title="Create Similar"
                          variant="outline"
                          onPress={() =>
                            router.push(
                              `/(admin)/invite-user?email=${encodeURIComponent(invitation.email)}`
                            )
                          }
                          icon={<Icon name="copy" size={16} color={colors.primary[500]} />}
                          style={styles.actionButton}
                        />
                      </View>
                    ) : null}
                  </Card>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: spacing[8],
  },
  loaderShell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: spacing[4],
    fontSize: 15,
    color: colors.text.secondary,
  },
  hero: {
    margin: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary[700],
    overflow: 'hidden',
    ...shadows.md,
  },
  heroGlow: {
    position: 'absolute',
    right: -30,
    top: -10,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  heroTitle: {
    color: colors.text.inverse,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: spacing[3],
    maxWidth: '88%',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing[5],
    maxWidth: '92%',
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  heroPrimaryButton: {
    minWidth: 150,
  },
  heroSecondaryButton: {
    minWidth: 132,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: colors.card.light,
  },
  statsGrid: {
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  panel: {
    marginHorizontal: spacing[4],
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  panelSubtitle: {
    marginTop: spacing[1],
    fontSize: 13,
    color: colors.text.secondary,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineLinkText: {
    color: colors.primary[600],
    fontWeight: '700',
  },
  searchInput: {
    marginBottom: spacing[3],
  },
  filterRow: {
    gap: spacing[2],
    paddingBottom: spacing[2],
    marginBottom: spacing[4],
  },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: colors.background.secondary,
  },
  filterChipSelected: {
    backgroundColor: colors.primary[600],
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  filterChipTextSelected: {
    color: colors.text.inverse,
  },
  invitationList: {
    gap: spacing[3],
  },
  invitationCardWrap: {
    marginBottom: spacing[3],
  },
  invitationCard: {
    borderColor: colors.border.light,
    backgroundColor: colors.card.light,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  invitationIdentity: {
    flex: 1,
    gap: spacing[2],
  },
  invitationMetaRight: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  invitationEmail: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  invitationDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    backgroundColor: colors.background.secondary,
  },
  rolePillPrimary: {
    backgroundColor: colors.accent[500],
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  rolePillTextPrimary: {
    color: colors.text.inverse,
  },
  invitationNote: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  metaItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 130,
  },
});
