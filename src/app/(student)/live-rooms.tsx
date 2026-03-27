/**
 * Live Study Rooms Screen
 * Student room browser with create, share, copy-link, and quick join flows.
 */

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from '../../components/ui/Icon';
import { liveRoomsService,StudyRoom } from '../../services/live-rooms.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';
import { copyToClipboard,openNativeShareSheet } from '../../utils/share';

type RoomTab = 'browse' | 'my';
type RoomVisibility = StudyRoom['room_type'];

type CreateRoomDraft = {
  name: string;
  description: string;
  room_type: RoomVisibility;
  max_participants: number;
  is_recording_enabled: boolean;
};

const ROOM_VISIBILITY_OPTIONS: { key: RoomVisibility; label: string; helper: string }[] = [
  { key: 'public', label: 'Public', helper: 'Anyone can join with the room link.' },
  { key: 'private', label: 'Private', helper: 'Only invited classmates should join.' },
  { key: 'study_group', label: 'Study Group', helper: 'Best for an existing group session.' },
];

const FILTER_OPTIONS: { key: RoomVisibility | null; label: string }[] = [
  { key: null, label: 'All rooms' },
  { key: 'public', label: 'Public' },
  { key: 'private', label: 'Private' },
  { key: 'study_group', label: 'Study group' },
];

const emptyDraft = (): CreateRoomDraft => ({
  name: '',
  description: '',
  room_type: 'public',
  max_participants: 10,
  is_recording_enabled: false,
});

const getDisplayNameInitials = (value?: string | null) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ST';

const formatRoomType = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'study_group') return 'Study Group';
  if (normalized === 'private') return 'Private';
  return 'Public';
};

const formatParticipantCount = (room: StudyRoom) => {
  const current = Number(room.current_participants ?? room.participant_count ?? 0);
  if (!room.max_participants) {
    return `${current} active`;
  }
  return `${current}/${room.max_participants}`;
};

