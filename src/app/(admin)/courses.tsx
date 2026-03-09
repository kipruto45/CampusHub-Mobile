// Admin Courses Management for CampusHub
// Manage academic courses

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import api from '../../services/api';

interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: {
    id: string;
    name: string;
  };
  faculty?: {
    id: string;
    name: string;
  };
  duration?: string;
  is_active: boolean;
  created_at: string;
}

const CoursesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    duration: '',
  });

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) setError(null);
      
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedFaculty) params.faculty = selectedFaculty;

      const [coursesRes, facultiesRes, deptsRes] = await Promise.all([
        api.get('/faculties/courses/', { params }),
        api.get('/faculties/'),
        api.get('/faculties/departments/'),
      ]);
      
      setCourses(coursesRes.data?.results || coursesRes.data || []);
      setFaculties(facultiesRes.data?.results || facultiesRes.data || []);
      setDepartments(deptsRes.data?.results || deptsRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedFaculty]);

  useEffect(() => {
    fetchData(true);
  }, [searchQuery, selectedFaculty]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleCreate = () => {
    setEditingCourse(null);
    setFormData({ name: '', code: '', description: '', department: '', duration: '' });
    setModalVisible(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      description: course.description || '',
      department: course.department?.id || '',
      duration: course.duration || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, department: formData.department || undefined };
      if (editingCourse) {
        await api.patch(`/faculties/courses/${editingCourse.id}/`, payload);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        await api.post('/faculties/courses/', payload);
        Alert.alert('Success', 'Course created successfully');
      }
      setModalVisible(false);
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save course');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This may affect related units.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/faculties/courses/${id}/`);
              Alert.alert('Success', 'Course deleted');
              fetchData(true);
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const filteredCourses = courses;

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseName}>{item.name}</Text>
        <Text style={styles.courseCode}>{item.code}</Text>
        {item.department && (
          <Text style={styles.courseMeta}>{item.department.name}</Text>
        )}
        {item.duration && (
          <Text style={styles.courseMeta}>Duration: {item.duration}</Text>
        )}
      </View>
      <View style={styles.courseActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Icon name={'pencil'} size={18} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Icon name={'trash'} size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !courses.length) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={() => fetchData(true)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name={'arrow-back'} size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Courses</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Icon name={'add'} size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Icon name={'search'} size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Faculty Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedFaculty && styles.filterChipActive]}
            onPress={() => setSelectedFaculty(null)}
          >
            <Text style={[styles.filterChipText, !selectedFaculty && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {faculties.map((faculty) => (
            <TouchableOpacity
              key={faculty.id}
              style={[styles.filterChip, selectedFaculty === faculty.id && styles.filterChipActive]}
              onPress={() => setSelectedFaculty(faculty.id)}
            >
              <Text style={[styles.filterChipText, selectedFaculty === faculty.id && styles.filterChipTextActive]}>
                {faculty.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{filteredCourses.length} Courses</Text>
      </View>

      {/* Course List */}
      <FlatList
        data={filteredCourses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name={'book'} size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingCourse ? 'Edit' : 'Create'} Course
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Course Name"
                placeholderTextColor={colors.text.tertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Course Code"
                placeholderTextColor={colors.text.tertiary}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={colors.text.tertiary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Duration (e.g., 4 years)"
                placeholderTextColor={colors.text.tertiary}
                value={formData.duration}
                onChangeText={(text) => setFormData({ ...formData, duration: text })}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500],
  },
  backButton: { padding: spacing[1] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text.inverse },
  addButton: { padding: spacing[1] },
  filterContainer: { padding: spacing[4], backgroundColor: colors.background.primary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2],
  },
  searchInput: { flex: 1, marginLeft: spacing[2], fontSize: 16, color: colors.text.primary },
  filterScroll: { marginTop: spacing[3] },
  filterChip: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary, marginRight: spacing[2],
  },
  filterChipActive: { backgroundColor: colors.primary[500] },
  filterChipText: { fontSize: 14, color: colors.text.secondary },
  filterChipTextActive: { color: colors.text.inverse },
  statsRow: { padding: spacing[4], paddingTop: spacing[2] },
  statsText: { fontSize: 14, color: colors.text.secondary },
  listContent: { padding: spacing[4], paddingTop: 0 },
  courseCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm,
  },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  courseCode: { fontSize: 14, color: colors.primary[500], marginTop: 2 },
  courseMeta: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  courseActions: { flexDirection: 'row', gap: spacing[2] },
  actionBtn: { padding: spacing[2] },
  emptyState: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyText: { fontSize: 16, color: colors.text.tertiary, marginTop: spacing[2] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flex: 1 },
  modalContent: {
    backgroundColor: colors.card.light, margin: spacing[4], marginTop: spacing[10],
    borderRadius: borderRadius.xl, padding: spacing[6],
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: spacing[4], textAlign: 'center' },
  input: {
    backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg,
    padding: spacing[4], fontSize: 16, color: colors.text.primary, marginBottom: spacing[3],
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  modalButton: { flex: 1, paddingVertical: spacing[3], borderRadius: borderRadius.lg, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.background.secondary },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  saveButton: { backgroundColor: colors.primary[500] },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default CoursesScreen;
