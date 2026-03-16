// Edit Profile Screen for CampusHub
// Backend-driven with real API integration

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, Modal, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI, publicAcademicAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  registration_number: string;
  phone_number: string;
  avatar?: string;
  profile_image?: string;
  profile_image_url?: string;
  faculty: number | null;
  faculty_name: string;
  department: number | null;
  department_name: string;
  course: number | null;
  course_name: string;
  year_of_study: number | null;
  semester: number | null;
  role: string;
  is_verified: boolean;
  date_joined: string;
  profile: {
    bio: string;
    date_of_birth: string | null;
    website: string;
    facebook: string;
    twitter: string;
    linkedin: string;
  };
}

const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  const normalizedDigits = digits.replace(/^0+/, '');
  if (!normalizedDigits) return '';
  return hasPlus ? `+${normalizedDigits}` : normalizedDigits;
};

const normalizeWebsite = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isValidIsoDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map((item) => Number(item));
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const normalizeDateOfBirth = (value: string): { value: string | null; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { value: null };

  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (isoPattern.test(trimmed)) {
    if (isValidIsoDate(trimmed)) return { value: trimmed };
  }

  const slashPattern = /^\d{2}\/\d{2}\/\d{4}$/;
  if (slashPattern.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    const isoValue = `${year}-${month}-${day}`;
    if (isValidIsoDate(isoValue)) return { value: isoValue };
  }

  const dashPattern = /^\d{2}-\d{2}-\d{4}$/;
  if (dashPattern.test(trimmed)) {
    const [day, month, year] = trimmed.split('-');
    const isoValue = `${year}-${month}-${day}`;
    if (isValidIsoDate(isoValue)) return { value: isoValue };
  }

  return { value: null, error: 'Date of birth must be in YYYY-MM-DD format.' };
};

const resolveAcademicSelection = (
  selectedId: string,
  options: Array<{ id: string | number }>
): { value: string | number | null | undefined; invalid: boolean } => {
  if (!selectedId) return { value: undefined, invalid: false };
  if (!options.length) {
    const numericId = Number(selectedId);
    if (Number.isFinite(numericId)) {
      return { value: numericId, invalid: false };
    }
    return { value: selectedId, invalid: false };
  }
  const match = options.find((option) => String(option.id) === String(selectedId));
  if (!match) return { value: null, invalid: true };
  const numericId = Number(match.id);
  if (Number.isFinite(numericId)) {
    return { value: numericId, invalid: false };
  }
  return { value: String(match.id), invalid: false };
};

const EditProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  
  // Academic fields
  const [studentId, setStudentId] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [year, setYear] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  
  // Faculty/Course/Department selection state
  const [faculties, setFaculties] = useState<{id: string; name: string; code: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string; name: string; code: string}[]>([]);
  const [courses, setCourses] = useState<{id: string; name: string; code: string}[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // Extended profile fields
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Avatar
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const resolveAvatar = useCallback((profile: UserProfile | null): string | null => {
    const profileAvatar =
      profile?.avatar || profile?.profile_image_url || profile?.profile_image || null;
    const cachedAvatar = user?.avatar || null;
    if (profileAvatar && cachedAvatar) {
      const profileBase = profileAvatar.split('?')[0];
      const cachedBase = cachedAvatar.split('?')[0];
      if (profileBase === cachedBase && cachedAvatar.includes('v=')) {
        return cachedAvatar;
      }
    }
    return profileAvatar || cachedAvatar;
  }, [user]);

  const appendCacheBuster = (value?: string | null): string | null => {
    if (!value) return null;
    const separator = value.includes('?') ? '&' : '?';
    return `${value}${separator}v=${Date.now()}`;
  };

  const buildCourseFilters = useCallback(
    (yearValue?: string | number | null, semesterValue?: string | number | null) => ({
      semester: semesterValue ? String(semesterValue) : undefined,
      yearOfStudy: yearValue ? String(yearValue) : undefined,
    }),
    []
  );

  // Fetch faculties and courses on mount
  const fetchAcademics = useCallback(async (profileData: UserProfile) => {
    try {
      setLoadingFaculties(true);
      const facultiesResponse = await publicAcademicAPI.getFaculties();
      const facultiesData = facultiesResponse.data?.data?.faculties || facultiesResponse.data?.data?.results || [];
      setFaculties(facultiesData);
      
      // If user has a faculty, fetch departments and courses for it
      if (profileData.faculty) {
        const foundFaculty = facultiesData.find((f: any) => String(f.id) === String(profileData.faculty));
        if (!foundFaculty) {
          setSelectedFacultyId('');
          setFacultyName('');
          setSelectedDepartmentId('');
          setDepartmentName('');
          setSelectedCourseId('');
          setCourseName('');
          setDepartments([]);
          setCourses([]);
          return;
        }

        setSelectedFacultyId(String(profileData.faculty));
        setFacultyName(foundFaculty.name);
        
        // Fetch departments for faculty
        let departmentsData: Array<{ id: string; name: string; code: string }> = [];
        try {
          const departmentsResponse = await publicAcademicAPI.getDepartments(String(profileData.faculty));
          departmentsData = departmentsResponse.data?.data?.departments || departmentsResponse.data?.data?.results || [];
          setDepartments(departmentsData);
          
          // If user has a department, find department name
          if (profileData.department) {
            const foundDepartment = departmentsData.find((d: any) => String(d.id) === String(profileData.department));
            if (foundDepartment) {
              setSelectedDepartmentId(String(profileData.department));
              setDepartmentName(foundDepartment.name);
            } else {
              setSelectedDepartmentId('');
              setDepartmentName('');
            }
          }
        } catch (err) {
          console.error('Failed to fetch departments:', err);
        }

        const courseFilters = buildCourseFilters(profileData.year_of_study, profileData.semester);

        if (profileData.department) {
          try {
            setLoadingCourses(true);
            const coursesResponse = await publicAcademicAPI.getCourses(
              String(profileData.department),
              courseFilters
            );
            const coursesData = coursesResponse.data?.data?.courses || coursesResponse.data?.data?.results || [];
            setCourses(coursesData);
            
            // If user has a course, find course name
            if (profileData.course) {
              const foundCourse = coursesData.find((c: any) => String(c.id) === String(profileData.course));
              if (foundCourse) {
                setSelectedCourseId(String(profileData.course));
                setCourseName(foundCourse.name);
              } else {
                setSelectedCourseId('');
                setCourseName('');
              }
            }
          } catch (err) {
            console.error('Failed to fetch courses:', err);
            setCourses([]);
          } finally {
            setLoadingCourses(false);
          }
        } else if (!departmentsData.length) {
          // Backward compatibility when departments are not configured
          try {
            setLoadingCourses(true);
            const coursesResponse = await publicAcademicAPI.getCourses(
              String(profileData.faculty),
              courseFilters,
              true
            );
            const coursesData = coursesResponse.data?.data?.courses || coursesResponse.data?.data?.results || [];
            setCourses(coursesData);
            
            if (profileData.course) {
              const foundCourse = coursesData.find((c: any) => String(c.id) === String(profileData.course));
              if (foundCourse) {
                setSelectedCourseId(String(profileData.course));
                setCourseName(foundCourse.name);
              } else {
                setSelectedCourseId('');
                setCourseName('');
              }
            }
          } catch (err) {
            console.error('Failed to fetch courses:', err);
            setCourses([]);
          } finally {
            setLoadingCourses(false);
          }
        } else {
          setCourses([]);
          setSelectedCourseId('');
          setCourseName('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch academics:', error);
    } finally {
      setLoadingFaculties(false);
    }
  }, [buildCourseFilters]);
  
  // Fetch profile data
  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      const profile: UserProfile = response.data.data;
      
      // Parse full name
      const nameParts = (profile.full_name || '').split(' ');
      const first = nameParts[0] || '';
      const last = nameParts.slice(1).join(' ');
      
      setFirstName(first);
      setLastName(last);
      setEmail(profile.email || '');
      setPhone(profile.phone_number || '');
      setBio(profile.profile?.bio || '');
      setStudentId(profile.registration_number || '');
      setFacultyName(profile.faculty_name || '');
      setDepartmentName(profile.department_name || '');
      setYear(profile.year_of_study?.toString() || '');
      setSemester(profile.semester?.toString() || '');
      const resolvedAvatar = resolveAvatar(profile);
      setAvatar(resolvedAvatar);
      setProfileImageUrl(resolvedAvatar);
      
      // Store profile for use in fetchAcademics
      return profile;
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [resolveAvatar]);

  // Load academics after profile
  useEffect(() => {
    const loadData = async () => {
      const profile = await fetchProfile();
      if (profile) {
        await fetchAcademics(profile);
      }
    };
    loadData();
  }, [fetchProfile, fetchAcademics]);
  
  // Handle faculty selection
  const handleFacultySelect = async (faculty: {id: string; name: string}) => {
    setSelectedFacultyId(faculty.id);
    setFacultyName(faculty.name);
    setSelectedDepartmentId('');
    setSelectedCourseId('');
    setDepartmentName('');
    setCourseName('');
    setDepartments([]);
    setCourses([]);
    setShowFacultyPicker(false);
    
    // Fetch departments for selected faculty
    let departmentsData: Array<{ id: string; name: string; code: string }> = [];
    try {
      setLoadingDepartments(true);
      const departmentsResponse = await publicAcademicAPI.getDepartments(faculty.id);
      departmentsData = departmentsResponse.data?.data?.departments || departmentsResponse.data?.data?.results || [];
      setDepartments(departmentsData);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }

    // Fetch courses by faculty only when departments are not configured
    if (!departmentsData.length) {
      try {
        setLoadingCourses(true);
        const coursesResponse = await publicAcademicAPI.getCourses(
          faculty.id,
          buildCourseFilters(year, semester),
          true
        );
        const coursesData = coursesResponse.data?.data?.courses || coursesResponse.data?.data?.results || [];
        setCourses(coursesData);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    }
  };
  
  // Handle department selection
  const handleDepartmentSelect = async (department: {id: string; name: string}) => {
    setSelectedDepartmentId(department.id);
    setDepartmentName(department.name);
    setSelectedCourseId('');
    setCourseName('');
    setCourses([]);
    setShowDepartmentPicker(false);
    
    // Fetch courses for selected department
    try {
      setLoadingCourses(true);
      const coursesResponse = await publicAcademicAPI.getCourses(
        department.id,
        buildCourseFilters(year, semester)
      );
      const coursesData = coursesResponse.data?.data?.courses || coursesResponse.data?.data?.results || [];
      setCourses(coursesData);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // Handle course selection
  const handleCourseSelect = (course: {id: string; name: string}) => {
    setSelectedCourseId(course.id);
    setCourseName(course.name);
    setShowCoursePicker(false);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in your name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    const normalizedDob = normalizeDateOfBirth(dateOfBirth);
    if (normalizedDob.error) {
      Alert.alert('Error', normalizedDob.error);
      return;
    }
    
    setSaving(true);
    
    const facultySelection = resolveAcademicSelection(selectedFacultyId, faculties);
    const departmentSelection = resolveAcademicSelection(selectedDepartmentId, departments);
    const courseSelection = resolveAcademicSelection(selectedCourseId, courses);
    const invalidSelections = [
      facultySelection.invalid ? 'Faculty' : null,
      departmentSelection.invalid ? 'Department' : null,
      courseSelection.invalid ? 'Course' : null,
    ].filter(Boolean) as string[];

    if (invalidSelections.length) {
      Alert.alert(
        'Selection Updated',
        `Your ${invalidSelections.join(', ')} selection is outdated and will be cleared. Please pick a valid option.`
      );
    }

    try {
      const response = await userAPI.updateFullProfile({
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone_number: normalizePhoneNumber(phone),
        registration_number: studentId.trim() || undefined,
        faculty: facultySelection.invalid ? null : facultySelection.value,
        department: departmentSelection.invalid ? null : departmentSelection.value,
        course: courseSelection.invalid ? null : courseSelection.value,
        year_of_study: year ? parseInt(year, 10) : undefined,
        semester: semester ? parseInt(semester, 10) : undefined,
        bio: bio.trim(),
        date_of_birth: normalizedDob.value,
        website: normalizeWebsite(website),
        facebook: facebook.trim(),
        twitter: twitter.trim(),
        linkedin: linkedin.trim(),
      });
      
      // Update auth store with new user data
      if (response.data.data) {
        updateUser(response.data.data);
      }
      
      Alert.alert('Success', 'Profile updated successfully!', [{ 
        text: 'OK', 
        onPress: () => router.back() 
      }]);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const responseData = error.response?.data;
      let errorMessage =
        responseData?.message ||
        responseData?.detail ||
        'Failed to update profile. Please try again.';

      if (
        (!responseData?.message && !responseData?.detail) &&
        responseData &&
        typeof responseData === 'object'
      ) {
        const fieldMessage = Object.entries(responseData)
          .map(([field, value]) => {
            const message = Array.isArray(value) ? value[0] : value;
            if (!message) return '';
            return `${field}: ${String(message)}`;
          })
          .filter(Boolean)
          .join('\n');
        if (fieldMessage) {
          errorMessage = fieldMessage;
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Change Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
        { text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profile_image', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await userAPI.uploadProfilePhoto(formData);
      const payload = response.data?.data || response.data || {};
      const uploadedUrl = payload.profile_image_url || payload.profile_image || null;
      const resolvedUrl = uploadedUrl || uri;
      const displayUrl = uploadedUrl ? appendCacheBuster(uploadedUrl) : resolvedUrl;
      
      if (response.data) {
        setAvatar(displayUrl);
        setProfileImageUrl(resolvedUrl);
        updateUser({ avatar: displayUrl || resolvedUrl });
        Alert.alert('Success', 'Profile photo updated successfully');
      }
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload photo');
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await userAPI.deleteProfilePhoto();
      setAvatar(null);
      setProfileImageUrl(null);
      updateUser({ avatar: '' });
      Alert.alert('Success', 'Profile photo removed');
    } catch (error: any) {
      console.error('Failed to remove photo:', error);
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  const getYearLabel = (yearValue?: string) => {
    if (!yearValue) return 'Select Year';
    const yearNum = parseInt(yearValue, 10);
    switch (yearNum) {
      case 1: return 'First Year';
      case 2: return 'Second Year';
      case 3: return 'Third Year';
      case 4: return 'Fourth Year';
      case 5: return 'Fifth Year';
      case 6: return 'Sixth Year';
      default: return `Year ${yearNum}`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
          <Icon name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          style={[styles.headerButton, styles.saveButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {firstName[0]?.toUpperCase() || 'U'}{lastName[0]?.toUpperCase() || ''}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleChangePhoto}
            >
              <Icon name="camera" size={16} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput 
                style={styles.input} 
                value={firstName} 
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput 
                style={styles.input} 
                value={lastName} 
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={email} 
                editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email address"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput 
                style={styles.input} 
                value={phone} 
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput 
                style={styles.input} 
                value={dateOfBirth} 
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={bio} 
                onChangeText={setBio}
                numberOfLines={4}
                placeholder="Tell us about yourself..."
                placeholderTextColor={colors.text.tertiary}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Academic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Student ID / Registration Number</Text>
              <TextInput 
                style={styles.input} 
                value={studentId} 
                onChangeText={setStudentId}
                placeholder="Enter student ID"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Faculty</Text>
              <TouchableOpacity 
                style={[styles.input, styles.pickerButton]} 
                onPress={() => {
                  if (loadingFaculties) return;
                  setShowFacultyPicker(true);
                }}
                disabled={loadingFaculties}
              >
                {loadingFaculties ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <>
                    <Text style={[styles.pickerText, !facultyName && styles.pickerPlaceholder]}>
                      {facultyName || 'Select Faculty'}
                    </Text>
                    <Icon name="chevron-down" size={20} color={colors.text.secondary} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department</Text>
              <TouchableOpacity 
                style={[styles.input, styles.pickerButton, !selectedFacultyId && styles.pickerDisabled]} 
                onPress={() => {
                  if (!selectedFacultyId) {
                    Alert.alert('Select Faculty First', 'Please select a faculty before choosing a department.');
                    return;
                  }
                  if (loadingDepartments) return;
                  setShowDepartmentPicker(true);
                }}
                disabled={loadingDepartments || !selectedFacultyId}
              >
                {loadingDepartments ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <>
                    <Text style={[styles.pickerText, !departmentName && styles.pickerPlaceholder]}>
                      {departmentName || 'Select Department'}
                    </Text>
                    <Icon name="chevron-down" size={20} color={colors.text.secondary} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course</Text>
              <TouchableOpacity 
                style={[styles.input, styles.pickerButton, !selectedDepartmentId && styles.pickerDisabled]} 
                onPress={() => {
                  if (!selectedDepartmentId) {
                    Alert.alert('Select Department First', 'Please select a department before choosing a course.');
                    return;
                  }
                  if (loadingCourses) return;
                  setShowCoursePicker(true);
                }}
                disabled={loadingCourses || !selectedDepartmentId}
              >
                {loadingCourses ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <>
                    <Text style={[styles.pickerText, !courseName && styles.pickerPlaceholder]}>
                      {courseName || 'Select Course'}
                    </Text>
                    <Icon name="chevron-down" size={20} color={colors.text.secondary} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year of Study</Text>
              <TextInput 
                style={styles.input} 
                value={year} 
                onChangeText={setYear}
                placeholder="1-6"
                keyboardType="number-pad"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Semester</Text>
              <TextInput 
                style={styles.input} 
                value={semester} 
                onChangeText={setSemester}
                placeholder="1 or 2"
                keyboardType="number-pad"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>
        </View>

        {/* Social Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Links</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput 
                style={styles.input} 
                value={website} 
                onChangeText={setWebsite}
                placeholder="https://yourwebsite.com"
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput 
                style={styles.input} 
                value={facebook} 
                onChangeText={setFacebook}
                placeholder="facebook.com/username"
                autoCapitalize="none"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Twitter</Text>
              <TextInput 
                style={styles.input} 
                value={twitter} 
                onChangeText={setTwitter}
                placeholder="@username"
                autoCapitalize="none"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LinkedIn</Text>
              <TextInput 
                style={styles.input} 
                value={linkedin} 
                onChangeText={setLinkedin}
                placeholder="linkedin.com/in/username"
                autoCapitalize="none"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Faculty Picker Modal */}
      <Modal
        visible={showFacultyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFacultyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Faculty</Text>
              <TouchableOpacity onPress={() => setShowFacultyPicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            {loadingFaculties ? (
              <ActivityIndicator size="large" color={colors.primary[500]} />
            ) : faculties.length === 0 ? (
              <Text style={styles.emptyText}>No faculties available</Text>
            ) : (
              <FlatList
                data={faculties}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedFacultyId === item.id && styles.optionItemSelected,
                    ]}
                    onPress={() => handleFacultySelect(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedFacultyId === item.id && styles.optionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedFacultyId === item.id && (
                      <Icon name="checkmark" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Department Picker Modal */}
      <Modal
        visible={showDepartmentPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDepartmentPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setShowDepartmentPicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            {loadingDepartments ? (
              <ActivityIndicator size="large" color={colors.primary[500]} />
            ) : departments.length === 0 ? (
              <Text style={styles.emptyText}>No departments available for this faculty</Text>
            ) : (
              <FlatList
                data={departments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedDepartmentId === item.id && styles.optionItemSelected,
                    ]}
                    onPress={() => handleDepartmentSelect(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedDepartmentId === item.id && styles.optionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedDepartmentId === item.id && (
                      <Icon name="checkmark" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Course Picker Modal */}
      <Modal
        visible={showCoursePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCoursePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setShowCoursePicker(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            {loadingCourses ? (
              <ActivityIndicator size="large" color={colors.primary[500]} />
            ) : courses.length === 0 ? (
              <Text style={styles.emptyText}>No courses available for this selection</Text>
            ) : (
              <FlatList
                data={courses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedCourseId === item.id && styles.optionItemSelected,
                    ]}
                    onPress={() => handleCourseSelect(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedCourseId === item.id && styles.optionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedCourseId === item.id && (
                      <Icon name="checkmark" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
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
  loadingText: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    width: 'auto',
    paddingHorizontal: spacing[4],
    height: 36,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[8],
  },
  avatarSection: {
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: colors.card.light,
    marginBottom: spacing[6],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.card.light,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  section: {
    marginHorizontal: spacing[6],
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  inputGroup: {
    paddingVertical: spacing[2],
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: 15,
    color: colors.text.primary,
  },
  disabledInput: {
    opacity: 0.7,
    color: colors.text.tertiary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing[4],
  },
  inputDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[2],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  pickerPlaceholder: {
    color: colors.text.tertiary,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  bottomSpacing: {
    height: spacing[16],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card.light,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing[8],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    padding: spacing[8],
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionItemSelected: {
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary[500],
    fontWeight: '600',
  },
});

export default EditProfileScreen;