export default function LiveRoomsScreen() {
  const router = useRouter();

  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<RoomTab>('browse');
  const [selectedFilter, setSelectedFilter] = useState<RoomVisibility | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingRoomId, setOpeningRoomId] = useState<string | null>(null);
  const [sharingRoomId, setSharingRoomId] = useState<string | null>(null);
  const [createRoomData, setCreateRoomData] = useState<CreateRoomDraft>(emptyDraft);

  const loadRooms = useCallback(async () => {
    try {
      const [activeRooms, myRoomsData] = await Promise.all([
        liveRoomsService.getActiveRooms(),
        liveRoomsService.getMyRooms(),
      ]);
      setRooms(Array.isArray(activeRooms) ? activeRooms : []);
      setMyRooms(Array.isArray(myRoomsData) ? myRoomsData : []);
    } catch (error) {
      console.error('Failed to load live rooms:', error);
      Alert.alert(
        'Live rooms',
        'Unable to load live rooms right now. Pull to refresh and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadRooms();
  }, [loadRooms]);

  const getRoomLink = useCallback((room: StudyRoom) => {
    const shareUrl = String(room.share_url || '').trim();
    if (shareUrl) {
      return shareUrl;
    }
    return `campushub://live-room/${room.id}`;
  }, []);

  const handleShareRoom = useCallback(
    async (room: StudyRoom) => {
      const link = getRoomLink(room);
      try {
        setSharingRoomId(room.id);
        await openNativeShareSheet({
          title: room.name,
          message: `Join my CampusHub live study room: ${room.name}\n${link}`,
          url: link,
        });
      } catch (error) {
        Alert.alert('Share room', 'Unable to open the share sheet right now.');
      } finally {
        setSharingRoomId(null);
      }
    },
    [getRoomLink]
  );

  const handleCopyRoomLink = useCallback(
    async (room: StudyRoom) => {
      try {
        await copyToClipboard(getRoomLink(room));
        Alert.alert('Link copied', 'The room link is ready to share with classmates.');
      } catch (_error) {
        Alert.alert('Copy failed', 'Unable to copy the room link right now.');
      }
    },
    [getRoomLink]
  );

  const openRoom = useCallback(
    async (room: StudyRoom) => {
      try {
        setOpeningRoomId(room.id);
        if (!room.is_joined) {
          await liveRoomsService.joinRoom(room.id);
        }
        router.push(`/(student)/live-room/${room.id}` as any);
      } catch (error: any) {
        Alert.alert(
          'Unable to join room',
          error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            'Join failed.'
        );
      } finally {
        setOpeningRoomId(null);
      }
    },
    [router]
  );

  const handleCreateRoom = useCallback(async () => {
    if (!createRoomData.name.trim()) {
      Alert.alert('Room name required', 'Add a room name before creating the session.');
      return;
    }

    try {
      setCreating(true);
      const newRoom = await liveRoomsService.createRoom({
        name: createRoomData.name.trim(),
        description: createRoomData.description.trim(),
        room_type: createRoomData.room_type,
        max_participants: createRoomData.max_participants,
        is_recording_enabled: createRoomData.is_recording_enabled,
        is_screen_share_enabled: true,
      });

      setShowCreateModal(false);
      setCreateRoomData(emptyDraft());
      await loadRooms();

      Alert.alert(
        'Room created',
        'Your room is live. Share the link now so other students can join instantly.',
        [
          {
            text: 'Open room',
            onPress: () => router.push(`/(student)/live-room/${newRoom.id}` as any),
          },
          {
            text: 'Share link',
            onPress: () => void handleShareRoom(newRoom),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Create room failed',
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to create the room right now.'
      );
    } finally {
      setCreating(false);
    }
  }, [createRoomData, handleShareRoom, loadRooms, router]);

  const visibleRooms = useMemo(
    () =>
      selectedFilter
        ? rooms.filter((room) => room.room_type === selectedFilter)
        : rooms,
    [rooms, selectedFilter]
  );

  const activeRooms = activeTab === 'browse' ? visibleRooms : myRooms;

  const renderRoomCard = ({ item }: { item: StudyRoom }) => {
    const isBusy = openingRoomId === item.id;
    const isSharing = sharingRoomId === item.id;
    const isPrivateRoom = item.room_type === 'private' || item.privacy === 'private';
    const subtitle = item.description?.trim() || 'Student-led live study session';

    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => void openRoom(item)}
        activeOpacity={0.92}
      >
        <View style={styles.roomCardTop}>
          <View style={styles.badgeRow}>
            <View style={styles.roomTypeBadge}>
              <Text style={styles.roomTypeText}>{formatRoomType(item.room_type)}</Text>
            </View>
            {item.is_recording ? (
              <View style={styles.recordingBadge}>
                <Text style={styles.recordingText}>Recording</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.roomActionRow}>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() => void handleCopyRoomLink(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="copy" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() => void handleShareRoom(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Icon name="share-social" size={16} color={colors.primary[500]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={styles.roomDescription}>{subtitle}</Text>

        <View style={styles.roomMetaRow}>
          <View style={styles.hostInfo}>
            {item.host_avatar ? (
              <Image source={{ uri: item.host_avatar }} style={styles.hostAvatar} />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                <Text style={styles.hostAvatarText}>
                  {getDisplayNameInitials(item.host_name)}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.hostLabel}>Host</Text>
              <Text style={styles.hostName}>{item.host_name || 'Student host'}</Text>
            </View>
          </View>

          <View style={styles.metaPill}>
            <Icon name="people" size={14} color={colors.text.secondary} />
            <Text style={styles.metaPillText}>{formatParticipantCount(item)}</Text>
          </View>
        </View>

        {isPrivateRoom ? (
          <Text style={styles.privateHint}>Share the room link directly so invited students can join.</Text>
        ) : (
          <Text style={styles.privateHint}>Share the room link to pull classmates in quickly.</Text>
        )}

        <View style={styles.roomFooter}>
          <View style={styles.linkPill}>
            <Icon name="link" size={14} color={colors.primary[600]} />
            <Text style={styles.linkPillText}>Shareable link ready</Text>
          </View>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => void openRoom(item)}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <>
                <Text style={styles.joinButtonText}>{item.is_joined ? 'Open room' : 'Join room'}</Text>
                <Icon name="arrow-forward" size={16} color={colors.text.inverse} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading live rooms...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.topBarCopy}>
          <Text style={styles.topBarTitle}>Live Study Rooms</Text>
          <Text style={styles.topBarSubtitle}>
            Students can create a room, share a link, and classmates can join in real time.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Icon name="add" size={16} color={colors.text.inverse} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' ? styles.activeTab : null]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' ? styles.activeTabText : null]}>
            Browse rooms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' ? styles.activeTab : null]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' ? styles.activeTabText : null]}>
            My rooms
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' ? (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={FILTER_OPTIONS}
            keyExtractor={(item) => item.key || 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === item.key ? styles.filterChipActive : null,
                ]}
                onPress={() => setSelectedFilter(item.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === item.key ? styles.filterChipTextActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      <FlatList
        data={activeRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoomCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon name="videocam" size={28} color={colors.primary[600]} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'browse' ? 'No live rooms yet' : 'You have not joined a room yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'browse'
                ? 'Start a room, copy the join link, and invite classmates into the session.'
                : 'Create your own room or open the browse tab to join an existing one.'}
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.emptyPrimaryButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyPrimaryButtonText}>Create room</Text>
              </TouchableOpacity>
              {activeTab === 'my' ? (
                <TouchableOpacity
                  style={styles.emptySecondaryButton}
                  onPress={() => setActiveTab('browse')}
                >
                  <Text style={styles.emptySecondaryButtonText}>Browse rooms</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        }
      />

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create live room</Text>
            <TouchableOpacity
              onPress={() => void handleCreateRoom()}
              disabled={creating}
            >
              <Text style={styles.modalCreateText}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Room name</Text>
            <TextInput
              value={createRoomData.name}
              onChangeText={(name) => setCreateRoomData((prev) => ({ ...prev, name }))}
              placeholder="e.g. BCSC revision room"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>What is this room for?</Text>
            <TextInput
              value={createRoomData.description}
              onChangeText={(description) =>
                setCreateRoomData((prev) => ({ ...prev, description }))
              }
              placeholder="Add the topic, class, or goal for this session"
              placeholderTextColor={colors.text.tertiary}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Visibility</Text>
            <View style={styles.visibilityList}>
              {ROOM_VISIBILITY_OPTIONS.map((option) => {
                const active = createRoomData.room_type === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.visibilityCard, active ? styles.visibilityCardActive : null]}
                    onPress={() =>
                      setCreateRoomData((prev) => ({
                        ...prev,
                        room_type: option.key,
                      }))
                    }
                  >
                    <View style={styles.visibilityTitleRow}>
                      <Text style={[styles.visibilityTitle, active ? styles.visibilityTitleActive : null]}>
                        {option.label}
                      </Text>
                      {active ? (
                        <Icon name="checkmark-circle" size={18} color={colors.primary[500]} />
                      ) : null}
                    </View>
                    <Text style={styles.visibilityHelper}>{option.helper}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Max participants</Text>
            <View style={styles.capacityRow}>
              {[5, 10, 20, 50].map((count) => {
                const active = createRoomData.max_participants === count;
                return (
                  <TouchableOpacity
                    key={count}
                    style={[styles.capacityChip, active ? styles.capacityChipActive : null]}
                    onPress={() =>
                      setCreateRoomData((prev) => ({
                        ...prev,
                        max_participants: count,
                      }))
                    }
                  >
                    <Text style={[styles.capacityChipText, active ? styles.capacityChipTextActive : null]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.recordingToggle}
              onPress={() =>
                setCreateRoomData((prev) => ({
                  ...prev,
                  is_recording_enabled: !prev.is_recording_enabled,
                }))
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recordingToggleTitle}>Allow recording</Text>
                <Text style={styles.recordingToggleText}>
                  Keep this off unless everyone in the room agrees.
                </Text>
              </View>
              <View
                style={[
                  styles.togglePill,
                  createRoomData.is_recording_enabled ? styles.togglePillActive : null,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    createRoomData.is_recording_enabled ? styles.toggleKnobActive : null,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    backgroundColor: colors.card.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.sm,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  topBarCopy: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text.primary,
  },
  topBarSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
    marginTop: 2,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontWeight: '800',
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[3],
    padding: 4,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.gray[100],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  activeTab: {
    backgroundColor: colors.card.light,
    ...shadows.xs,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.primary,
  },
  filterContainer: {
    marginBottom: spacing[2],
  },
  filterList: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
  },
  roomCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  roomCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    flex: 1,
  },
  roomTypeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary[50],
  },
  roomTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary[700],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  recordingBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.warning + '1A',
  },
  recordingText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  roomActionRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginLeft: spacing[3],
  },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  roomName: {
    marginTop: spacing[3],
    fontSize: 17,
    fontWeight: '900',
    color: colors.text.primary,
  },
  roomDescription: {
    marginTop: spacing[2],
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  roomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  hostAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  hostAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
  },
  hostAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text.inverse,
  },
  hostLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  hostName: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: colors.background.secondary,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  privateHint: {
    marginTop: spacing[3],
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  linkPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[600],
  },
  joinButton: {
    minWidth: 114,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
  },
  joinButtonText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[5],
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
  },
  emptyTitle: {
    marginTop: spacing[4],
    fontSize: 18,
    fontWeight: '900',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing[2],
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyActions: {
    width: '100%',
    marginTop: spacing[5],
    gap: spacing[3],
  },
  emptyPrimaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary[500],
  },
  emptyPrimaryButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySecondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.card.light,
  },
  emptySecondaryButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.card.light,
  },
  modalCancelText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text.primary,
  },
  modalCreateText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary[600],
  },
  modalContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  input: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.card.light,
    color: colors.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  visibilityList: {
    gap: spacing[3],
  },
  visibilityCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[4],
  },
  visibilityCardActive: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  visibilityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text.primary,
  },
  visibilityTitleActive: {
    color: colors.primary[700],
  },
  visibilityHelper: {
    marginTop: spacing[2],
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  capacityChip: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: 999,
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  capacityChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  capacityChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.primary,
  },
  capacityChipTextActive: {
    color: colors.text.inverse,
  },
  recordingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[5],
    padding: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  recordingToggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  recordingToggleText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  togglePill: {
    width: 54,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    padding: 4,
    justifyContent: 'center',
  },
  togglePillActive: {
    backgroundColor: colors.primary[500] + '66',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card.light,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary[600],
  },
});
