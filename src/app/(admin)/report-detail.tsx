// Admin Report Detail Screen for CampusHub
// Detailed view of a report

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/ui/Icon';
import ErrorState from '../../components/ui/ErrorState';
import { adminAPI } from '../../services/api';

interface ReportDetail {
  id: string;
  report_type: string;
  reason: string;
  description: string;
  status: string;
  reported_by: { id: string; first_name: string; last_name: string; email: string };
  reported_content?: { type: string; id: string; title?: string; content?: string };
  admin_note?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: { id: string; first_name: string; last_name: string };
}

const ReportDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchReport = useCallback(async () => {
    try {
      setError(null);
      const response = await adminAPI.getReport(String(id));
      setReport(response.data.data);
      setAdminNote(response.data.data.admin_note || '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleUpdateStatus = async (status: string) => {
    try {
      let response;
      if (status === 'resolved') {
        response = await adminAPI.resolveReport(String(id), adminNote);
      } else if (status === 'dismissed') {
        response = await adminAPI.dismissReport(String(id), adminNote);
      } else {
        response = await adminAPI.updateReport(String(id), {
          status,
          resolution_note: adminNote,
        });
      }
      setReport(response.data.data);
      setAdminNote(response.data.data.admin_note || '');
      Alert.alert('Success', `Report ${status}`);
    } catch (err) { Alert.alert('Error', 'Failed to update'); }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  if (error || !report) return <ErrorState type="server" title="Failed" message={error || 'Not found'} onRetry={fetchReport} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Icon name={'arrow-back'} size={24} color={colors.text.inverse} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
      </View>

      <ScrollView>
        <View style={styles.card}>
          <View style={styles.badges}>
            <View style={styles.badge}><Text style={styles.badgeText}>{report.report_type}</Text></View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    report.status === 'resolved'
                      ? colors.success + '20'
                      : report.status === 'dismissed'
                        ? colors.text.tertiary + '20'
                        : report.status === 'in_review'
                          ? colors.info + '20'
                          : colors.warning + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      report.status === 'resolved'
                        ? colors.success
                        : report.status === 'dismissed'
                          ? colors.text.tertiary
                          : report.status === 'in_review'
                            ? colors.info
                            : colors.warning,
                  },
                ]}
              >
                {report.status}
              </Text>
            </View>
          </View>

          <Text style={styles.reason}>{report.reason}</Text>
          <Text style={styles.description}>{report.description}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reporter</Text>
            <Text style={styles.info}>{report.reported_by?.first_name} {report.reported_by?.last_name}</Text>
            <Text style={styles.infoMeta}>{report.reported_by?.email}</Text>
          </View>

          {report.reported_content && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reported Content</Text>
              <View style={styles.contentPreview}>
                <Text style={styles.contentTitle}>{report.reported_content.title || 'Content'}</Text>
                <Text style={styles.contentText} numberOfLines={3}>{report.reported_content.content}</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note about this report..."
              placeholderTextColor={colors.text.tertiary}
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.success + '20' }]} onPress={() => handleUpdateStatus('resolved')}>
              <Icon name={'checkmark-circle'} size={20} color={colors.success} /><Text style={[styles.btnText, { color: colors.success }]}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.info + '20' }]} onPress={() => handleUpdateStatus('in_review')}>
              <Icon name={'eye'} size={20} color={colors.info} /><Text style={[styles.btnText, { color: colors.info }]}>Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.error + '20' }]} onPress={() => handleUpdateStatus('dismissed')}>
              <Icon name={'close-circle'} size={20} color={colors.error} /><Text style={[styles.btnText, { color: colors.error }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], paddingTop: spacing[8], backgroundColor: colors.primary[500] },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.inverse, marginLeft: spacing[3] },
  card: { backgroundColor: colors.card.light, margin: spacing[4], borderRadius: borderRadius.xl, padding: spacing[6], ...shadows.md },
  badges: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  badge: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], backgroundColor: colors.primary[500] + '20', borderRadius: borderRadius.full },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.primary[500] },
  reason: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  description: { fontSize: 15, color: colors.text.secondary, marginTop: spacing[2], lineHeight: 22 },
  section: { marginTop: spacing[6] },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[2] },
  info: { fontSize: 15, color: colors.text.primary },
  infoMeta: { fontSize: 13, color: colors.text.tertiary },
  contentPreview: { backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing[3] },
  contentTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  contentText: { fontSize: 13, color: colors.text.secondary, marginTop: spacing[1] },
  noteInput: { backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing[3], fontSize: 14, color: colors.text.primary, minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', marginTop: spacing[6], gap: spacing[2] },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[3], borderRadius: borderRadius.lg, gap: spacing[1] },
  btnText: { fontSize: 12, fontWeight: '600' },
});

export default ReportDetailScreen;
