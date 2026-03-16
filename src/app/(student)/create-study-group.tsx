import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Icon from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { coursesAPI, studyGroupsAPI } from '../../services/api';

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

const CreateStudyGroupScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await coursesAPI.list();
        const payload = response.data.data;
        setCourses(payload?.results || payload?.courses || []);
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setCoursesLoading(false);
      }
    };

    loadCourses();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Name and description are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await studyGroupsAPI.create({
        name: name.trim(),
        description: description.trim(),
        course_id: selectedCourseId || undefined,
        is_public: isPublic,
        max_members: Number(maxMembers) || 10,
      });
      const group = response.data.data;
      Alert.alert('Study group created', 'Your study group is ready.', [
        {
          text: 'Open',
          onPress: () => router.replace(`/(student)/study-group/${group.id}` as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Creation failed',
        error?.response?.data?.message || error?.response?.data?.error?.message || 'Failed to create study group.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Study Group</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Data Structures Circle"
            placeholderTextColor={colors.text.tertiary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What is this group for?"
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Course</Text>
          {coursesLoading ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <View style={styles.courseList}>
              <TouchableOpacity
                style={[styles.courseChip, !selectedCourseId && styles.courseChipActive]}
                onPress={() => setSelectedCourseId('')}
              >
                <Text style={[styles.courseChipText, !selectedCourseId && styles.courseChipTextActive]}>
                  General
                </Text>
              </TouchableOpacity>
              {courses.slice(0, 8).map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseChip,
                    selectedCourseId === course.id && styles.courseChipActive,
                  ]}
                  onPress={() => setSelectedCourseId(course.id)}
                >
                  <Text
                    style={[
                      styles.courseChipText,
                      selectedCourseId === course.id && styles.courseChipTextActive,
                    ]}
                  >
                    {course.code || course.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Maximum Members</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            placeholderTextColor={colors.text.tertiary}
            value={maxMembers}
            onChangeText={setMaxMembers}
            keyboardType="number-pad"
          />

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Public Group</Text>
              <Text style={styles.helperText}>
                Public groups are visible to other students.
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ true: colors.primary[500] }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Icon name="people" size={18} color={colors.text.inverse} />
              <Text style={styles.submitButtonText}>Create Group</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  backButton: { padding: spacing[2] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  input: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  courseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  courseChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  courseChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  courseChipText: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },
  courseChipTextActive: { color: colors.text.inverse },
  toggleRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: { marginTop: spacing[1], fontSize: 12, color: colors.text.secondary },
  submitButton: {
    marginTop: spacing[5],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: colors.text.inverse, fontSize: 15, fontWeight: '700' },
});

export default CreateStudyGroupScreen;
