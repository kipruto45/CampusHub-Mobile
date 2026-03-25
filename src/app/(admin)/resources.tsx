// Admin Resources Management for CampusHub
// Review, moderate, and manage resources

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminManagementAPI, coursesAPI, publicAcademicAPI } from '../../services/api';

type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'archived';

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  status: ResourceStatus;
  is_pinned?: boolean;
  file_size: number;
  download_count: number;
  view_count: number;
  created_at: string;
  uploader: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  course?: {
    id: string;
    name: string;
  };
  unit?: {
    id: string;
    name: string;
  };
}

const ResourcesScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<ResourceStatus | 'all'>('all');
  
  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'single' | 'bulk'>('single');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  
  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState('notes');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const fetchResources = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setError(null);
      }
      
      const params: any = { page: pageNum, page_size: 20 };
      if (selectedFilter !== 'all') {
        params.status = selectedFilter;
      }

      const response = await adminManagementAPI.listResources(params);
      const results = response.data?.data?.results || [];
      
      if (isRefresh || pageNum === 1) {
        setResources(results);
      } else {
        setResources(prev => [...prev, ...results]);
      }
      
      setHasMore(results.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch resources:', err);
      setError(err.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchResources(1, true);
  }, [selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResources(1, true);
  }, [fetchResources]);

  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      fetchResources(page + 1);
    }
  }, [loading, refreshing, hasMore, page, fetchResources]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetchResources(1, true);
  }, []);

  const handleUpdateStatus = async (resourceId: string, newStatus: ResourceStatus) => {
    try {
      if (newStatus === 'approved') {
        await adminManagementAPI.approveResource(resourceId);
      } else if (newStatus === 'rejected') {
        await adminManagementAPI.rejectResource(resourceId, 'Rejected by admin');
      }
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, status: newStatus } : r
      ));
      Alert.alert('Success', `Resource ${newStatus} successfully`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update resource status');
    }
  };

  const handleFlagResource = async (resourceId: string) => {
    try {
      await adminManagementAPI.flagResource(resourceId, 'Flagged by admin');
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, status: 'flagged' } : r
      ));
      Alert.alert('Success', 'Resource flagged successfully');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to flag resource');
    }
  };

  const handleArchiveResource = async (resourceId: string) => {
    Alert.alert(
      'Archive Resource',
      'Are you sure you want to archive this resource?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Archive', 
          onPress: async () => {
            try {
              await adminManagementAPI.archiveResource(resourceId, 'Archived by admin');
              setResources(prev => prev.map(r => 
                r.id === resourceId ? { ...r, status: 'archived' } : r
              ));
              Alert.alert('Success', 'Resource archived successfully');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to archive resource');
            }
          }
        }
      ]
    );
  };

  const handlePinResource = async (resourceId: string, currentPinned: boolean) => {
    try {
      await adminManagementAPI.pinResource(resourceId, !currentPinned);
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, is_pinned: !currentPinned } : r
      ));
      Alert.alert('Success', `Resource ${!currentPinned ? 'pinned' : 'unpinned'} successfully`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update pin status');
    }
  };

  // Upload functions
  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await coursesAPI.list();
      const results = response.data?.data?.results || response.data?.data || [];
      setCourses(results);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        // Auto-generate title from filename
        if (!title) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setTitle(nameWithoutExt.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim());
        }
      }
    } catch (err) {
      console.error('File selection error:', err);
    }
  };

  const handleSelectMultipleFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      // Handle multiple selection by calling picker multiple times if needed
      if (!result.canceled && result.assets) {
        // For bulk upload, we'll use the single picker and let users add more
        setSelectedFiles(result.assets);
      }
    } catch (err) {
      console.error('File selection error:', err);
    }
  };

  const handleUpload = async () => {
    if (uploadType === 'single') {
      if (!selectedFile) {
        Alert.alert('Error', 'Please select a file');
        return;
      }
      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }
    } else {
      if (selectedFiles.length === 0) {
        Alert.alert('Error', 'Please select files');
        return;
      }
    }

    try {
      setUploading(true);

      if (uploadType === 'single') {
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as any);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('resource_type', resourceType);
        if (courseId) {
          formData.append('course_id', courseId);
        }

        await adminManagementAPI.uploadResource(formData);
        Alert.alert('Success', 'Resource uploaded successfully');
      } else {
        // Bulk upload
        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
          formData.append(`files[${index}]`, {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          } as any);
        });
        formData.append('resource_type', resourceType);
        if (courseId) {
          formData.append('course_id', courseId);
        }

        await adminManagementAPI.bulkUploadResources(formData);
        Alert.alert('Success', `${selectedFiles.length} resources uploaded successfully`);
      }

      // Reset form
      setSelectedFile(null);
      setSelectedFiles([]);
      setTitle('');
      setDescription('');
      setCourseId('');
      setShowUploadModal(false);
      
      // Refresh list
      fetchResources(1, true);
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = (type: 'single' | 'bulk') => {
    setUploadType(type);
    setSelectedFile(null);
    setSelectedFiles([]);
    setTitle('');
    setDescription('');
    setCourseId('');
    loadCourses();
    setShowUploadModal(true);
  };

  const getStatusColor = (status: ResourceStatus) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      case 'flagged':
        return colors.warning;
      case 'archived':
        return colors.text.tertiary;
      default:
        return colors.warning;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'notes':
      case 'past_paper':
      case 'assignment':
      case 'tutorial':
        return 'document';
      case 'slides':
        return 'presentation';
      case 'book':
        return 'book';
      default:
        return 'document';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderResourceItem = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => router.push(`/(admin)/resource-detail?id=${item.id}` as any)}
      activeOpacity={0.9}
    >
      <View style={[styles.typeIcon, { backgroundColor: colors.primary[500] + '20' }]}>
        <Icon name={getTypeIcon(item.resource_type) as any} size={24} color={colors.primary[500]} />
      </View>
      <View style={styles.resourceInfo}>
        <Text style={styles.resourceTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resourceMeta}>
          {item.uploader?.first_name} {item.uploader?.last_name} • {formatFileSize(item.file_size)}
        </Text>
        <View style={styles.resourceFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          {item.is_pinned && (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary[500] + '20' }]}>
              <Icon name="pin" size={10} color={colors.primary[500]} />
              <Text style={[styles.statusText, { color: colors.primary[500], marginLeft: 2 }]}>Pinned</Text>
            </View>
          )}
          <Text style={styles.downloadCount}>
            <Icon name="download" size={12} color={colors.text.tertiary} /> {item.download_count}
          </Text>
        </View>
      </View>
      
      {item.status === 'approved' && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: item.is_pinned ? colors.primary[500] + '20' : colors.background.secondary }]}
            onPress={() => handlePinResource(item.id, !!item.is_pinned)}
          >
            <Icon name="pin" size={18} color={item.is_pinned ? colors.primary[500] : colors.text.tertiary} />
          </TouchableOpacity>
        )}
    </TouchableOpacity>
  );

  const filters: { key: ResourceStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'flagged', label: 'Flagged' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !resources.length) {
    return (
      <ErrorState
        type="server"
        title="Failed to Load Resources"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Resources Management</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.uploadBtn}
            onPress={() => openUploadModal('single')}
          >
            <Icon name="cloud-upload" size={20} color={colors.text.inverse} />
            <Text style={styles.uploadBtnText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.uploadBtn, styles.bulkUploadBtn]}
            onPress={() => openUploadModal('bulk')}
          >
            <Icon name="layers" size={20} color={colors.text.inverse} />
            <Text style={styles.uploadBtnText}>Bulk</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{resources.filter(r => r.status === 'flagged').length}</Text>
          <Text style={styles.statLabel}>Flagged</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{resources.filter(r => r.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.error }]}>{resources.filter(r => r.status === 'rejected').length}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterTab, selectedFilter === filter.key && styles.filterTabActive]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[styles.filterTabText, selectedFilter === filter.key && styles.filterTabTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resources List */}
      <FlatList
        data={resources}
        renderItem={renderResourceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="document-text" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No resources found</Text>
          </View>
        }
      />

      {/* Upload Modal */}
      <UploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        uploadType={uploadType}
        selectedFile={selectedFile}
        selectedFiles={selectedFiles}
        title={title}
        description={description}
        resourceType={resourceType}
        courseId={courseId}
        courses={courses}
        loadingCourses={loadingCourses}
        uploading={uploading}
        onSelectFile={handleSelectFile}
        onSelectMultipleFiles={handleSelectMultipleFiles}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onTypeChange={setResourceType}
        onCourseChange={setCourseId}
        onUpload={handleUpload}
        onClearFile={() => setSelectedFile(null)}
      />
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },
  bulkUploadBtn: {
    backgroundColor: colors.accent[500],
  },
  uploadBtnText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.background.primary,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    ...shadows.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.warning,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.background.primary,
  },
  filterTab: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    padding: spacing[4],
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  resourceMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  resourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  downloadCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[5],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  formInput: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  formSelect: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  fileSelectBtn: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderStyle: 'dashed',
  },
  fileSelectBtnText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '600',
    marginTop: spacing[2],
  },
  selectedFile: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  uploadBtnFull: {
    backgroundColor: colors.primary[500],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing[4],
  },
  uploadBtnFullText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  filesList: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginTop: spacing[2],
    maxHeight: 150,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  fileItemName: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  typeOption: {
    flex: 1,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  typeOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  typeOptionTextActive: {
    color: colors.primary[500],
  },
});

