// Academic Management Screen for CampusHub
// Allows admins to manage faculties, courses, and units

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';

interface Faculty {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

interface Department {
  id: string;
  name: string;
  code?: string;
  faculty_id?: string;
  faculty_name?: string;
  is_active?: boolean;
}

interface Course {
  id: string;
  name: string;
  code: string;
  department_id?: string;
  department_name?: string;
  is_active?: boolean;
}

interface Unit {
  id: string;
  name: string;
  code: string;
  course_id?: string;
  course_name?: string;
  semester?: number;
  year_of_study?: number;
  is_active?: boolean;
}

type TabType = 'faculties' | 'courses' | 'units';

const AcademicManagementScreen: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('faculties');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    course_id: '',
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'faculties') {
        const response = await adminAPI.getFaculties({ page_size: 200 });
        setFaculties(response.data?.data?.results || []);
      } else if (activeTab === 'courses') {
        const [coursesResponse, departmentsResponse] = await Promise.all([
          adminAPI.getCourses({ page_size: 200 }),
          adminAPI.getDepartments({ page_size: 200 }),
        ]);
        setCourses(coursesResponse.data?.data?.results || []);
        setDepartments(departmentsResponse.data?.data?.results || []);
      } else if (activeTab === 'units') {
        const [unitsResponse, coursesResponse] = await Promise.all([
          adminAPI.getAllUnits(),
          adminAPI.getCourses({ page_size: 200 }),
        ]);
        setUnits(unitsResponse.data?.data?.results || []);
        setCourses(coursesResponse.data?.data?.results || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      department_id: '',
      course_id: '',
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      department_id: item.department_id || '',
      course_id: item.course_id || '',
      is_active: item.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      setSaving(true);
      
      if (activeTab === 'faculties') {
        if (editingItem) {
          await adminAPI.updateFaculty(editingItem.id, { 
            name: formData.name, 
            code: formData.code,
            is_active: formData.is_active 
          });
        } else {
          await adminAPI.createFaculty({ 
            name: formData.name, 
            code: formData.code,
            is_active: formData.is_active 
          });
        }
      } else if (activeTab === 'courses') {
        if (editingItem) {
          await adminAPI.updateCourse(editingItem.id, { 
            name: formData.name, 
            code: formData.code,
            department: formData.department_id || undefined,
            is_active: formData.is_active 
          });
        } else {
          await adminAPI.createCourse({ 
            name: formData.name, 
            code: formData.code,
            department: formData.department_id || undefined,
            is_active: formData.is_active 
          });
        }
      } else if (activeTab === 'units') {
        if (editingItem) {
          await adminAPI.updateUnit(editingItem.id, { 
            name: formData.name, 
            code: formData.code,
            course_id: formData.course_id || undefined,
            is_active: formData.is_active 
          });
        } else {
          await adminAPI.createUnit({ 
            name: formData.name, 
            code: formData.code,
            course_id: formData.course_id || undefined,
            is_active: formData.is_active 
          });
        }
      }

      Alert.alert('Success', `${activeTab.slice(0, -1)} saved successfully`);
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTab === 'faculties') {
                await adminAPI.deleteFaculty(item.id);
              } else if (activeTab === 'courses') {
                await adminAPI.deleteCourse(item.id);
              } else if (activeTab === 'units') {
                await adminAPI.deleteUnit(item.id);
              }
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const renderTab = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tab as ViewStyle, activeTab === tab ? styles.tabActive as ViewStyle : null]}
      onPress={() => setActiveTab(tab)}
    >
      <Icon name={icon as any} size={20} color={activeTab === tab ? colors.primary[500] : colors.text.secondary} />
      <Text style={[styles.tabText as TextStyle, activeTab === tab ? styles.tabTextActive as TextStyle : null]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = (item: any) => (
    <View key={item.id} style={styles.itemCard as ViewStyle}>
      <View style={styles.itemInfo as ViewStyle}>
        {activeTab === 'units' ? (
          <>
            <Text style={styles.itemName as TextStyle}>{item.code || item.name}</Text>
            <Text style={styles.itemCode as TextStyle}>{item.name}</Text>
            <Text style={styles.itemMeta as TextStyle}>
              {[
                item.course_name || '',
                item.year_of_study ? `Year ${item.year_of_study}` : '',
                item.semester ? `Sem ${item.semester}` : '',
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.itemName as TextStyle}>{item.name}</Text>
            {item.code && <Text style={styles.itemCode as TextStyle}>{item.code}</Text>}
          </>
        )}
        {item.is_active === false && (
          <View style={styles.inactiveBadge as ViewStyle}>
            <Text style={styles.inactiveBadgeText as TextStyle}>Inactive</Text>
          </View>
        )}
      </View>
      <View style={styles.itemActions as ViewStyle}>
        <TouchableOpacity style={styles.actionBtn as ViewStyle} onPress={() => handleEdit(item)}>
          <Icon name="create" size={20} color={colors.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn as ViewStyle} onPress={() => handleDelete(item)}>
          <Icon name="trash" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <TouchableOpacity style={styles.backBtn as ViewStyle} onPress={() => router.back()}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle as TextStyle}>Academic Management</Text>
        <TouchableOpacity style={styles.addBtn as ViewStyle} onPress={handleAddNew}>
          <Icon name="add" size={24} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs as ViewStyle}>
        {renderTab('faculties', 'Faculties', 'school')}
        {renderTab('courses', 'Courses', 'book')}
        {renderTab('units', 'Units', 'document-text')}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader as ViewStyle} />
      ) : showForm ? (
        <ScrollView style={styles.form as ViewStyle}>
          <View style={styles.formCard as ViewStyle}>
            <Text style={styles.formTitle as TextStyle}>
              {editingItem ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
            </Text>
            
            <View style={styles.field as ViewStyle}>
              <Text style={styles.label as TextStyle}>Name *</Text>
              <TextInput
                style={styles.input as TextStyle}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={activeTab === 'units' ? 'e.g., Data Structures' : activeTab === 'courses' ? 'e.g., Computer Science' : `Enter ${activeTab.slice(0, -1)} name`}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.field as ViewStyle}>
              <Text style={styles.label as TextStyle}>{activeTab === 'courses' ? 'Course Code' : activeTab === 'units' ? 'Unit Code' : 'Code'}</Text>
              <TextInput
                style={styles.input as TextStyle}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text })}
                placeholder={activeTab === 'courses' ? 'e.g., CS' : activeTab === 'units' ? 'e.g., CS201' : 'e.g., ENG'}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {activeTab === 'courses' && departments.length > 0 && (
              <View style={styles.field as ViewStyle}>
                <Text style={styles.label as TextStyle}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {departments.map((department) => (
                    <TouchableOpacity
                      key={department.id}
                      style={[styles.chip as ViewStyle, formData.department_id === department.id ? styles.chipActive as ViewStyle : null]}
                      onPress={() => setFormData({ ...formData, department_id: department.id })}
                    >
                      <Text style={[styles.chipText as TextStyle, formData.department_id === department.id ? styles.chipTextActive as TextStyle : null]}>
                        {department.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {activeTab === 'units' && courses.length > 0 && (
              <View style={styles.field as ViewStyle}>
                <Text style={styles.label as TextStyle}>Course</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {courses.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip as ViewStyle, formData.course_id === c.id ? styles.chipActive as ViewStyle : null]}
                      onPress={() => setFormData({ ...formData, course_id: c.id })}
                    >
                      <Text style={[styles.chipText as TextStyle, formData.course_id === c.id ? styles.chipTextActive as TextStyle : null]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn as ViewStyle, saving ? styles.saveBtnDisabled as ViewStyle : null]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.saveBtnText as TextStyle}>Save {activeTab.slice(0, -1)}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn as ViewStyle} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText as TextStyle}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.list as ViewStyle}>
          {activeTab === 'faculties' && faculties.map(renderItem)}
          {activeTab === 'courses' && courses.map(renderItem)}
          {activeTab === 'units' && units.map(renderItem)}
          
          {(activeTab === 'faculties' && faculties.length === 0) ||
          (activeTab === 'courses' && courses.length === 0) ||
          (activeTab === 'units' && units.length === 0) ? (
            <View style={styles.emptyState as ViewStyle}>
              <Icon name="folder" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText as TextStyle}>No {activeTab} yet</Text>
              <TouchableOpacity style={styles.emptyBtn as ViewStyle} onPress={handleAddNew}>
                <Text style={styles.emptyBtnText as TextStyle}>Add First {activeTab.slice(0, -1)}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addBtn: {
    padding: spacing[2],
  },
  tabs: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[3],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card.light,
    gap: spacing[2],
  },
  tabActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemCode: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  itemMeta: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  inactiveBadge: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  inactiveBadgeText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    padding: spacing[2],
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  formCard: {
    backgroundColor: colors.card.light,
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[5],
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing[4],
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginRight: spacing[2],
  },
  chipActive: {
    backgroundColor: colors.success,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.success,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing[4],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    padding: spacing[4],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  cancelBtnText: {
    color: colors.text.secondary,
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: spacing[4],
  },
  emptyBtn: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
  },
  emptyBtnText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

export default AcademicManagementScreen;
