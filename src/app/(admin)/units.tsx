// Admin Units Management for CampusHub
// Manage academic units

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import api from '../../services/api';

interface Unit {
  id: string;
  name: string;
  code: string;
  course?: { id: string; name: string };
  department?: { id: string; name: string };
  semester?: number;
  year_of_study?: number;
  is_active: boolean;
  created_at: string;
}

const UnitsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', course: '', semester: '', year: '' });

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) setError(null);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCourse) params.course = selectedCourse;
      const [unitsRes, coursesRes] = await Promise.all([
        api.get('/faculties/units/', { params }),
        api.get('/faculties/courses/'),
      ]);
      setUnits(unitsRes.data?.results || unitsRes.data || []);
      setCourses(coursesRes.data?.results || coursesRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch units:', err);
      setError(err.response?.data?.message || 'Failed to load units');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCourse]);

  useEffect(() => { fetchData(true); }, [searchQuery, selectedCourse]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  const handleCreate = () => {
    setEditingUnit(null);
    setFormData({ name: '', code: '', course: '', semester: '', year: '' });
    setModalVisible(true);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      code: unit.code,
      course: unit.course?.id || '',
      semester: unit.semester?.toString() || '',
      year: unit.year_of_study?.toString() || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        semester: formData.semester ? parseInt(formData.semester) : undefined,
        year_of_study: formData.year ? parseInt(formData.year) : undefined,
        course: formData.course || undefined,
      };
      if (editingUnit) {
        await api.patch(`/faculties/units/${editingUnit.id}/`, payload);
        Alert.alert('Success', 'Unit updated');
      } else {
        await api.post('/faculties/units/', payload);
        Alert.alert('Success', 'Unit created');
      }
      setModalVisible(false);
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save unit');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Unit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/faculties/units/${id}/`);
          Alert.alert('Success', 'Unit deleted');
          fetchData(true);
        } catch (err) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Unit }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.code}>{item.code}</Text>
        {item.course && <Text style={styles.meta}>{item.course.name}</Text>}
        <View style={styles.badges}>
          {item.semester && <View style={styles.badge}><Text style={styles.badgeText}>Sem {item.semester}</Text></View>}
          {item.year_of_study && <View style={styles.badge}><Text style={styles.badgeText}>Year {item.year_of_study}</Text></View>}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(item)}><Icon name={'pencil'} size={18} color={colors.info} /></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}><Icon name={'trash'} size={18} color={colors.error} /></TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  if (error && !units.length) return <ErrorState type="server" title="Failed" message={error} onRetry={() => fetchData(true)} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.title}>Units</Text>
        <TouchableOpacity onPress={handleCreate}><Icon name={'add'} size={24} color={colors.text.inverse} /></TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Icon name={'search'} size={20} color={colors.text.tertiary} />
          <TextInput style={styles.searchInput} placeholder="Search units..." placeholderTextColor={colors.text.tertiary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <Text style={styles.stats}>{units.length} Units</Text>

      <FlatList data={units} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}
        ListEmptyComponent={<View style={styles.empty}><Icon name={'bookmark'} size={48} color={colors.text.tertiary} /><Text style={styles.emptyText}>No units</Text></View>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingUnit ? 'Edit' : 'Create'} Unit</Text>
              <TextInput style={styles.input} placeholder="Unit Name" placeholderTextColor={colors.text.tertiary} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
              <TextInput style={styles.input} placeholder="Unit Code" placeholderTextColor={colors.text.tertiary} value={formData.code} onChangeText={(t) => setFormData({ ...formData, code: t })} />
              <TextInput style={styles.input} placeholder="Semester (1-8)" placeholderTextColor={colors.text.tertiary} value={formData.semester} onChangeText={(t) => setFormData({ ...formData, semester: t })} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Year of Study (1-5)" placeholderTextColor={colors.text.tertiary} value={formData.year} onChangeText={(t) => setFormData({ ...formData, year: t })} keyboardType="numeric" />
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
  stats: { padding: spacing[4], paddingTop: spacing[2], fontSize: 14, color: colors.text.secondary },
  list: { padding: spacing[4], paddingTop: 0 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card.light, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3], ...shadows.sm },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  code: { fontSize: 14, color: colors.primary[500], marginTop: 2 },
  meta: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
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
  modalActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  btn: { flex: 1, paddingVertical: spacing[3], borderRadius: borderRadius.lg, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.background.secondary },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  saveBtn: { backgroundColor: colors.primary[500] },
  saveText: { fontSize: 16, fontWeight: '600', color: colors.text.inverse },
});

export default UnitsScreen;
