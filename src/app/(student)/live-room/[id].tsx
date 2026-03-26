/**
 * Live Study Room Detail Screen
 * Lightweight room detail + participants + chat.
 */

import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Icon from '../../../components/ui/Icon';
import {
  liveRoomsService,
  RoomMessage,
  RoomParticipant,
  StudyRoom,
} from '../../../services/live-rooms.service';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

const formatTime = (value?: string | null) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '';
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const pillForPrivacy = (value?: string | null) => {
  const privacy = String(value || '').toLowerCase();
  if (privacy === 'public') return { bg: colors.info + '1A', fg: colors.info, label: 'Public' };
  if (privacy === 'private') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Private' };
  if (privacy === 'invite_only') return { bg: colors.gray[100], fg: colors.text.secondary, label: 'Invite only' };
  return { bg: colors.gray[100], fg: colors.text.secondary, label: privacy || '—' };
};

export default function LiveRoomDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const roomId = useMemo(() => {
    const raw = params?.id;
    const resolved = Array.isArray(raw) ? raw[0] : raw;
    return String(resolved || '').trim();
  }, [params?.id]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!roomId) {
      setError('Missing room ID.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!opts?.silent) {
        setError(null);
      }
      const [roomRes, participantRes, messageRes] = await Promise.all([
        liveRoomsService.getRoom(roomId),
        liveRoomsService.getParticipants(roomId).catch(() => [] as RoomParticipant[]),
        liveRoomsService.getMessages(roomId).catch(() => [] as RoomMessage[]),
      ]);

      setRoom(roomRes || null);
      setParticipants(Array.isArray(participantRes) ? participantRes : []);
      setMessages(Array.isArray(messageRes) ? messageRes : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load room.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = useCallback(async () => {
    if (!roomId) return;
    try {
      setJoining(true);
      await liveRoomsService.joinRoom(roomId);
      await load({ silent: true });
    } catch (err: any) {
      Alert.alert('Join failed', String(err?.response?.data?.error || err?.message || 'Unable to join room.'));
    } finally {
      setJoining(false);
    }
  }, [load, roomId]);

  const handleLeave = useCallback(async () => {
    if (!roomId) return;
    try {
      setLeaving(true);
      await liveRoomsService.leaveRoom(roomId);
      router.back();
    } catch (err: any) {
      Alert.alert('Leave failed', String(err?.response?.data?.error || err?.message || 'Unable to leave room.'));
    } finally {
      setLeaving(false);
    }
  }, [roomId, router]);

  const handleSend = useCallback(async () => {
    const content = String(messageText || '').trim();
    if (!roomId || !content) return;
    try {
      setSending(true);
      const message = await liveRoomsService.sendMessage(roomId, content, 'text');
      setMessages((prev) => [...prev, message].slice(-40));
      setMessageText('');
    } catch (err: any) {
      Alert.alert('Send failed', String(err?.response?.data?.error || err?.message || 'Unable to send message.'));
    } finally {
      setSending(false);
    }
  }, [messageText, roomId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  const privacyPill = pillForPrivacy(room?.privacy);
  const joined = Boolean(room?.is_joined);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 14 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {room?.name || 'Live room'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {room?.subject ? room.subject : 'Study session'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            setRefreshing(true);
            load();
          }}
        >
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Icon name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorTitle}>Unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => load()} variant="outline" />
          </View>
        ) : null}

        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <View style={styles.heroIconBg} />
              <Icon name="videocam" size={22} color={colors.primary[700]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {room?.name || 'Live Study Room'}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {room?.room_type ? room.room_type.replace(/_/g, ' ') : 'study'} · Host {room?.host_name || '—'}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: privacyPill.bg }]}>
              <Text style={[styles.pillText, { color: privacyPill.fg }]}>{privacyPill.label}</Text>
            </View>
          </View>

          <View style={styles.heroGrid}>
            <View style={styles.heroCell}>
              <Text style={styles.heroLabel}>Participants</Text>
              <Text style={styles.heroValue}>
                {Number(room?.current_participants ?? room?.participant_count ?? 0)}
                {room?.max_participants ? ` / ${room.max_participants}` : ''}
              </Text>
            </View>
            <View style={styles.heroCell}>
              <Text style={styles.heroLabel}>Started</Text>
              <Text style={styles.heroValue}>{formatTime(room?.started_at) || '—'}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            {joined ? (
              <Button
                title="Leave room"
                onPress={handleLeave}
                loading={leaving}
                variant="danger"
                icon={<Icon name="log-out" size={18} color={colors.text.inverse} />}
                fullWidth
              />
            ) : (
              <Button
                title="Join room"
                onPress={handleJoin}
                loading={joining}
                variant="primary"
                icon={<Icon name="videocam" size={18} color={colors.text.inverse} />}
                fullWidth
              />
            )}
          </View>
        </Card>

        <Card variant="outlined" padding="md" style={{ marginTop: spacing[4] }}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {participants.length === 0 ? (
            <Text style={styles.sectionEmpty}>No participant list available yet.</Text>
          ) : (
            <View style={styles.participantList}>
              {participants.slice(0, 12).map((p) => (
                <View key={p.id} style={styles.participantRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {String(p.user_name || 'U').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.participantName} numberOfLines={1}>
                    {p.user_name || 'Participant'}
                  </Text>
                  {p.is_host ? (
                    <View style={[styles.pill, { backgroundColor: colors.primary[500] + '14' }]}>
                      <Text style={[styles.pillText, { color: colors.primary[700] }]}>Host</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              {participants.length > 12 ? (
                <Text style={styles.sectionHint}>Showing first 12 of {participants.length}.</Text>
              ) : null}
            </View>
          )}
        </Card>

        <Card variant="outlined" padding="md" style={{ marginTop: spacing[4] }}>
          <Text style={styles.sectionTitle}>Chat</Text>
          {messages.length === 0 ? (
            <Text style={styles.sectionEmpty}>No messages yet. Say hi.</Text>
          ) : (
            <View style={styles.messageList}>
              {messages.slice(-20).map((m) => (
                <View key={m.id} style={styles.messageBubble}>
                  <Text style={styles.messageHeader}>
                    {m.user_name || 'Someone'} · {formatTime(m.created_at) || ''}
                  </Text>
                  <Text style={styles.messageText}>{m.content}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.composerRow}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder={joined ? 'Write a message...' : 'Join the room to chat'}
              placeholderTextColor={colors.text.tertiary}
              editable={joined && !sending}
              style={[styles.composerInput, !joined ? { opacity: 0.7 } : null]}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !(joined && messageText.trim()) ? styles.sendBtnDisabled : null]}
              onPress={handleSend}
              disabled={!joined || sending || !messageText.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Icon name="send" size={18} color={colors.text.inverse} />
              )}
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  errorCard: {
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  errorText: {
    color: colors.text.secondary,
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  heroCard: {
    borderRadius: borderRadius.xl,
    ...shadows.soft,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroIconBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary[500] + '14',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  heroGrid: {
    marginTop: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
  },
  heroCell: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: colors.text.tertiary,
  },
  heroValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  heroActions: {
    marginTop: spacing[4],
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  sectionEmpty: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  sectionHint: {
    marginTop: spacing[3],
    color: colors.text.tertiary,
    fontSize: 12,
  },
  participantList: {
    gap: spacing[2],
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500] + '14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary[700],
  },
  participantName: {
    flex: 1,
    color: colors.text.primary,
    fontWeight: '700',
  },
  messageList: {
    gap: spacing[2],
  },
  messageBubble: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  messageHeader: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  messageText: {
    marginTop: 6,
    color: colors.text.primary,
    lineHeight: 18,
  },
  composerRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
    marginTop: spacing[3],
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing[4],
    color: colors.text.primary,
    backgroundColor: colors.card.light,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    ...shadows.soft,
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
});

