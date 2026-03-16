// Upload Resource Screen for CampusHub
// File upload with backend API integration

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { resourcesAPI, coursesAPI, publicAcademicAPI } from '../../services/api';

interface SelectedFile {
  name: string;
  size: number;
  type: string;
  uri: string;
}

interface Faculty {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  faculty_id: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  department_id?: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
  semester?: number;
  year_of_study?: number;
}

type UploadStatus = 'idle' | 'selecting' | 'uploading' | 'success' | 'error';

const resourceTypeOptions = [
  { value: 'notes', label: 'Notes' },
  { value: 'past_paper', label: 'Past Exam' },
  { value: 'book', label: 'Book' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'slides', label: 'Slides' },
  { value: 'tutorial', label: 'Tutorial' },
] as const;

// Helper function to generate title from filename
const generateTitleFromFilename = (filename: string): string => {
  // Remove file extension
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
  
  // Replace underscores, hyphens, and special chars with spaces
  const cleanedName = nameWithoutExtension
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalize first letter of each word (title case)
  return cleanedName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to generate description from file metadata
const generateDescriptionFromFile = (filename: string, fileSize: number, mimeType: string): string => {
  const extension = filename.split('.').pop()?.toUpperCase() || '';
  const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
  
  let description = `File: ${filename}\n`;
  description += `Type: ${extension} file\n`;
  description += `Size: ${sizeInMB} MB\n`;
  
  // Add MIME type info if available
  if (mimeType && mimeType !== 'application/octet-stream') {
    description += `Format: ${mimeType}`;
  }
  
  return description;
};

const formatAcademicOptionLabel = (code?: string, name?: string): string => {
  const cleanCode = String(code || '').trim();
  const cleanName = String(name || '').trim();

  if (cleanCode && cleanName && cleanCode.toLowerCase() !== cleanName.toLowerCase()) {
    return `${cleanCode} · ${cleanName}`;
  }

  return cleanName || cleanCode;
};

const UploadResourceScreen: React.FC = () => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYearOfStudy, setSelectedYearOfStudy] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Backend data
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const semesters = [
    { id: '1', label: 'Semester 1' },
    { id: '2', label: 'Semester 2' },
  ];
  const yearsOfStudy = ['1', '2', '3', '4', '5', '6', '7'];
  const selectedFacultyDetails = faculties.find((faculty) => faculty.id === selectedFaculty);
  const selectedDepartmentDetails = departments.find((department) => department.id === selectedDepartment);
  const selectedCourseDetails = courses.find((course) => course.id === selectedCourse);
  const selectedUnitDetails = units.find((unit) => unit.id === selectedUnit);
  const selectedFacultyRef = useRef(selectedFaculty);
  const selectedDepartmentRef = useRef(selectedDepartment);
  const selectedCourseRef = useRef(selectedCourse);
  const selectedUnitRef = useRef(selectedUnit);
  const selectedSemesterRef = useRef(selectedSemester);
  const selectedYearOfStudyRef = useRef(selectedYearOfStudy);

  useEffect(() => {
    selectedFacultyRef.current = selectedFaculty;
  }, [selectedFaculty]);

  useEffect(() => {
    selectedDepartmentRef.current = selectedDepartment;
  }, [selectedDepartment]);

  useEffect(() => {
    selectedCourseRef.current = selectedCourse;
  }, [selectedCourse]);

  useEffect(() => {
    selectedUnitRef.current = selectedUnit;
  }, [selectedUnit]);

  useEffect(() => {
    selectedSemesterRef.current = selectedSemester;
  }, [selectedSemester]);

  useEffect(() => {
    selectedYearOfStudyRef.current = selectedYearOfStudy;
  }, [selectedYearOfStudy]);

  const extractCollection = <T,>(response: any, key: string): T[] => {
    return (
      response?.data?.data?.[key] ||
      response?.data?.data?.results ||
      []
    ) as T[];
  };

  const loadDepartments = useCallback(
    async (facultyId: string) => {
      if (!facultyId) {
        setDepartments([]);
        return [] as Department[];
      }

      try {
        setLoadingDepartments(true);
        const response = await publicAcademicAPI.getDepartments(facultyId);
        const nextDepartments = extractCollection<Department>(response, 'departments');
        setDepartments(nextDepartments);
        return nextDepartments;
      } catch (err) {
        console.error('Error fetching departments:', err);
        setDepartments([]);
        showToast('warning', 'Unable to load departments for the selected faculty.');
        return [] as Department[];
      } finally {
        setLoadingDepartments(false);
      }
    },
    [showToast]
  );

  const loadCourses = useCallback(
    async (departmentId: string) => {
      if (!departmentId) {
        setCourses([]);
        return [] as Course[];
      }

      try {
        setLoadingCourses(true);
        const response = await publicAcademicAPI.getCourses(departmentId);
        const nextCourses = extractCollection<Course>(response, 'courses');
        setCourses(nextCourses);
        return nextCourses;
      } catch (err) {
        console.error('Error fetching courses:', err);
        setCourses([]);
        showToast('warning', 'Unable to load courses for the selected department.');
        return [] as Course[];
      } finally {
        setLoadingCourses(false);
      }
    },
    [showToast]
  );

  const loadUnits = useCallback(
    async (
      courseId: string,
      filters?: { semester?: string; yearOfStudy?: string }
    ) => {
      if (!courseId) {
        setUnits([]);
        return [] as Unit[];
      }

      try {
        setLoadingUnits(true);
        const response = await coursesAPI.getUnits(courseId, {
          semester: filters?.semester,
          yearOfStudy: filters?.yearOfStudy,
        });
        const nextUnits = extractCollection<Unit>(response, 'units');
        setUnits(nextUnits);
        return nextUnits;
      } catch (err) {
        console.error('Error fetching units:', err);
        setUnits([]);
        showToast('warning', 'Unable to load units for the selected course.');
        return [] as Unit[];
      } finally {
        setLoadingUnits(false);
      }
    },
    [showToast]
  );

  // Fetch academic selection data from backend
  const fetchAcademicData = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await publicAcademicAPI.getFaculties();
      const nextFaculties = extractCollection<Faculty>(response, 'faculties');
      setFaculties(nextFaculties);
      return nextFaculties;
    } catch (err) {
      console.error('Error fetching academic data:', err);
      setFaculties([]);
      setDepartments([]);
      setCourses([]);
      setUnits([]);
      showToast('warning', 'Unable to load academic data right now. Please retry before uploading.');
      return [] as Faculty[];
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  const refreshAcademicHierarchy = useCallback(async () => {
    const nextFaculties = await fetchAcademicData();
    const currentFaculty = selectedFacultyRef.current;
    const currentDepartment = selectedDepartmentRef.current;
    const currentCourse = selectedCourseRef.current;
    const currentUnit = selectedUnitRef.current;
    const currentSemester = selectedSemesterRef.current;
    const currentYearOfStudy = selectedYearOfStudyRef.current;

    if (!currentFaculty) {
      setDepartments([]);
      setCourses([]);
      setUnits([]);
      return;
    }

    if (!nextFaculties.some((faculty) => faculty.id === currentFaculty)) {
      setSelectedFaculty('');
      setSelectedDepartment('');
      setSelectedCourse('');
      setSelectedUnit('');
      setDepartments([]);
      setCourses([]);
      setUnits([]);
      return;
    }

    const nextDepartments = await loadDepartments(currentFaculty);
    if (!currentDepartment) {
      setCourses([]);
      setUnits([]);
      return;
    }

    if (!nextDepartments.some((department) => department.id === currentDepartment)) {
      setSelectedDepartment('');
      setSelectedCourse('');
      setSelectedUnit('');
      setCourses([]);
      setUnits([]);
      return;
    }

    const nextCourses = await loadCourses(currentDepartment);
    if (!currentCourse) {
      setUnits([]);
      return;
    }

    if (!nextCourses.some((course) => course.id === currentCourse)) {
      setSelectedCourse('');
      setSelectedUnit('');
      setUnits([]);
      return;
    }

    const nextUnits = await loadUnits(currentCourse, {
      semester: currentSemester,
      yearOfStudy: currentYearOfStudy,
    });

    if (currentUnit && !nextUnits.some((unit) => unit.id === currentUnit)) {
      setSelectedUnit('');
    }
  }, [fetchAcademicData, loadCourses, loadDepartments, loadUnits]);

  useEffect(() => {
    if (isFocused) {
      void refreshAcademicHierarchy();
    }
  }, [isFocused, refreshAcademicHierarchy]);

  const resetCourseAndUnitSelection = () => {
    setSelectedCourse('');
    setSelectedUnit('');
    setCourses([]);
    setUnits([]);
  };

  const resetUnitSelection = () => {
    setSelectedUnit('');
    setUnits([]);
  };

  const handleFacultySelect = async (facultyId: string) => {
    if (facultyId === selectedFaculty) {
      return;
    }

    setSelectedFaculty(facultyId);
    setSelectedDepartment('');
    setDepartments([]);
    resetCourseAndUnitSelection();

    await loadDepartments(facultyId);
  };

  const handleSemesterSelect = async (semester: string) => {
    if (semester === selectedSemester) {
      return;
    }

    setSelectedSemester(semester);

    const currentUnit = units.find((unit) => unit.id === selectedUnit);
    if (currentUnit && String(currentUnit.semester || '') !== semester) {
      setSelectedUnit('');
    }

    if (selectedCourse) {
      await loadUnits(selectedCourse, {
        semester,
        yearOfStudy: selectedYearOfStudy,
      });
    }
  };

  const handleYearOfStudySelect = async (yearOfStudy: string) => {
    if (yearOfStudy === selectedYearOfStudy) {
      return;
    }

    setSelectedYearOfStudy(yearOfStudy);

    const currentUnit = units.find((unit) => unit.id === selectedUnit);
    if (currentUnit && String(currentUnit.year_of_study || '') !== yearOfStudy) {
      setSelectedUnit('');
    }

    if (selectedCourse) {
      await loadUnits(selectedCourse, {
        semester: selectedSemester,
        yearOfStudy,
      });
    }
  };

  const handleDepartmentSelect = async (departmentId: string) => {
    if (departmentId === selectedDepartment) {
      return;
    }

    setSelectedDepartment(departmentId);
    resetCourseAndUnitSelection();
    await loadCourses(departmentId);
  };

  const handleCourseSelect = async (courseId: string) => {
    if (courseId === selectedCourse) {
      return;
    }

    setSelectedCourse(courseId);
    resetUnitSelection();

    await loadUnits(courseId, {
      semester: selectedSemester,
      yearOfStudy: selectedYearOfStudy,
    });
  };

  const handleUnitSelect = (unit: Unit) => {
    if (unit.id === selectedUnit) {
      return;
    }

    setSelectedUnit(unit.id);

    if (unit.semester) {
      setSelectedSemester(String(unit.semester));
    }

    if (unit.year_of_study) {
      setSelectedYearOfStudy(String(unit.year_of_study));
    }
  };
  
  const handleSelectFile = async () => {
    try {
      setUploadStatus('selecting');
      
      // Support documents, images, videos, and audio recordings
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          // Videos
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/webm',
          // Audio/Recordings
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/webm',
          // General (fallback)
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        setUploadStatus('idle');
        return;
      }
      
      const file = result.assets?.[0];
      if (!file || !file.uri) {
        setUploadStatus('idle');
        showToast('warning', 'Please select a valid file to upload.');
        return;
      }
      
      // Use asset.size directly - it's provided by DocumentPicker
      const fileSize = file.size || 0;
      
      // Check file size (max 50MB)
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (fileSize > MAX_SIZE) {
        setUploadStatus('idle');
        showToast('warning', 'Maximum file size is 50MB. Please select a smaller file.');
        return;
      }
      
      const selectedFileData: SelectedFile = {
        name: file.name,
        size: fileSize,
        type: file.mimeType || 'application/octet-stream',
        uri: file.uri,
      };
      
      const generatedTitle = generateTitleFromFilename(file.name);
      const generatedDescription = generateDescriptionFromFile(
        file.name,
        fileSize,
        file.mimeType || ''
      );
      
      // Set the auto-detected values (user can still edit these)
      setTitle(generatedTitle);
      setDescription(generatedDescription);
      setSelectedFile(selectedFileData);
      setUploadStatus('idle');
      showToast('success', `${selectedFileData.name} selected. Title, and description auto-filled.`);
    } catch (err: any) {
      console.error('Error picking document:', err);
      setUploadStatus('idle');
      showToast('error', 'Unable to select file. Please check permissions and try again.');
    }
  };

  // Handle taking a photo with camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('warning', 'Camera permission is needed to take photos.');
        return;
      }
      
      setUploadStatus('selecting');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result.canceled) {
        setUploadStatus('idle');
        return;
      }
      
      const asset = result.assets[0];
      if (!asset || !asset.uri) {
        setUploadStatus('idle');
        return;
      }
      
      // Use asset's fileSize directly (provided by ImagePicker)
      const fileSize = asset.fileSize || 0;
      
      const selectedFileData: SelectedFile = {
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        size: fileSize,
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        uri: asset.uri,
      };
      
      const generatedTitle = generateTitleFromFilename(selectedFileData.name);
      const generatedDescription = generateDescriptionFromFile(
        selectedFileData.name,
        fileSize,
        selectedFileData.type
      );
      
      // Set the auto-detected values (user can still edit these)
      setTitle(generatedTitle);
      setDescription(generatedDescription);
      setSelectedFile(selectedFileData);
      setUploadStatus('idle');
      showToast('success', `${selectedFileData.name} captured. Title, and description auto-filled.`);
    } catch (err: any) {
      console.error('Error taking photo:', err);
      setUploadStatus('idle');
      showToast('error', 'Failed to capture photo. Please try again.');
    }
  };

  // Handle recording a video
  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('warning', 'Camera permission is needed to record videos.');
        return;
      }
      
      setUploadStatus('selecting');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 300, // 5 minutes max
      });
      
      if (result.canceled) {
        setUploadStatus('idle');
        return;
      }
      
      const asset = result.assets[0];
      if (!asset || !asset.uri) {
        setUploadStatus('idle');
        return;
      }
      
      // Use asset's fileSize directly (provided by ImagePicker)
      const fileSize = asset.fileSize || 0;
      
      const selectedFileData: SelectedFile = {
        name: asset.fileName || `video_${Date.now()}.mp4`,
        size: fileSize,
        type: 'video/mp4',
        uri: asset.uri,
      };
      
      const generatedTitle = generateTitleFromFilename(selectedFileData.name);
      const generatedDescription = generateDescriptionFromFile(
        selectedFileData.name,
        fileSize,
        selectedFileData.type
      );
      
      // Set the auto-detected values (user can still edit these)
      setTitle(generatedTitle);
      setDescription(generatedDescription);
      setSelectedFile(selectedFileData);
      setUploadStatus('idle');
      showToast('success', `${selectedFileData.name} recorded. Title, and description auto-filled.`);
    } catch (err: any) {
      console.error('Error recording video:', err);
      setUploadStatus('idle');
      showToast('error', 'Failed to record video. Please try again.');
    }
  };

  // Handle recording audio
  const handleRecordAudio = async () => {
    // For audio recording, we'll use document picker with audio type
    try {
      setUploadStatus('selecting');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-m4a'],
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
      
      // Use asset.size directly - it's provided by DocumentPicker
      const fileSize = file.size || 0;
      
      const selectedFileData: SelectedFile = {
        name: file.name,
        size: fileSize,
        type: file.mimeType || 'audio/mpeg',
        uri: file.uri,
      };
      
      const generatedTitle = generateTitleFromFilename(file.name);
      const generatedDescription = generateDescriptionFromFile(
        file.name,
        fileSize,
        file.mimeType || ''
      );
      
      // Set the auto-detected values (user can still edit these)
      setTitle(generatedTitle);
      setDescription(generatedDescription);
      setSelectedFile(selectedFileData);
      setUploadStatus('idle');
      showToast('success', `${selectedFileData.name} selected. Title, and description auto-filled.`);
    } catch (err: any) {
      console.error('Error selecting audio:', err);
      setUploadStatus('idle');
      showToast('error', 'Failed to select audio file. Please try again.');
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
    // Validate required fields
    const missingFields: string[] = [];
    if (!title.trim()) missingFields.push('Title');
    if (!selectedResourceType) missingFields.push('Resource Type');
    if (!selectedSemester) missingFields.push('Semester');
    if (!selectedYearOfStudy) missingFields.push('Year of Study');
    if (!selectedFaculty) missingFields.push('Faculty');
    if (!selectedDepartment) missingFields.push('Department');
    if (!selectedCourse) missingFields.push('Course');
    if (!selectedUnit) missingFields.push('Unit');
    
    if (missingFields.length > 0) {
      showToast('warning', `Please select: ${missingFields.join(', ')}`);
      return;
    }

    if (!selectedFile) {
      showToast('warning', 'Please select a file to upload');
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
      formData.append('resource_type', selectedResourceType);
      formData.append('semester', selectedSemester);
      formData.append('year_of_study', selectedYearOfStudy);
      formData.append('faculty', selectedFaculty);
      formData.append('department', selectedDepartment);
      formData.append('course', selectedCourse);
      formData.append('unit', selectedUnit);
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
      
      showToast('success', 'Your resource has been uploaded successfully.');
      setTimeout(() => router.replace('/(student)/my-uploads'), 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      
      // Extract detailed error information
      const responseData = err.response?.data;
      let errorMessage =
        responseData?.message ||
        responseData?.error?.message ||
        responseData?.error ||
        'Failed to upload resource. Please try again.';
      
      // Check for validation errors (details field from mobile API)
      const details = responseData?.details || responseData?.error?.details;
      if (details) {
        const fieldErrors = Object.entries(details)
          .map(([field, error]) => `${field}: ${error}`)
          .join('\n');
        if (fieldErrors) {
          errorMessage = `Please fix the following:\n${fieldErrors}`;
        }
      }
      
      showToast('error', errorMessage);
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
              <Text style={styles.dropHint}>Documents, Images, Videos, Audio (Max 50MB)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Quick Capture Options */}
        {!selectedFile && (
          <View style={styles.captureOptions}>
            <TouchableOpacity 
              style={styles.captureOption}
              onPress={handleTakePhoto}
              disabled={isUploading}
            >
              <Icon name="camera" size={24} color={colors.primary[500]} />
              <Text style={styles.captureOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.captureOption}
              onPress={handleRecordVideo}
              disabled={isUploading}
            >
              <Icon name="videocam" size={24} color={colors.error} />
              <Text style={styles.captureOptionText}>Record Video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.captureOption}
              onPress={handleRecordAudio}
              disabled={isUploading}
            >
              <Icon name="mic" size={24} color={colors.warning} />
              <Text style={styles.captureOptionText}>Audio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resource Details Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resource Details</Text>
        </View>

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

        <View style={styles.field}>
          <Text style={styles.label}>Resource Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {resourceTypeOptions.map((resourceType) => (
              <TouchableOpacity
                key={resourceType.value}
                style={[
                  styles.chip,
                  selectedResourceType === resourceType.value && styles.chipActive,
                ]}
                onPress={() => setSelectedResourceType(resourceType.value)}
                disabled={isUploading}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedResourceType === resourceType.value && styles.chipTextActive,
                  ]}
                >
                  {resourceType.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.helperText}>
            This type will be used when students filter resources.
          </Text>
        </View>

        {/* Semester */}
        <View style={styles.field}>
          <Text style={styles.label}>Semester *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {semesters.map((semester) => (
              <TouchableOpacity 
                key={semester.id} 
                style={[
                  styles.chip, 
                  selectedSemester === semester.id && styles.chipActive
                ]} 
                onPress={() => void handleSemesterSelect(semester.id)}
                disabled={isUploading}
              >
                <Text style={[
                  styles.chipText, 
                  selectedSemester === semester.id && styles.chipTextActive
                ]}>{semester.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Year of Study */}
        <View style={styles.field}>
          <Text style={styles.label}>Year of Study *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {yearsOfStudy.map((year) => (
              <TouchableOpacity 
                key={year} 
                style={[
                  styles.chip, 
                  selectedYearOfStudy === year && styles.chipActive
                ]} 
                onPress={() => void handleYearOfStudySelect(year)}
                disabled={isUploading}
              >
                <Text style={[
                  styles.chipText, 
                  selectedYearOfStudy === year && styles.chipTextActive
                ]}>{`Year ${year}`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.helperText}>
            Picking a unit will automatically sync these values to match the academic record.
          </Text>
        </View>

        {/* Faculty */}
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Faculty *</Text>
            <TouchableOpacity
              onPress={() => void refreshAcademicHierarchy()}
              disabled={
                isUploading ||
                loadingData ||
                loadingDepartments ||
                loadingCourses ||
                loadingUnits
              }
            >
              <Text style={styles.refreshAcademicText}>Refresh list</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {faculties.map((faculty) => (
              <TouchableOpacity 
                key={faculty.id} 
                style={[
                  styles.chip, 
                  selectedFaculty === faculty.id && styles.chipActive
                ]} 
                onPress={() => void handleFacultySelect(faculty.id)}
                disabled={isUploading || loadingData}
              >
                <Text style={[
                  styles.chipText, 
                  selectedFaculty === faculty.id && styles.chipTextActive
                ]}>{formatAcademicOptionLabel(faculty.code, faculty.name)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {loadingData && <Text style={styles.helperText}>Loading faculties...</Text>}
          {!loadingData && faculties.length === 0 && (
            <Text style={styles.helperText}>No faculties are available for upload yet.</Text>
          )}
        </View>

        {/* Department */}
        <View style={styles.field}>
          <Text style={styles.label}>Department *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {departments.map((department) => (
              <TouchableOpacity 
                key={department.id} 
                style={[
                  styles.chip, 
                  selectedDepartment === department.id && styles.chipActive
                ]} 
                onPress={() => void handleDepartmentSelect(department.id)}
                disabled={isUploading || !selectedFaculty || loadingDepartments}
              >
                <Text style={[
                  styles.chipText, 
                  selectedDepartment === department.id && styles.chipTextActive
                ]}>{formatAcademicOptionLabel(department.code, department.name)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!selectedFaculty && (
            <Text style={styles.helperText}>Select a faculty first.</Text>
          )}
          {selectedFaculty && loadingDepartments && (
            <Text style={styles.helperText}>Loading departments...</Text>
          )}
          {selectedFaculty && !loadingDepartments && departments.length === 0 && (
            <Text style={styles.helperText}>No departments found for the selected faculty.</Text>
          )}
        </View>

        {/* Course */}
        <View style={styles.field}>
          <Text style={styles.label}>Course *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {courses.map((course) => (
              <TouchableOpacity 
                key={course.id} 
                style={[
                  styles.chip, 
                  selectedCourse === course.id && styles.chipActive
                ]} 
                onPress={() => void handleCourseSelect(course.id)}
                disabled={
                  isUploading ||
                  !selectedDepartment ||
                  loadingCourses
                }
              >
                <Text style={[
                  styles.chipText, 
                  selectedCourse === course.id && styles.chipTextActive
                ]}>{formatAcademicOptionLabel(course.code, course.name)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!selectedDepartment && (
            <Text style={styles.helperText}>Select a department first.</Text>
          )}
          {selectedDepartment && loadingCourses && (
            <Text style={styles.helperText}>Loading courses...</Text>
          )}
          {selectedDepartment && !loadingCourses && courses.length === 0 && (
            <Text style={styles.helperText}>
              No courses found for the selected department.
            </Text>
          )}
        </View>

        {/* Unit */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {units.map((unit) => (
              <TouchableOpacity 
                key={unit.id} 
                style={[
                  styles.chip, 
                  selectedUnit === unit.id && styles.chipActive
                ]} 
                onPress={() => handleUnitSelect(unit)}
                disabled={
                  isUploading ||
                  !selectedCourse ||
                  loadingUnits
                }
              >
                <Text style={[
                  styles.chipText, 
                  selectedUnit === unit.id && styles.chipTextActive
                ]}>{formatAcademicOptionLabel(unit.code, unit.name)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!selectedCourse && (
            <Text style={styles.helperText}>Select a course first.</Text>
          )}
          {selectedCourse && (!selectedSemester || !selectedYearOfStudy) && (
            <Text style={styles.helperText}>
              Select semester and year of study to filter units strictly.
            </Text>
          )}
          {selectedCourse && loadingUnits && (
            <Text style={styles.helperText}>Loading units...</Text>
          )}
          {selectedCourse && selectedSemester && selectedYearOfStudy && !loadingUnits && units.length === 0 && (
            <Text style={styles.helperText}>
              No units found for the selected course, semester, and year of study.
            </Text>
          )}
          {selectedCourse && selectedSemester && selectedYearOfStudy && !loadingUnits && units.length > 0 && (
            <Text style={styles.helperText}>
              Showing only units that match the selected semester and year of study.
            </Text>
          )}
        </View>

        {(selectedFacultyDetails ||
          selectedDepartmentDetails ||
          selectedCourseDetails ||
          selectedUnitDetails) && (
          <View style={styles.selectionSummaryCard}>
            <Text style={styles.selectionSummaryTitle}>Selected Academic Path</Text>
            {selectedFacultyDetails && (
              <Text style={styles.selectionSummaryText}>
                Faculty: {formatAcademicOptionLabel(selectedFacultyDetails.code, selectedFacultyDetails.name)}
              </Text>
            )}
            {selectedDepartmentDetails && (
              <Text style={styles.selectionSummaryText}>
                Department: {formatAcademicOptionLabel(selectedDepartmentDetails.code, selectedDepartmentDetails.name)}
              </Text>
            )}
            {selectedCourseDetails && (
              <Text style={styles.selectionSummaryText}>
                Course: {formatAcademicOptionLabel(selectedCourseDetails.code, selectedCourseDetails.name)}
              </Text>
            )}
            {selectedUnitDetails && (
              <Text style={styles.selectionSummaryText}>
                Unit: {formatAcademicOptionLabel(selectedUnitDetails.code, selectedUnitDetails.name)}
              </Text>
            )}
            {selectedSemester && (
              <Text style={styles.selectionSummaryText}>Semester: {selectedSemester}</Text>
            )}
            {selectedYearOfStudy && (
              <Text style={styles.selectionSummaryText}>Year of Study: {selectedYearOfStudy}</Text>
            )}
          </View>
        )}

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
  captureOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing[4],
    paddingVertical: spacing[3],
  },
  captureOption: {
    alignItems: 'center',
    backgroundColor: colors.card.light,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: 90,
  },
  captureOptionText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing[1],
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
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  label: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: colors.text.primary, 
    marginBottom: spacing[3] 
  },
  refreshAcademicText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
    marginBottom: spacing[3],
  },
  input: { 
    backgroundColor: colors.gray[50], 
    borderRadius: 12, 
    padding: spacing[4], 
    fontSize: 15, 
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.gray[200],
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
    paddingVertical: spacing[3], 
    borderRadius: 24, 
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: { 
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  chipText: { 
    fontSize: 14, 
    fontWeight: '500',
    color: colors.text.secondary 
  },
  helperText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
  selectionSummaryCard: {
    backgroundColor: colors.primary[50],
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  selectionSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  selectionSummaryText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  chipTextActive: { 
    color: colors.text.inverse,
    fontWeight: '600',
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
