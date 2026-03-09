// Upload Resource Screen for CampusHub
// File upload with backend API integration

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { resourcesAPI, coursesAPI, facultiesAPI } from '../../services/api';

interface SelectedFile {
  name: string;
  size: number;
  type: string;
  uri: string;
}

interface ResourceType {
  id: string;
  name: string;
}

interface Faculty {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

type UploadStatus = 'idle' | 'selecting' | 'uploading' | 'success' | 'error';

const UploadResourceScreen: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Backend data
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch dropdown data from backend
  const fetchDropdownData = useCallback(async () => {
    try {
      setLoadingData(true);
      
      const [typesRes, facultiesRes, coursesRes] = await Promise.all([
        resourcesAPI.list({ page: 1 }), // Get types from resources
        facultiesAPI.list(),
        coursesAPI.list(),
      ]);
      
      // Extract unique types from resources
      const resources = typesRes.data?.data?.results || typesRes.data?.data || typesRes.data || [];
      const uniqueTypes: string[] = [];
      resources.forEach((r: any) => {
        if (r.resource_type && !uniqueTypes.includes(r.resource_type)) {
          uniqueTypes.push(r.resource_type);
        }
      });
      setResourceTypes(uniqueTypes.map((t: string) => ({ id: t, name: t })));
      
      // Set faculties
      const facData = facultiesRes.data?.data?.results || facultiesRes.data?.data || facultiesRes.data || [];
      setFaculties(facData);
      
      // Set courses
      const courseData = coursesRes.data?.data?.results || coursesRes.data?.data || coursesRes.data || [];
      setCourses(courseData);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      // Use fallback static data if API fails
      setResourceTypes([
        { id: 'notes', name: 'Notes' },
        { id: 'book', name: 'Book' },
        { id: 'tutorial', name: 'Tutorial' },
        { id: 'past_paper', name: 'Past Paper' },
        { id: 'assignment', name: 'Assignment' },
        { id: 'slides', name: 'Slides' },
      ]);
      setFaculties([
        { id: 'science', name: 'Science' },
        { id: 'engineering', name: 'Engineering' },
        { id: 'arts', name: 'Arts' },
        { id: 'business', name: 'Business' },
        { id: 'medicine', name: 'Medicine' },
      ]);
      setCourses([
        { id: 'cs101', name: 'Introduction to Programming', code: 'CS 101' },
        { id: 'cs201', name: 'Data Structures', code: 'CS 201' },
        { id: 'cs301', name: 'Algorithms', code: 'CS 301' },
        { id: 'math101', name: 'Calculus I', code: 'MATH 101' },
      ]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const years = ['2025', '2024', '2023', '2022', '2021', '2020'];
  
  // Use API data only - no fallback mock data
  const types = resourceTypes;
  const facultyList = faculties;
  const courseList = courses;

  const handleSelectFile = async () => {
    try {
      setUploadStatus('selecting');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'video/mp4'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        setUploadStatus('idle');
        return;
      }
      
      const file = result.assets?.[0];
      if (!file || !file.uri) {
        setUploadStatus('idle');
        return;
      }
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      const fileSize = fileInfo.exists ? (fileInfo.size || 0) : 0;
      
      const selectedFileData: SelectedFile = {
        name: file.name,
        size: fileSize,
        type: file.mimeType || 'application/octet-stream',
        uri: file.uri,
      };
      
      setSelectedFile(selectedFileData);
      setUploadStatus('idle');
      Alert.alert('File Selected', `${selectedFileData.name} (${formatFileSize(fileSize)})`);
    } catch (err) {
      console.error('Error picking document:', err);
      setUploadStatus('idle');
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!title || !selectedType || !selectedCourse) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Type, Course)');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }

    setSubmitting(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('resource_type', selectedType);
      formData.append('faculty', selectedFaculty);
      formData.append('course', selectedCourse);
      formData.append('year', selectedYear);
      formData.append('tags', tags);
      
      // Append file
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      } as any);

      // Upload to backend
      const response = await resourcesAPI.create(formData);
      
      setUploadProgress(1);
      setUploadStatus('success');
      
      Alert.alert('Success', 'Your resource has been submitted for review!', [
        { 
          text: 'OK', 
          onPress: () => router.replace('/(student)/my-uploads') 
        }
      ]);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || 'Failed to upload resource. Please try again.';
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (uploadStatus === 'uploading') {
      Alert.alert(
        'Cancel Upload?',
        'Are you sure you want to cancel the upload?',
        [
          { text: 'Continue', style: 'cancel' },
          { 
            text: 'Cancel Upload', 
            style: 'destructive',
            onPress: () => {
              setUploadStatus('idle');
              setUploadProgress(0);
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const isUploading = uploadStatus === 'uploading' || submitting;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleCancel}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Resource</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* File Drop Zone */}
        <TouchableOpacity 
          style={[
            styles.dropZone, 
            selectedFile && styles.dropZoneSelected
          ]} 
          onPress={handleSelectFile}
          disabled={isUploading}
        >
          {uploadStatus === 'selecting' ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : selectedFile ? (
            <>
              <View style={styles.fileIconContainer}>
                <Icon name="document-text" size={40} color={colors.primary[500]} />
              </View>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
              <TouchableOpacity 
                style={styles.removeFileBtn}
                onPress={handleRemoveFile}
                disabled={isUploading}
              >
                <Icon name="close-circle" size={18} color={colors.error} />
                <Text style={styles.removeFileText}> Remove</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.dropIconContainer}>
                <Icon name="cloud-upload" size={48} color={colors.primary[500]} />
              </View>
              <Text style={styles.dropText}>Tap to select file</Text>
              <Text style={styles.dropHint}>PDF, DOCX, PPTX, MP4 (Max 50MB)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter resource title" 
            placeholderTextColor={colors.text.tertiary} 
            value={title} 
            onChangeText={setTitle}
            editable={!isUploading}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Describe your resource..." 
            placeholderTextColor={colors.text.tertiary} 
            value={description} 
            onChangeText={setDescription}
            multiline 
            numberOfLines={4}
            editable={!isUploading}
          />
        </View>

        {/* Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {types.map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={[
                  styles.chip, 
                  selectedType === t.id && styles.chipActive
                ]} 
                onPress={() => setSelectedType(t.id)}
                disabled={isUploading}
              >
                <Text style={[
                  styles.chipText, 
                  selectedType === t.id && styles.chipTextActive
                ]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Faculty */}
        <View style={styles.field}>
          <Text style={styles.label}>Faculty</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {facultyList.map(f => (
              <TouchableOpacity 
                key={f.id} 
                style={[
                  styles.chip, 
                  selectedFaculty === f.id && styles.chipActive
                ]} 
                onPress={() => setSelectedFaculty(f.id)}
                disabled={isUploading}
              >
                <Text style={[
                  styles.chipText, 
                  selectedFaculty === f.id && styles.chipTextActive
                ]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Course */}
        <View style={styles.field}>
          <Text style={styles.label}>Course/Unit *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {courseList.map(c => (
              <TouchableOpacity 
                key={c.id} 
                style={[
                  styles.chip, 
                  selectedCourse === c.id && styles.chipActive
                ]} 
                onPress={() => setSelectedCourse(c.id)}
                disabled={isUploading}
              >
                <Text style={[
                  styles.chipText, 
                  selectedCourse === c.id && styles.chipTextActive
                ]}>{c.code || c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Year */}
        <View style={styles.field}>
          <Text style={styles.label}>Year</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {years.map(y => (
              <TouchableOpacity 
                key={y} 
                style={[
                  styles.chip, 
                  selectedYear === y && styles.chipActive
                ]} 
                onPress={() => setSelectedYear(y)}
                disabled={isUploading}
              >
                <Text style={[
                  styles.chipText, 
                  selectedYear === y && styles.chipTextActive
                ]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Tags</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter tags separated by commas" 
            placeholderTextColor={colors.text.tertiary} 
            value={tags} 
            onChangeText={setTags}
            editable={!isUploading}
          />
        </View>
      </ScrollView>

      {/* Upload Progress / Button */}
      <View style={styles.footer}>
        {uploadStatus === 'uploading' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              Uploading... {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[
            styles.uploadBtn,
            isUploading && styles.uploadBtnDisabled
          ]} 
          onPress={handleUpload}
          disabled={isUploading || uploadStatus === 'selecting'}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={styles.uploadBtnText}>Upload Resource</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: spacing[4], 
    paddingTop: spacing[12], 
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.text.primary 
  },
  content: { 
    padding: spacing[6], 
    paddingBottom: 160,
  },
  dropZone: { 
    backgroundColor: colors.card.light, 
    borderRadius: 20, 
    padding: spacing[10], 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: colors.border.light, 
    borderStyle: 'dashed', 
    marginBottom: spacing[6] 
  },
  dropZoneSelected: { 
    borderColor: colors.primary[500], 
    backgroundColor: colors.primary[50] 
  },
  dropIconContainer: {
    marginBottom: spacing[3],
  },
  dropText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: colors.text.primary, 
    marginBottom: spacing[1] 
  },
  dropHint: { 
    fontSize: 12, 
    color: colors.text.tertiary 
  },
  fileIconContainer: { 
    marginBottom: spacing[2] 
  },
  fileName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  fileSize: { 
    fontSize: 12, 
    color: colors.text.secondary, 
    marginBottom: spacing[2] 
  },
  removeFileBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[2], 
    backgroundColor: colors.error + '20', 
    borderRadius: 8,
    gap: 4,
  },
  removeFileText: { 
    fontSize: 12, 
    color: colors.error, 
    fontWeight: '500' 
  },
  field: { marginBottom: spacing[5] },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text.primary, 
    marginBottom: spacing[2] 
  },
  input: { 
    backgroundColor: colors.card.light, 
    borderRadius: 12, 
    padding: spacing[4], 
    fontSize: 15, 
    color: colors.text.primary 
  },
  textArea: { 
    minHeight: 100, 
    textAlignVertical: 'top' 
  },
  chips: { 
    gap: spacing[2] 
  },
  chip: { 
    paddingHorizontal: spacing[4], 
    paddingVertical: spacing[2], 
    borderRadius: 20, 
    backgroundColor: colors.card.light 
  },
  chipActive: { 
    backgroundColor: colors.primary[500] 
  },
  chipText: { 
    fontSize: 13, 
    color: colors.text.secondary 
  },
  chipTextActive: { 
    color: colors.text.inverse 
  },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: colors.card.light, 
    padding: spacing[4], 
    borderTopWidth: 1, 
    borderTopColor: colors.border.light,
    ...shadows.md,
  },
  progressContainer: { marginBottom: spacing[3] },
  progressBar: { 
    height: 6, 
    backgroundColor: colors.gray[200], 
    borderRadius: 3, 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: colors.primary[500], 
    borderRadius: 3 
  },
  progressText: { 
    fontSize: 12, 
    color: colors.text.secondary, 
    marginTop: spacing[1], 
    textAlign: 'center' 
  },
  uploadBtn: { 
    backgroundColor: colors.primary[500], 
    borderRadius: 16, 
    padding: spacing[4], 
    alignItems: 'center' 
  },
  uploadBtnDisabled: { 
    backgroundColor: colors.gray[400] 
  },
  uploadBtnText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text.inverse 
  },
});

export default UploadResourceScreen;
