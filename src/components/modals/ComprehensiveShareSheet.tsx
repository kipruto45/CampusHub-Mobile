// Comprehensive Share Bottom Sheet for CampusHub
// Includes: Copy Link, Native Share, Send to Student, Share to Study Group

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';
import {
  resourcesService,
  StudentSearchResult,
  StudyGroupInfo,
} from '../../services/resources.service';
import { copyToClipboard, openNativeShareSheet } from '../../utils/share';

type ShareableResource = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  resource_type?: string;
  course?: { name: string; code?: string };
};

type Props = {
  visible: boolean;
  onClose: () => void;
  resource: ShareableResource | null;
  onCopyLink?: () => Promise<boolean> | boolean;
  onNativeShare?: () => Promise<boolean> | boolean;
  loading?: boolean;
};

type ActionConfig = {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  showArrow?: boolean;
};

type ShareMode = 'main' | 'students' | 'groups';

const ResourceShareSheet: React.FC<Props> = ({
  visible,
  onClose,
  resource,
  loading: externalLoading,
}) => {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ShareMode>('main');
  const [loading, setLoading] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [students, setStudents] = useState<StudentSearchResult[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [groups, setGroups] = useState<StudyGroupInfo[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroupInfo | null>(null);
  const [message, setMessage] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setMode('main');
      setStudentQuery('');
      setStudents([]);
      setSelectedStudent(null);
      setSelectedGroup(null);
      setMessage('');
    }
  }, [visible]);

  // Load study groups when entering groups mode
  useEffect(() => {
    if (mode === 'groups' && visible && groups.length === 0) {
      loadGroups();
    }
  }, [mode, visible]);

  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      const userGroups = await resourcesService.getUserStudyGroups();
      setGroups(userGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setGroupsLoading(false);
    }
  };

  const searchStudents = async (query: string) => {
    if (query.length < 2) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    try {
      const results = await resourcesService.searchStudents(query);
      setStudents(results);
    } catch (error) {
      console.error('Failed to search students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleCopyLink = useCallback(async () => {
    if (!resource?.id) return;
    setLoading(true);
    try {
      const payload = await resourcesService.getResourceShareLink(resource.id);
      await copyToClipboard(payload.share_url);
      await resourcesService.recordResourceShare(resource.id, 'copy_link');
    } catch (error) {
      console.error('Failed to copy link:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  }, [resource, onClose]);

  const handleNativeShare = useCallback(async () => {
    if (!resource?.id) return;
    setLoading(true);
    try {
      const payload = await resourcesService.getResourceShareLink(resource.id);
      const shared = await openNativeShareSheet({
        title: payload.title,
        message: payload.share_message,
        url: payload.share_url,
      });
      if (shared) {
        await resourcesService.recordResourceShare(resource.id, 'native_share');
      }
    } catch (error) {
      console.error('Failed to native share:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  }, [resource, onClose]);

  const handleSendToStudent = useCallback(async () => {
    if (!resource?.id || !selectedStudent) return;
    setLoading(true);
    try {
      await resourcesService.shareToStudent(
        resource.id,
        selectedStudent.id,
        message || undefined
      );
      await resourcesService.recordResourceShare(resource.id, 'send_to_student');
    } catch (error) {
      console.error('Failed to send to student:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  }, [resource, selectedStudent, message, onClose]);

  const handleShareToGroup = useCallback(async () => {
    if (!resource?.id || !selectedGroup) return;
    setLoading(true);
    try {
      await resourcesService.shareToGroup(
        resource.id,
        selectedGroup.id,
        message || undefined
      );
      await resourcesService.recordResourceShare(resource.id, 'share_to_group');
    } catch (error) {
      console.error('Failed to share to group:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  }, [resource, selectedGroup, message, onClose]);

  const mainActions: ActionConfig[] = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: 'clipboard',
      onPress: handleCopyLink,
    },
    {
      id: 'share',
      label: 'Share via Device',
      icon: 'share-social',
      onPress: handleNativeShare,
    },
    {
      id: 'student',
      label: 'Send to Student',
      icon: 'person-add',
      onPress: () => setMode('students'),
      showArrow: true,
    },
    {
      id: 'group',
      label: 'Share to Study Group',
      icon: 'people',
      onPress: () => setMode('groups'),
      showArrow: true,
    },
  ];

  const renderResourcePreview = () => (
    <View style={styles.previewCard}>
      {resource?.thumbnail && (
        <Image source={{ uri: resource.thumbnail }} style={styles.previewImage} />
      )}
      <View style={styles.previewContent}>
        <Text style={styles.previewTitle} numberOfLines={2}>
          {resource?.title}
        </Text>
        {resource?.course && (
          <Text style={styles.previewSubtitle}>{resource.course.name}</Text>
        )}
      </View>
    </View>
  );

  const renderMainMode = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {renderResourcePreview()}
      
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Share Options</Text>
        {mainActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionRow}
            onPress={action.onPress}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Icon
                name={action.icon as any}
                size={20}
                color={colors.success}
              />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            {action.showArrow && (
              <Icon
                name="chevron-forward"
                size={20}
                color={colors.text.tertiary}
                style={styles.actionArrow}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStudentMode = () => (
    <View style={styles.internalShareContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('main')}>
        <Icon name="arrow-back" size={20} color={colors.text.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {renderResourcePreview()}

      {!selectedStudent ? (
        <>
          <Text style={styles.searchLabel}>Search for a student</Text>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter student name or username..."
              placeholderTextColor={colors.text.tertiary}
              value={studentQuery}
              onChangeText={(text) => {
                setStudentQuery(text);
                searchStudents(text);
              }}
              autoCapitalize="none"
            />
          </View>

          {studentsLoading ? (
            <ActivityIndicator size="small" color={colors.success} style={styles.loader} />
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.id.toString()}
              style={styles.listContainer}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.studentItem}
                  onPress={() => setSelectedStudent(item)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.full_name?.[0] || item.username[0]}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.full_name || item.username}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                studentQuery.length >= 2 ? (
                  <Text style={styles.emptyText}>No students found</Text>
                ) : null
              }
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.selectedLabel}>Selected:</Text>
          <View style={styles.selectedItem}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {selectedStudent.full_name?.[0] || selectedStudent.username[0]}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>
                {selectedStudent.full_name || selectedStudent.username}
              </Text>
              <Text style={styles.studentEmail}>{selectedStudent.email}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedStudent(null)}>
              <Icon name="close-circle" size={24} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.messageInput}
            placeholder="Add a message (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendToStudent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <>
                <Icon name="send" size={20} color={colors.text.inverse} />
                <Text style={styles.sendButtonText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderGroupMode = () => (
    <View style={styles.internalShareContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('main')}>
        <Icon name="arrow-back" size={20} color={colors.text.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {renderResourcePreview()}

      {!selectedGroup ? (
        <>
          <Text style={styles.searchLabel}>Select a Study Group</Text>

          {groupsLoading ? (
            <ActivityIndicator size="small" color={colors.success} style={styles.loader} />
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id.toString()}
              style={styles.listContainer}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.groupItem}
                  onPress={() => setSelectedGroup(item)}
                >
                  <View style={styles.groupIcon}>
                    <Icon name="people" size={24} color={colors.success} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{item.name}</Text>
                    <Text style={styles.groupMeta}>
                      {item.member_count} members
                      {item.course_name ? ` • ${item.course_name}` : ''}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No study groups found</Text>
              }
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.selectedLabel}>Selected:</Text>
          <View style={styles.selectedItem}>
            <View style={styles.groupIcon}>
              <Icon name="people" size={24} color={colors.success} />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{selectedGroup.name}</Text>
              <Text style={styles.groupMeta}>
                {selectedGroup.member_count} members
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedGroup(null)}>
              <Icon name="close-circle" size={24} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.messageInput}
            placeholder="Add a message (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleShareToGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <>
                <Icon name="send" size={20} color={colors.text.inverse} />
                <Text style={styles.sendButtonText}>Share to Group</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Share Resource"
      height={mode === 'main' ? 480 : 550}
      showCloseButton
    >
      {mode === 'main' && renderMainMode()}
      {mode === 'students' && renderStudentMode()}
      {mode === 'groups' && renderGroupMode()}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[200],
  },
  previewContent: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  actionsContainer: {
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  actionRow: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.card.light,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actionArrow: {
    marginLeft: 'auto',
  },
  internalShareContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  backText: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  loader: {
    marginTop: spacing[4],
  },
  listContainer: {
    flex: 1,
    marginTop: spacing[3],
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  studentEmail: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing[3],
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  groupMeta: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  messageInput: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: 15,
    color: colors.text.primary,
    marginTop: spacing[4],
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    marginTop: spacing[4],
    gap: spacing[2],
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginTop: spacing[4],
    fontSize: 14,
  },
});

export default ResourceShareSheet;
