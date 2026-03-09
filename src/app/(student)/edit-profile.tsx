// Edit Profile Screen for CampusHub
// Backend-driven with real API integration

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { userAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  registration_number: string;
  phone_number: string;
  profile_image: string;
  profile_image_url: string;
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
    address: string;
    city: string;
    country: string;
    website: string;
    facebook: string;
    twitter: string;
    linkedin: string;
  };
}

const EditProfileScreen: React.FC = () => {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  
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
  const [year, setYear] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  
  // Extended profile fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Avatar
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
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
      
      // Extended profile
      setAddress(profile.profile?.address || '');
      setCity(profile.profile?.city || '');
      setCountry(profile.profile?.country || '');
      setWebsite(profile.profile?.website || '');
      setFacebook(profile.profile?.facebook || '');
      setTwitter(profile.profile?.twitter || '');
      setLinkedin(profile.profile?.linkedin || '');
      setDateOfBirth(profile.profile?.date_of_birth || '');
      
      // Avatar
      setAvatar(profile.profile_image_url || profile.profile_image || null);
      setProfileImageUrl(profile.profile_image_url || profile.profile_image || null);
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in your name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await userAPI.updateFullProfile({
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone_number: phone.trim(),
        registration_number: studentId.trim() || undefined,
        year_of_study: year ? parseInt(year, 10) : undefined,
        semester: semester ? parseInt(semester, 10) : undefined,
        bio: bio.trim(),
        date_of_birth: dateOfBirth || undefined,
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        website: website.trim(),
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
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          'Failed to update profile. Please try again.';
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
        { text: 'Take Photo', onPress: () => Alert.alert('Camera', 'Camera feature coming soon') },
        { text: 'Choose from Gallery', onPress: () => Alert.alert('Gallery', 'Gallery feature coming soon') },
        { text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemovePhoto = async () => {
    try {
      await userAPI.deleteProfilePhoto();
      setAvatar(null);
      setProfileImageUrl(null);
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
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
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
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={facultyName} 
                editable={false}
                placeholder="Faculty (read-only)"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department</Text>
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={departmentName} 
                editable={false}
                placeholder="Department (read-only)"
                placeholderTextColor={colors.text.tertiary}
              />
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

        {/* Location Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput 
                style={styles.input} 
                value={address} 
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput 
                style={styles.input} 
                value={city} 
                onChangeText={setCity}
                placeholder="Enter city"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            
            <View style={styles.inputDivider} />
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Country</Text>
              <TextInput 
                style={styles.input} 
                value={country} 
                onChangeText={setCountry}
                placeholder="Enter country"
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
  bottomSpacing: {
    height: spacing[16],
  },
});

export default EditProfileScreen;