// Upload Modal Component
const UploadModal = ({ 
  visible, 
  onClose, 
  uploadType,
  selectedFile,
  selectedFiles,
  title,
  description,
  resourceType,
  courseId,
  courses,
  loadingCourses,
  uploading,
  onSelectFile,
  onSelectMultipleFiles,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onCourseChange,
  onUpload,
  onClearFile,
}: any) => {
  if (!visible) return null;

  const resourceTypes = [
    { value: 'notes', label: 'Notes' },
    { value: 'past_paper', label: 'Past Exam' },
    { value: 'book', label: 'Book' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'slides', label: 'Slides' },
    { value: 'tutorial', label: 'Tutorial' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {uploadType === 'single' ? 'Upload Resource' : 'Bulk Upload'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {uploadType === 'single' ? (
              <>
                {/* File Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select File *</Text>
                  {selectedFile ? (
                    <View style={styles.selectedFile}>
                      <Icon name="document" size={24} color={colors.primary[500]} />
                      <Text style={styles.selectedFileName} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <TouchableOpacity onPress={onClearFile}>
                        <Icon name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.fileSelectBtn} onPress={onSelectFile}>
                      <Icon name="cloud-upload" size={40} color={colors.primary[500]} />
                      <Text style={styles.fileSelectBtnText}>Tap to select file</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Title */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={title}
                    onChangeText={onTitleChange}
                    placeholder="Enter resource title"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                    value={description}
                    onChangeText={onDescriptionChange}
                    placeholder="Enter description (optional)"
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                  />
                </View>
              </>
            ) : (
              <>
                {/* Bulk File Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Files *</Text>
                  <TouchableOpacity style={styles.fileSelectBtn} onPress={onSelectMultipleFiles}>
                    <Icon name="layers" size={40} color={colors.primary[500]} />
                    <Text style={styles.fileSelectBtnText}>Tap to select multiple files</Text>
                  </TouchableOpacity>
                  
                  {selectedFiles.length > 0 && (
                    <View style={styles.filesList}>
                      {selectedFiles.map((file: any, index: number) => (
                        <View key={index} style={styles.fileItem}>
                          <Icon name="document" size={18} color={colors.text.secondary} />
                          <Text style={styles.fileItemName} numberOfLines={1}>
                            {file.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Resource Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Resource Type *</Text>
              <View style={styles.typeSelector}>
                {resourceTypes.slice(0, 3).map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      resourceType === type.value && styles.typeOptionActive
                    ]}
                    onPress={() => onTypeChange(type.value)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      resourceType === type.value && styles.typeOptionTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.typeSelector}>
                {resourceTypes.slice(3).map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      resourceType === type.value && styles.typeOptionActive
                    ]}
                    onPress={() => onTypeChange(type.value)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      resourceType === type.value && styles.typeOptionTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Course */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Course (Optional)</Text>
              <View style={styles.formSelect}>
                {loadingCourses ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <TextInput
                    style={{ color: colors.text.primary, fontSize: 15 }}
                    value={courseId}
                    onChangeText={onCourseChange}
                    placeholder="Select course"
                    placeholderTextColor={colors.text.tertiary}
                  />
                )}
              </View>
            </View>

            {/* Upload Button */}
            <TouchableOpacity
              style={[styles.uploadBtnFull, uploading && { opacity: 0.6 }]}
              onPress={onUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.uploadBtnFullText}>
                  {uploadType === 'single' ? 'Upload Resource' : `Upload ${selectedFiles.length} Files`}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ResourcesScreen;
