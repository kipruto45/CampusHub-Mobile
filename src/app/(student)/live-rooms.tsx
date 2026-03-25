/**
 * Live Study Rooms Screen
 * Browse and join live video study sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { liveRoomsService, StudyRoom } from '../../services/live-rooms.service';

type CreateRoomType = StudyRoom['room_type'];
type CreateRoomPrivacy = 'public' | 'private';

type CreateRoomDraft = {
  name: string;
  description: string;
  subject: string;
  room_type: CreateRoomType;
  privacy: CreateRoomPrivacy;
  max_participants: number;
};

export default function LiveRoomsScreen() {
  const router = useRouter();
  
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'my'>('browse');
  const [selectedFilter, setSelectedFilter] = useState<CreateRoomType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRoomData, setCreateRoomData] = useState<CreateRoomDraft>({
    name: '',
    description: '',
    subject: '',
    room_type: 'study',
    privacy: 'public',
    max_participants: 10,
  });

  const loadRooms = useCallback(async () => {
    try {
      const activeRooms = await liveRoomsService.getActiveRooms();
      setRooms(activeRooms);
      
      const myRoomsData = await liveRoomsService.getMyRooms();
      setMyRooms(myRoomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRooms();
  }, [loadRooms]);

  const handleJoinRoom = async (room: StudyRoom) => {
    try {
      await liveRoomsService.joinRoom(room.id);
      router.push(`/(student)/live-room/${room.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to join room');
    }
  };

  const handleCreateRoom = async () => {
    if (!createRoomData.name.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    try {
      const newRoom = await liveRoomsService.createRoom(createRoomData);
      setShowCreateModal(false);
      setCreateRoomData({
        name: '',
        description: '',
        subject: '',
        room_type: 'study',
        privacy: 'public',
        max_participants: 10,
      });
      router.push(`/(student)/live-room/${newRoom.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create room');
    }
  };

  const filteredRooms = selectedFilter
    ? rooms.filter(room => room.room_type === selectedFilter)
    : rooms;

  const renderRoomCard = ({ item }: { item: StudyRoom }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => handleJoinRoom(item)}
      activeOpacity={0.7}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTypeBadge}>
          <Text style={styles.roomTypeText}>
            {item.room_type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {item.is_recording && (
          <View style={styles.recordingBadge}>
            <Text style={styles.recordingText}>● REC</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.roomName}>{item.name}</Text>
      {item.subject && (
        <Text style={styles.roomSubject}>{item.subject}</Text>
      )}
      
      <View style={styles.roomInfo}>
        <View style={styles.hostInfo}>
          {item.host_avatar ? (
            <Image source={{ uri: item.host_avatar }} style={styles.hostAvatar} />
          ) : (
            <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]}>
              <Text style={styles.hostAvatarText}>
                {item.host_name?.charAt(0) || 'H'}
              </Text>
            </View>
          )}
          <Text style={styles.hostName}>{item.host_name}</Text>
        </View>
        
        <View style={styles.participantCount}>
          <Text style={styles.participantText}>
            👥 {item.current_participants}
            {item.max_participants ? `/${item.max_participants}` : ''}
          </Text>
        </View>
      </View>
      
      {item.privacy === 'private' && (
        <View style={styles.privateBadge}>
          <Text style={styles.privateText}>🔒 Private</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const roomTypes = [
    { key: null, label: 'All' },
    { key: 'study', label: 'Study' },
    { key: 'tutoring', label: 'Tutoring' },
    { key: 'group_project', label: 'Group' },
    { key: 'exam_prep', label: 'Exam Prep' },
  ] satisfies Array<{ key: CreateRoomType | null; label: string }>;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Study Rooms</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse Rooms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Rooms
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={roomTypes}
            keyExtractor={(item) => item.key || 'all'}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === item.key && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(item.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === item.key && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={activeTab === 'browse' ? filteredRooms : myRooms}
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
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'browse' ? 'No Active Rooms' : 'No Rooms Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'browse'
                ? 'There are no active study rooms right now. Create one to get started!'
                : 'You haven\'t joined any study rooms yet.'}
            </Text>
            {activeTab === 'my' && (
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => setActiveTab('browse')}
              >
                <Text style={styles.exploreButtonText}>Explore Rooms</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Room</Text>
            <TouchableOpacity onPress={handleCreateRoom}>
              <Text style={styles.createText}>Create</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Room Name *</Text>
            <TextInput
              style={styles.input}
              value={createRoomData.name}
              onChangeText={(text) => setCreateRoomData({ ...createRoomData, name: text })}
              placeholder="e.g., Math Study Group"
              placeholderTextColor={colors.text.secondary}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={createRoomData.description}
              onChangeText={(text) => setCreateRoomData({ ...createRoomData, description: text })}
              placeholder="What will you be studying?"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={createRoomData.subject}
              onChangeText={(text) => setCreateRoomData({ ...createRoomData, subject: text })}
              placeholder="e.g., Calculus, Physics"
              placeholderTextColor={colors.text.secondary}
            />

            <Text style={styles.inputLabel}>Room Type</Text>
            <View style={styles.typeContainer}>
              {roomTypes.slice(1).map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeOption,
                    createRoomData.room_type === type.key && styles.typeOptionActive,
                  ]}
                  onPress={() => setCreateRoomData({
                    ...createRoomData,
                    room_type: type.key as CreateRoomType,
                  })}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      createRoomData.room_type === type.key && styles.typeOptionTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Privacy</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  createRoomData.privacy === 'public' && styles.typeOptionActive,
                ]}
                onPress={() => setCreateRoomData({ ...createRoomData, privacy: 'public' })}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    createRoomData.privacy === 'public' && styles.typeOptionTextActive,
                  ]}
                >
                  🌎 Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  createRoomData.privacy === 'private' && styles.typeOptionActive,
                ]}
                onPress={() => setCreateRoomData({ ...createRoomData, privacy: 'private' })}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    createRoomData.privacy === 'private' && styles.typeOptionTextActive,
                  ]}
                >
                  🔒 Private
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Max Participants</Text>
            <View style={styles.participantsRow}>
              {[5, 10, 20, 50].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.participantOption,
                    createRoomData.max_participants === num && styles.typeOptionActive,
                  ]}
                  onPress={() => setCreateRoomData({ ...createRoomData, max_participants: num })}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      createRoomData.max_participants === num && styles.typeOptionTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

type LiveRoomsStyles = {
  container: ViewStyle;
  loadingContainer: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  createButton: ViewStyle;
  createButtonText: TextStyle;
  tabContainer: ViewStyle;
  tab: ViewStyle;
  activeTab: ViewStyle;
  tabText: TextStyle;
  activeTabText: TextStyle;
  filterContainer: ViewStyle;
  filterList: ViewStyle;
  filterChip: ViewStyle;
  filterChipActive: ViewStyle;
  filterChipText: TextStyle;
  filterChipTextActive: TextStyle;
  listContent: ViewStyle;
  roomCard: ViewStyle;
  roomHeader: ViewStyle;
  roomTypeBadge: ViewStyle;
  roomTypeText: TextStyle;
  recordingBadge: ViewStyle;
  recordingText: TextStyle;
  roomName: TextStyle;
  roomSubject: TextStyle;
  roomInfo: ViewStyle;
  hostInfo: ViewStyle;
  hostAvatar: ImageStyle;
  hostAvatarPlaceholder: ViewStyle;
  hostAvatarText: TextStyle;
  hostName: TextStyle;
  participantCount: ViewStyle;
  participantText: TextStyle;
  privateBadge: ViewStyle;
  privateText: TextStyle;
  emptyContainer: ViewStyle;
  emptyIcon: TextStyle;
  emptyTitle: TextStyle;
  emptyText: TextStyle;
  exploreButton: ViewStyle;
  exploreButtonText: TextStyle;
  modalContainer: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  cancelText: TextStyle;
  createText: TextStyle;
  modalContent: ViewStyle;
  inputLabel: TextStyle;
  input: TextStyle;
  textArea: TextStyle;
  typeContainer: ViewStyle;
  typeOption: ViewStyle;
  typeOptionActive: ViewStyle;
  typeOptionText: TextStyle;
  typeOptionTextActive: TextStyle;
  participantsRow: ViewStyle;
  participantOption: ViewStyle;
};

const styles = StyleSheet.create<LiveRoomsStyles>({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  createButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text.inverse,
  },
  filterContainer: {
    marginBottom: spacing[2],
  },
  filterList: {
    paddingHorizontal: spacing[4],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
    marginRight: spacing[2],
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
  },
  filterChipText: {
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    padding: spacing[4],
    paddingTop: 0,
  },
  roomCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  roomTypeBadge: {
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  roomTypeText: {
    color: colors.primary[500],
    fontSize: 10,
    fontWeight: '700',
  },
  recordingBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  recordingText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
  },
  roomName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  roomSubject: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  roomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: spacing[2],
  },
  hostAvatarPlaceholder: {
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  hostName: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  participantCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  privateBadge: {
    marginTop: spacing[2],
  },
  privateText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  exploreButton: {
    marginTop: spacing[4],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  exploreButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cancelText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  createText: {
    color: colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: spacing[4],
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  input: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  typeOptionActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  typeOptionText: {
    color: colors.text.secondary,
    fontWeight: '500',
  },
  typeOptionTextActive: {
    color: colors.text.inverse,
  },
  participantsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantOption: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginHorizontal: spacing[1],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
});
