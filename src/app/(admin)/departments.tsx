// Admin Departments Screen for CampusHub
// Manage departments within faculties

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import api from '../../services/api';

interface Department {
  id: string;
  name: string;
  code: string;
  faculty: { id: string; name: string };
  description?: string;
  is_active: boolean;
  course_count?: number;
  created_at: string;
}

const DepartmentsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', faculty: '', description: '' });

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) setError(null);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedFaculty) params.faculty = selectedFaculty;
      const [deptsRes, facultiesRes] = await Promise.all([
        api.get('/faculties/departments/', { params }),
        api.get('/faculties/'),
      ]);
      setDepartments(deptsRes.data?.results || deptsRes.data || []);
      setFaculties(facultiesRes.data?.results || facultiesRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedFaculty]);

  useEffect(() => { fetchData(true); }, [searchQuery, selectedFaculty]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  const handleCreate = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', faculty: '', description: '' });
    setModalVisible(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      faculty: dept.faculty?.id || '',
      description: dept.description || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, faculty: formData.faculty || undefined };
      if (editingDept) {
        await api.patch(`/faculties/departments/${editingDept.id}/`, payload);
        Alert.alert('Success', 'Department updated successfully');
      } else {
        await api.post('/faculties/departments/', payload);
        Alert.alert('Success', 'Department created successfully');
      }
      setModalVisible(false);
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Department', 'Are you sure? This may affect related courses.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/faculties/departments/${id}/`);
          Alert.alert('Success', 'Department deleted');
          fetchData(true);
        } catch (err) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Department }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.code}>{item.code}</Text>
        {item.faculty && <Text style={styles.faculty}>{item.faculty.name}</Text>}
        <View style={styles.badges}>
          {item.course_count !== undefined && (
            <View style={styles.badge}><Text style={styles.badgeText}>{item.course_count} courses</Text></View>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(item)}><Icon name={'pencil'} size={18} color={colors.info} /></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}><Icon name={'trash'} size={18} color={colors.error} /></TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  if (error && !departments.length) return <ErrorState type="server" title="Failed" message={error} onRetry={() => fetchData(true)} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.title}>Departments</Text>
        <TouchableOpacity onPress={handleCreate}><Icon name={'add'} size={24} color={colors.text.inverse} /></TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Icon name={'search'} size={20} color={colors.text.tertiary} />
          <TextInput style={styles.searchInput} placeholder="Search departments..." placeholderTextColor={colors.text.tertiary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.statsRow}><Text style={styles.statsText}>{departments.length} Departments</Text></View>

      <FlatList data={departments} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}
        ListEmptyComponent={<View style={styles.empty}><Icon name={'folder'} size={48} color={colors.text.tertiary} /><Text style={styles.emptyText}>No departments</Text></View>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingDept ? 'Edit' : 'Create'} Department</Text>
              <TextInput style={styles.input} placeholder="Department Name" placeholderTextColor={colors.text.tertiary} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
              <TextInput style={styles.input} placeholder="Department Code" placeholderTextColor={colors.text.tertiary} value={formData.code} onChangeText={(t) => setFormData({ ...formData, code: t })} />
              <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={colors.text.tertiary} value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} multiline />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
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
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text.inverse },
  filterContainer: { padding: spacing[4], backgroundColor: colors.background.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  searchInput: { flex: 1, marginLeft: spacing[2], fontSize: 16, color: colors.text.primary },
  statsRow: { padding: spacing[4], paddingTop: spacing[2] },
  statsText: { fontSize: 14, color: colors.text.secondary },
  list: { padding: spacing[4], paddingTop: 0 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  code: { fontSize: 14, color: colors.primary[500], marginTop: 2 },
  faculty: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 2, backgroundColor: colors.background.secondary, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 11, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: spacing[2] },
  empty: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyText: { fontSize: 16, color: colors.text.tertiary, marginTop: spacing[2] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flex: 1 },
  modalContent: { backgroundColor: colors.card.light, margin: spacing[4], marginTop: spacing[10], borderRadius: borderRadius.xl, padding: spacing[6] },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: spacing[4], textAlign: 'center' },
  input: { backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing[4], fontSize: 16, color: colors.text.primary, marginBottom: spacing[3] },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  btn: { flex: 1, paddingVertical: spacing[3], borderRadius: borderRadius.lg, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.background.secondary },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  saveBtn: { backgroundColor: colors.primary[500] },
  saveText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default DepartmentsScreen;
