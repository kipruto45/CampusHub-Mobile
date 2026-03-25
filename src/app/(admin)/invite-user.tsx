import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { useToast } from '../../components/ui/Toast';
import { adminAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius, spacing } from '../../theme/spacing';

type ComposerMode = 'manual' | 'bulk';

type InvitationRoleOption = {
  id: string;
  code: string;
  name: string;
  description?: string;
  can_invite: boolean;
  permission_preset: string[];
  email_subject_template?: string;
  email_body_template?: string;
};

const ROLE_PRIORITY: Record<string, number> = {
  ADMIN: 0,
  DEPARTMENT_HEAD: 1,
  MODERATOR: 2,
  INSTRUCTOR: 3,
  SUPPORT_STAFF: 4,
  STUDENT: 5,
};

const TEMPLATE_FALLBACKS = {
  subject: 'CampusHub invitation for {primary_role_name}',
  body:
    "Hello,\n\nYou've been invited to join CampusHub with the following roles: {role_names_csv}.\n\nInvited by: CampusHub admin\nInvitation email: {invitee_email}\n{note_block}Accept invitation from the CampusHub app.\n",
};

const replaceTemplateTokens = (template: string, context: Record<string, string>) => {
  return Object.entries(context).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }, template);
};

export default function InviteUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; email?: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<ComposerMode>(params.tab === 'bulk' ? 'bulk' : 'manual');
  const [roleOptions, setRoleOptions] = useState<InvitationRoleOption[]>([]);
  const [roleSearch, setRoleSearch] = useState('');

  const [email, setEmail] = useState(String(params.email || ''));
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [subjectDirty, setSubjectDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);

  const [csvText, setCsvText] = useState('email,roles,note,expires_in_days\n');
  const [bulkDefaultRoles, setBulkDefaultRoles] = useState<string[]>([]);
  const [bulkDefaultNote, setBulkDefaultNote] = useState('');
  const [bulkExpiresInDays, setBulkExpiresInDays] = useState<number>(7);

  const fetchRoleOptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getInvitationRoleOptions(true);
      const payload = response.data?.data || response.data || [];
      setRoleOptions(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      console.error('Failed to load invitation roles:', error);
      showToast('error', error?.response?.data?.detail || 'Unable to load invitation roles');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRoleOptions();
  }, [fetchRoleOptions]);

  const filteredRoleOptions = useMemo(() => {
    if (!roleSearch.trim()) {
      return roleOptions;
    }
    const query = roleSearch.trim().toLowerCase();
    return roleOptions.filter((roleOption) => {
      return (
        roleOption.name.toLowerCase().includes(query) ||
        roleOption.code.toLowerCase().includes(query) ||
        String(roleOption.description || '').toLowerCase().includes(query)
      );
    });
  }, [roleOptions, roleSearch]);

  const selectedRoleObjects = useMemo(() => {
    return selectedRoles
      .map((roleCode) => roleOptions.find((roleOption) => roleOption.code === roleCode))
      .filter(Boolean) as InvitationRoleOption[];
  }, [roleOptions, selectedRoles]);

  const primaryRole = useMemo(() => {
    if (!selectedRoleObjects.length) return null;
    return [...selectedRoleObjects].sort((left, right) => {
      const leftPriority = ROLE_PRIORITY[left.code] ?? 99;
      const rightPriority = ROLE_PRIORITY[right.code] ?? 99;
      return leftPriority - rightPriority;
    })[0];
  }, [selectedRoleObjects]);

  useEffect(() => {
    if (!primaryRole) return;
    if (!subjectDirty) {
      setEmailSubject(primaryRole.email_subject_template || TEMPLATE_FALLBACKS.subject);
    }
    if (!bodyDirty) {
      setEmailBody(primaryRole.email_body_template || TEMPLATE_FALLBACKS.body);
    }
  }, [bodyDirty, primaryRole, subjectDirty]);

  const previewContext = useMemo(() => {
    return {
      primary_role_name: primaryRole?.name || 'CampusHub user',
      role_names_csv: selectedRoleObjects.map((role) => role.name).join(', ') || 'Student',
      invitee_email: email || 'invitee@campushub.app',
      note_block: note ? `Note: ${note}\n` : '',
    };
  }, [email, note, primaryRole?.name, selectedRoleObjects]);

  const renderedSubject = replaceTemplateTokens(
    emailSubject || TEMPLATE_FALLBACKS.subject,
    previewContext
  );
  const renderedBody = replaceTemplateTokens(emailBody || TEMPLATE_FALLBACKS.body, previewContext);

  const toggleRole = (roleCode: string, target: 'manual' | 'bulk') => {
    const setter = target === 'manual' ? setSelectedRoles : setBulkDefaultRoles;
    setter((current) => {
      if (current.includes(roleCode)) {
        return current.filter((value) => value !== roleCode);
      }
      return [...current, roleCode];
    });
  };

  const handleCreateInvitation = async () => {
    if (!email.trim()) {
      showToast('error', 'Invitee email is required');
      return;
    }
    if (!selectedRoles.length) {
      showToast('error', 'Choose at least one role');
      return;
    }

    try {
      setSubmitting(true);
      await adminAPI.createInvitation({
        email: email.trim().toLowerCase(),
        roles: selectedRoles,
        note: note.trim(),
        expires_in_days: expiresInDays,
        email_subject: emailSubject,
        email_body: emailBody,
      });
      showToast('success', 'Invitation created and sent');
      router.replace('/(admin)/invitations');
    } catch (error: any) {
      console.error('Failed to create invitation:', error);
      showToast('error', error?.response?.data?.detail || 'Failed to create invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!csvText.trim()) {
      showToast('error', 'Paste CSV content first');
      return;
    }

    try {
      setSubmitting(true);
      const response = await adminAPI.bulkCreateInvitations({
        csv_text: csvText,
        default_roles: bulkDefaultRoles,
        default_note: bulkDefaultNote,
        default_expires_in_days: bulkExpiresInDays,
      });
      const payload = response.data?.data || response.data || {};
      const summary = payload.summary || {};
      showToast(
        'success',
        `Bulk import finished: ${summary.created || 0} created, ${summary.failed || 0} failed`
      );
      router.replace('/(admin)/invitations');
    } catch (error: any) {
      console.error('Failed to import CSV invitations:', error);
      showToast('error', error?.response?.data?.detail || 'Failed to import CSV invitations');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRoleSelector = (
    selectedValues: string[],
    target: 'manual' | 'bulk',
    subtitle: string
  ) => (
    <Card variant="outlined" style={styles.selectorCard}>
      <Text style={styles.selectorTitle}>Available Roles</Text>
      <Text style={styles.selectorSubtitle}>{subtitle}</Text>
      <Input
        value={roleSearch}
        onChangeText={setRoleSearch}
        placeholder="Search roles"
        leftIcon={<Icon name="search" size={18} color={colors.text.tertiary} />}
      />
      <View style={styles.roleOptionGrid}>
        {filteredRoleOptions.map((roleOption) => {
          const selected = selectedValues.includes(roleOption.code);
          return (
            <TouchableOpacity
              key={`${target}-${roleOption.code}`}
              style={[styles.roleOptionCard, selected && styles.roleOptionCardSelected]}
              onPress={() => toggleRole(roleOption.code, target)}
              activeOpacity={0.88}
            >
              <View style={styles.roleOptionHeader}>
                <Text style={[styles.roleOptionName, selected && styles.roleOptionNameSelected]}>
                  {roleOption.name}
                </Text>
                <Icon
                  name={selected ? 'checkmark-circle' : 'add-circle'}
                  size={18}
                  color={selected ? colors.primary[700] : colors.text.tertiary}
                />
              </View>
              <Text style={[styles.roleOptionDescription, selected && styles.roleOptionDescriptionSelected]}>
                {roleOption.description || 'Role-specific invite template and permission preset.'}
              </Text>
              <Text style={[styles.roleOptionMeta, selected && styles.roleOptionMetaSelected]}>
                {roleOption.permission_preset?.length || 0} preset permissions
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingShell} padding="large">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Preparing invitation studio...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padding="none" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerShell}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Icon name="chevron-back" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Role Invitations</Text>
            <Text style={styles.title}>Compose invitations with role presets and template previews.</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(['manual', 'bulk'] as ComposerMode[]).map((tab) => {
            const selected = mode === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setMode(tab)}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {tab === 'manual' ? 'Manual Invite' : 'Bulk CSV'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === 'manual' ? (
          <>
            <Card style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Badge label="Live Template Preview" variant="primary" />
                <Text style={styles.heroMeta}>{selectedRoles.length || 0} roles selected</Text>
              </View>
              <Text style={styles.heroTitle}>Craft a role-aware invitation before it ever leaves the dashboard.</Text>
              <Text style={styles.heroSubtitle}>
                Select multiple roles, tweak the message, and preview the exact subject/body that will be sent.
              </Text>
            </Card>

            <Card style={styles.formCard}>
              <Input
                label="Invitee Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="user@campushub.app"
                leftIcon={<Icon name="mail" size={18} color={colors.text.tertiary} />}
              />
              <Input
                label="Admin Note"
                value={note}
                onChangeText={setNote}
                placeholder="Optional context shown in the invitation"
                multiline
                numberOfLines={4}
              />

              <View style={styles.expiryRow}>
                {[7, 14, 30].map((days) => {
                  const selected = expiresInDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      style={[styles.expiryChip, selected && styles.expiryChipSelected]}
                      onPress={() => setExpiresInDays(days)}
                    >
                      <Text style={[styles.expiryChipText, selected && styles.expiryChipTextSelected]}>
                        {days} days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {renderRoleSelector(
              selectedRoles,
              'manual',
              'Tap multiple roles to build a multi-role invitation and permission preset.'
            )}

            <Card style={styles.formCard}>
              <Text style={styles.sectionTitle}>Template Snapshot</Text>
              <Text style={styles.sectionSubtitle}>
                These values are saved with the invitation so the exact message is auditable later.
              </Text>
              <Input
                label="Email Subject Template"
                value={emailSubject}
                onChangeText={(value) => {
                  setSubjectDirty(true);
                  setEmailSubject(value);
                }}
                placeholder="CampusHub invitation for {primary_role_name}"
              />
              <Input
                label="Email Body Template"
                value={emailBody}
                onChangeText={(value) => {
                  setBodyDirty(true);
                  setEmailBody(value);
                }}
                placeholder="Use placeholders like {role_names_csv} and {invitee_email}"
                multiline
                numberOfLines={8}
              />
            </Card>

            <Card style={styles.previewCard}>
              <Text style={styles.previewLabel}>Rendered Preview</Text>
              <Text style={styles.previewSubject}>{renderedSubject}</Text>
              <Text style={styles.previewBody}>{renderedBody}</Text>
            </Card>

            <Button
              title="Send Invitation"
              onPress={handleCreateInvitation}
              loading={submitting}
              fullWidth
              icon={<Icon name="send" size={16} color={colors.text.inverse} />}
              style={styles.primaryAction}
            />
          </>
        ) : (
          <>
            <Card style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Badge label="Bulk Mode" variant="warning" />
                <Text style={styles.heroMeta}>CSV-ready import lane</Text>
              </View>
              <Text style={styles.heroTitle}>Paste CSV content and launch a structured invite batch.</Text>
              <Text style={styles.heroSubtitle}>
                Keep the columns simple: email, roles, note, and expires_in_days. Extra columns are stored as metadata.
              </Text>
            </Card>

            {renderRoleSelector(
              bulkDefaultRoles,
              'bulk',
              'Fallback roles used only when a row omits a roles column.'
            )}

            <Card style={styles.formCard}>
              <Text style={styles.sectionTitle}>Bulk Defaults</Text>
              <Input
                label="Default Note"
                value={bulkDefaultNote}
                onChangeText={setBulkDefaultNote}
                placeholder="Optional note added when a row does not include one"
                multiline
                numberOfLines={4}
              />
              <View style={styles.expiryRow}>
                {[7, 14, 30].map((days) => {
                  const selected = bulkExpiresInDays === days;
                  return (
                    <TouchableOpacity
                      key={`bulk-${days}`}
                      style={[styles.expiryChip, selected && styles.expiryChipSelected]}
                      onPress={() => setBulkExpiresInDays(days)}
                    >
                      <Text style={[styles.expiryChipText, selected && styles.expiryChipTextSelected]}>
                        {days} days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            <Card style={styles.sampleCard} variant="filled">
              <Text style={styles.sectionTitle}>Sample CSV</Text>
              <Text style={styles.sampleText}>
                email,roles,note,expires_in_days{'\n'}
                dean@campushub.app,DEPARTMENT_HEAD|INSTRUCTOR,Welcome aboard,14{'\n'}
                support@campushub.app,SUPPORT_STAFF,,7
              </Text>
            </Card>

            <Card style={styles.formCard}>
              <Input
                label="CSV Content"
                value={csvText}
                onChangeText={setCsvText}
                placeholder="Paste CSV content here"
                multiline
                numberOfLines={14}
              />
            </Card>

            <Button
              title="Run Bulk Import"
              onPress={handleBulkCreate}
              loading={submitting}
              fullWidth
              icon={<Icon name="cloud-upload" size={16} color={colors.text.inverse} />}
              style={styles.primaryAction}
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingShell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    color: colors.text.secondary,
  },
  headerShell: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary[600],
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text.primary,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 999,
    padding: 4,
    marginBottom: spacing[4],
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  tabSelected: {
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  tabTextSelected: {
    color: colors.text.primary,
  },
  heroCard: {
    backgroundColor: colors.primary[700],
    marginBottom: spacing[4],
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: colors.text.inverse,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: spacing[3],
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    marginBottom: spacing[4],
  },
  selectorCard: {
    marginBottom: spacing[4],
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  selectorSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  roleOptionGrid: {
    gap: spacing[3],
  },
  roleOptionCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[4],
    backgroundColor: colors.card.light,
  },
  roleOptionCardSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  roleOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  roleOptionName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  roleOptionNameSelected: {
    color: colors.primary[700],
  },
  roleOptionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  roleOptionDescriptionSelected: {
    color: colors.primary[700],
  },
  roleOptionMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleOptionMetaSelected: {
    color: colors.primary[500],
  },
  expiryRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
    marginTop: spacing[1],
  },
  expiryChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: colors.background.secondary,
  },
  expiryChipSelected: {
    backgroundColor: colors.accent[500],
  },
  expiryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  expiryChipTextSelected: {
    color: colors.text.inverse,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  previewCard: {
    marginBottom: spacing[4],
    backgroundColor: colors.gray[900],
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  previewSubject: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing[3],
  },
  previewBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 22,
  },
  sampleCard: {
    marginBottom: spacing[4],
  },
  sampleText: {
    marginTop: spacing[2],
    fontSize: 13,
    lineHeight: 20,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  primaryAction: {
    marginBottom: spacing[4],
  },
});
