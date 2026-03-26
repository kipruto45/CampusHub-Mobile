import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { useToast } from '../../components/ui/Toast';
import {
  AdminCommunicationResult,
  sendAdminCommunication,
} from '../../services/admin-management.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius, spacing } from '../../theme/spacing';

type Channel = 'email' | 'in_app' | 'sms';

const CHANNEL_OPTIONS: {
  id: Channel;
  label: string;
  description: string;
  icon: string;
  color: string;
}[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Send a full email to every matched recipient.',
    icon: 'mail',
    color: colors.primary[500],
  },
  {
    id: 'in_app',
    label: 'In-App',
    description: 'Drop a notification into the user notification center.',
    icon: 'notifications',
    color: colors.success,
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Text matched users who have a saved phone number.',
    icon: 'chatbubble',
    color: colors.warning,
  },
];

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Students' },
  { value: 'INSTRUCTOR', label: 'Instructors' },
  { value: 'DEPARTMENT_HEAD', label: 'Department Heads' },
  { value: 'SUPPORT_STAFF', label: 'Support Staff' },
  { value: 'MODERATOR', label: 'Moderators' },
  { value: 'ADMIN', label: 'Admins' },
];

export default function AdminCommunicationsScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [sending, setSending] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([
    'email',
    'in_app',
  ]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [link, setLink] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [result, setResult] = useState<AdminCommunicationResult | null>(null);

  const hasEmail = selectedChannels.includes('email');
  const hasInApp = selectedChannels.includes('in_app');
  const hasSms = selectedChannels.includes('sms');

  const audienceLabel = useMemo(() => {
    if (!selectedRoles.length) {
      return 'All active users';
    }
    return ROLE_OPTIONS.filter((role) => selectedRoles.includes(role.value))
      .map((role) => role.label)
      .join(', ');
  }, [selectedRoles]);

  const toggleChannel = (channel: Channel) => {
    setSelectedChannels((current) => {
      if (current.includes(channel)) {
        return current.filter((value) => value !== channel);
      }
      return [...current, channel];
    });
  };

  const toggleRole = (roleCode: string) => {
    setSelectedRoles((current) => {
      if (current.includes(roleCode)) {
        return current.filter((value) => value !== roleCode);
      }
      return [...current, roleCode];
    });
  };

  const resetForm = () => {
    setTitle('');
    setEmailSubject('');
    setCampaignName('');
    setMessage('');
    setSmsMessage('');
    setLink('');
    setYearOfStudy('');
    setSelectedRoles([]);
    setSelectedChannels(['email', 'in_app']);
  };

  const handleSend = async () => {
    if (!selectedChannels.length) {
      showToast('error', 'Choose at least one channel');
      return;
    }
    if (!title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    if (!message.trim()) {
      showToast('error', 'Message is required');
      return;
    }

    try {
      setSending(true);
      const response = await sendAdminCommunication({
        title: title.trim(),
        email_subject: hasEmail ? (emailSubject.trim() || title.trim()) : undefined,
        campaign_name: hasEmail ? (campaignName.trim() || title.trim()) : undefined,
        message: message.trim(),
        sms_message: hasSms ? (smsMessage.trim() || message.trim()) : undefined,
        link: hasInApp ? link.trim() : undefined,
        channels: selectedChannels,
        target_user_roles: selectedRoles.length ? selectedRoles : undefined,
        target_year_of_study: yearOfStudy.trim() ? Number(yearOfStudy) : undefined,
      });
      setResult(response);
      showToast('success', `Communication sent to ${response.recipient_count} recipient(s)`);
      Alert.alert(
        'Communication sent',
        `Delivered to ${response.recipient_count} matched recipient(s).`
      );
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'Failed to send communication';
      showToast('error', detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer padding="none" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <Text style={styles.eyebrow}>Admin Communications</Text>
          <Text style={styles.heroTitle}>Send one message across email, in-app, and SMS.</Text>
          <Text style={styles.heroSubtitle}>
            Choose the audience, pick the channels, and send one coordinated update from the
            admin workspace.
          </Text>
          <View style={styles.heroActions}>
            <Button
              title="Open Email Campaigns"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(admin)/email-campaigns')}
              icon={<Icon name="mail" size={16} color={colors.primary[500]} />}
            />
          </View>
        </View>

        <Card style={styles.sectionCard} variant="outlined">
          <Text style={styles.sectionTitle}>Channels</Text>
          <Text style={styles.sectionSubtitle}>
            Turn on every delivery path you want for this message.
          </Text>
          <View style={styles.optionGrid}>
            {CHANNEL_OPTIONS.map((channel) => {
              const selected = selectedChannels.includes(channel.id);
              return (
                <TouchableOpacity
                  key={channel.id}
                  style={[styles.channelCard, selected && styles.channelCardSelected]}
                  activeOpacity={0.88}
                  onPress={() => toggleChannel(channel.id)}
                >
                  <View
                    style={[
                      styles.channelIcon,
                      { backgroundColor: `${channel.color}18` },
                    ]}
                  >
                    <Icon name={channel.icon as any} size={18} color={channel.color} />
                  </View>
                  <View style={styles.channelCopy}>
                    <Text style={styles.channelTitle}>{channel.label}</Text>
                    <Text style={styles.channelDescription}>{channel.description}</Text>
                  </View>
                  <Icon
                    name={selected ? 'checkmark-circle' : 'ellipse'}
                    size={20}
                    color={selected ? colors.primary[500] : colors.text.tertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="outlined">
          <Text style={styles.sectionTitle}>Audience</Text>
          <Text style={styles.sectionSubtitle}>
            Leave all roles unselected to target every active user.
          </Text>
          <View style={styles.roleChips}>
            {ROLE_OPTIONS.map((role) => {
              const selected = selectedRoles.includes(role.value);
              return (
                <TouchableOpacity
                  key={role.value}
                  style={[styles.roleChip, selected && styles.roleChipSelected]}
                  onPress={() => toggleRole(role.value)}
                >
                  <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Input
            label="Year of Study"
            value={yearOfStudy}
            onChangeText={setYearOfStudy}
            keyboardType="number-pad"
            placeholder="Optional, e.g. 2"
            hint="Add a year filter if the update only applies to one cohort."
            containerStyle={styles.compactInput}
          />
          <View style={styles.audienceBanner}>
            <Icon name="people" size={18} color={colors.primary[600]} />
            <Text style={styles.audienceBannerText}>{audienceLabel}</Text>
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="outlined">
          <Text style={styles.sectionTitle}>Compose</Text>
          <Text style={styles.sectionSubtitle}>
            The title is used for in-app alerts and as the default email subject.
          </Text>

          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Semester update"
          />

          {hasEmail ? (
            <>
              <Input
                label="Email Subject"
                value={emailSubject}
                onChangeText={setEmailSubject}
                placeholder="Defaults to the title when left blank"
              />
              <Input
                label="Campaign Name"
                value={campaignName}
                onChangeText={setCampaignName}
                placeholder="Optional internal label for the email campaign record"
              />
            </>
          ) : null}

          <Input
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="Write the main communication here"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {hasSms ? (
            <Input
              label="SMS Message"
              value={smsMessage}
              onChangeText={setSmsMessage}
              placeholder="Optional shorter SMS copy"
              hint="Leave blank to reuse the main message."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : null}

          {hasInApp ? (
            <Input
              label="In-App Link"
              value={link}
              onChangeText={setLink}
              placeholder="/announcements/new-semester"
              hint="Optional route or URL to open when the user taps the notification."
            />
          ) : null}

          <View style={styles.footerActions}>
            <Button
              title="Reset"
              variant="ghost"
              onPress={resetForm}
            />
            <Button
              title={sending ? 'Sending...' : 'Send Communication'}
              onPress={() => void handleSend()}
              loading={sending}
              icon={<Icon name="send" size={16} color={colors.text.inverse} />}
            />
          </View>
        </Card>

        {result ? (
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Last Send Summary</Text>
            <Text style={styles.resultHeadline}>
              {result.recipient_count} matched recipient(s)
            </Text>
            <View style={styles.resultRows}>
              {result.channel_results.email ? (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Email</Text>
                  <Text style={styles.resultValue}>
                    {result.channel_results.email.sent_count} sent
                    {result.channel_results.email.failed_count
                      ? ` • ${result.channel_results.email.failed_count} failed`
                      : ''}
                  </Text>
                </View>
              ) : null}
              {result.channel_results.in_app ? (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>In-App</Text>
                  <Text style={styles.resultValue}>
                    {result.channel_results.in_app.sent_count} delivered
                  </Text>
                </View>
              ) : null}
              {result.channel_results.sms ? (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>SMS</Text>
                  <Text style={styles.resultValue}>
                    {result.channel_results.sms.sent_count} sent
                    {result.channel_results.sms.skipped_count
                      ? ` • ${result.channel_results.sms.skipped_count} skipped`
                      : ''}
                    {result.channel_results.sms.failed_count
                      ? ` • ${result.channel_results.sms.failed_count} failed`
                      : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}
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
    gap: spacing[4],
  },
  hero: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    overflow: 'hidden',
    ...shadows.md,
  },
  heroAccent: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.text.inverse,
    opacity: 0.85,
  },
  heroTitle: {
    marginTop: spacing[2],
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.inverse,
  },
  heroSubtitle: {
    marginTop: spacing[2],
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  heroActions: {
    marginTop: spacing[4],
    flexDirection: 'row',
  },
  sectionCard: {
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  optionGrid: {
    gap: spacing[3],
  },
  channelCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  channelCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}10`,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCopy: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  channelDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  roleChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  roleChipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  roleChipTextSelected: {
    color: colors.text.inverse,
  },
  compactInput: {
    marginBottom: 0,
  },
  audienceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary[500]}12`,
  },
  audienceBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[700],
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  resultCard: {
    gap: spacing[3],
  },
  resultHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },
  resultRows: {
    gap: spacing[2],
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  resultValue: {
    flex: 1,
    marginLeft: spacing[3],
    textAlign: 'right',
    fontSize: 13,
    color: colors.text.secondary,
  },
});
