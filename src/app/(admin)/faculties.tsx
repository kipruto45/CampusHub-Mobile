// Admin Faculties Management for CampusHub
// Manage academic structure (faculties, departments, courses, units)

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminAPI } from '../../services/api';

interface Faculty {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  department_count?: number;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  faculty_id?: string;
  faculty_name?: string;
  is_active: boolean;
  course_count?: number;
  description?: string;
}

const FacultiesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedTab, setSelectedTab] = useState<'faculties' | 'departments'>('faculties');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Faculty | Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const [facultiesRes, departmentsRes] = await Promise.all([
        adminAPI.getFaculties({ page_size: 200 }),
        adminAPI.getDepartments({ page_size: 200 }),
      ]);

      const facultiesData = facultiesRes?.data?.data?.results || [];
      const departmentsData = departmentsRes?.data?.data?.results || [];
      
      setFaculties(facultiesData);
      setDepartments(departmentsData);
    } catch (err: any) {
      console.error('Failed to fetch faculties:', err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Failed to load data'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchData(true);
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', code: '', description: '' });
    setModalVisible(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ name: item.name, code: item.code, description: item.description || '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      Alert.alert('Validation Error', 'Please enter name and code');
      return;
    }
    try {
      if (editingItem) {
        await adminAPI.updateFaculty(editingItem.id, {
          name: formData.name,
          code: formData.code,
        });
        Alert.alert('Success', 'Updated successfully');
      } else {
        await adminAPI.createFaculty({ name: formData.name, code: formData.code });
        Alert.alert('Success', 'Created successfully');
      }
      setModalVisible(false);
      fetchData(true);
    } catch (err: any) {
      console.error('Failed to save faculty:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Failed to save';
      Alert.alert('Error', errorMsg);
    }
  };

  const handleToggleActive = async (item: Faculty | Department, type: 'faculty' | 'department') => {
    try {
      if (type === 'faculty') {
        await adminAPI.updateFaculty(item.id, { is_active: !(item.is_active ?? true) });
      }
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderFacultyItem = ({ item }: { item: Faculty }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemIcon}>
        <Icon name="school" size={24} color={colors.primary[500]} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.code} • {item.department_count || 0} departments</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
          <Icon name="pencil" size={18} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleToggleActive(item, 'faculty')}
        >
          <Icon 
            name={item.is_active ? 'eye' : 'eye-off'} 
            size={18} 
            color={item.is_active ? colors.success : colors.error} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDepartmentItem = ({ item }: { item: Department }) => (
    <View style={styles.itemCard}>
      <View style={[styles.itemIcon, { backgroundColor: colors.accent[500] + '20' }]}>
        <Icon name="folder" size={24} color={colors.accent[500]} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.code} • {item.faculty_name || 'No faculty'}</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
          <Icon name="pencil" size={18} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleToggleActive(item, 'department')}
        >
          <Icon 
            name={item.is_active ? 'eye' : 'eye-off'} 
            size={18} 
            color={item.is_active ? colors.success : colors.error} 
          />
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

  if (error && !faculties.length) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.title}>Faculties & Departments</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'faculties' && styles.tabActive]}
          onPress={() => setSelectedTab('faculties')}
        >
          <Text style={[styles.tabText, selectedTab === 'faculties' && styles.tabTextActive]}>
            Faculties ({faculties.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'departments' && styles.tabActive]}
          onPress={() => setSelectedTab('departments')}
        >
          <Text style={[styles.tabText, selectedTab === 'departments' && styles.tabTextActive]}>
            Departments ({departments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Data List */}
      <FlatList
        data={(selectedTab === 'faculties' ? faculties : departments) as any}
        renderItem={({ item }) => (
          selectedTab === 'faculties' 
            ? renderFacultyItem({ item: item as Faculty })
            : renderDepartmentItem({ item: item as Department })
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="folder" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No {selectedTab} found</Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit' : 'Create'} {selectedTab === 'faculties' ? 'Faculty' : 'Department'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.text.tertiary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Code"
              placeholderTextColor={colors.text.tertiary}
              value={formData.code}
              onChangeText={(text) => setFormData({ ...formData, code: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    paddingTop: spacing[8],
    backgroundColor: colors.primary[500],
  },
  backButton: {
    padding: spacing[1],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  addButton: {
    padding: spacing[1],
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    padding: spacing[4],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
    backgroundColor: colors.primary[500] + '20',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemMeta: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    padding: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});

export default FacultiesScreen;
