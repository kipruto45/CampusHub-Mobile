// Admin Profile Screen for CampusHub
// Admin profile information

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: '', phone_number: '', bio: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await adminAPI.getCurrentProfile();
        console.log('PROFILE_RESPONSE:', JSON.stringify(response));
        const profile = response.data.data;
        console.log('PROFILE_DATA:', JSON.stringify(profile));
        setUser(profile);
        setFormData({
          full_name: profile.full_name || '',
          phone_number: profile.phone || '',
          bio: profile.bio || '',
        });
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
        console.error('Profile error response:', err.response?.data);
      } finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    // Only include fields that have values
    const dataToUpdate: any = {};
    if (formData.full_name?.trim()) {
      dataToUpdate.full_name = formData.full_name.trim();
    }
    if (formData.phone_number?.trim()) {
      dataToUpdate.phone_number = formData.phone_number.trim();
    }
    if (formData.bio?.trim()) {
      dataToUpdate.bio = formData.bio.trim();
    }
    
    // Check if there's anything to update
    if (Object.keys(dataToUpdate).length === 0) {
      Alert.alert('Error', 'Please fill in at least one field to update');
      return;
    }
    
    try {
      setSaving(true);
      const response = await adminAPI.updateCurrentProfile(dataToUpdate);
      const profile = response.data.data;
      setUser(profile);
      setFormData({
        full_name: profile.full_name || '',
        phone_number: profile.phone || '',
        bio: profile.bio || '',
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => editing ? setEditing(false) : setEditing(true)}>
          <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.first_name?.[0] || user?.full_name?.[0] || 'A'}</Text></View>
          <Text style={styles.name}>{user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleText}>{user?.role || 'Admin'}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {editing ? (
            <>
              <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={colors.text.tertiary} value={formData.full_name} onChangeText={(t) => setFormData({ ...formData, full_name: t })} />
              <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor={colors.text.tertiary} value={formData.phone_number} onChangeText={(t) => setFormData({ ...formData, phone_number: t })} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Bio" placeholderTextColor={colors.text.tertiary} value={formData.bio} onChangeText={(t) => setFormData({ ...formData, bio: t })} multiline />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.row}><Text style={styles.label}>Full Name</Text><Text style={styles.value}>{user?.full_name || '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Phone</Text><Text style={styles.value}>{user?.phone || '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Bio</Text><Text style={styles.value}>{user?.bio || '-'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Role</Text><Text style={styles.value}>{user?.role || 'Admin'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Joined</Text><Text style={styles.value}>{user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Last Login</Text><Text style={styles.value}>{user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}</Text></View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Icon name={'log-out'} size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse },
  editBtn: { fontSize: 16, color: colors.text.inverse, textDecorationLine: 'underline' },
  profileCard: { alignItems: 'center', padding: spacing[8], backgroundColor: colors.background.primary },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[500], justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '600', color: colors.text.inverse },
  name: { fontSize: 24, fontWeight: '700', color: colors.text.primary, marginTop: spacing[4] },
  email: { fontSize: 14, color: colors.text.secondary, marginTop: spacing[1] },
  roleBadge: { marginTop: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[1], backgroundColor: colors.primary[500] + '20', borderRadius: borderRadius.full },
  roleText: { fontSize: 12, fontWeight: '600', color: colors.primary[500] },
  card: { backgroundColor: colors.card.light, margin: spacing[4], borderRadius: borderRadius.xl, padding: spacing[6], ...shadows.sm },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.light },
  label: { fontSize: 14, color: colors.text.secondary },
  value: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  input: { backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing[3], fontSize: 15, color: colors.text.primary, marginBottom: spacing[3] },
  saveBtn: { backgroundColor: colors.primary[500], borderRadius: borderRadius.lg, padding: spacing[3], alignItems: 'center', marginTop: spacing[2] },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: colors.text.inverse },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: spacing[4], padding: spacing[4], backgroundColor: colors.error + '15', borderRadius: borderRadius.xl, gap: spacing[2] },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.error },
});

export default ProfileScreen;
