// Certificates Screen
// Lists user certificates, supports verification, and PDF download via backend.

import { useRouter } from 'expo-router';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import { certificatesAPI,getApiBaseUrl,getAuthToken } from '../../services/api';
import { localDownloadsService } from '../../services/local-downloads.service';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { borderRadius,spacing } from '../../theme/spacing';

type CertificateSummary = {
  uniqueId: string;
  title: string;
  typeName: string;
  recipientName: string;
  status: string;
  issueDate: string;
  expiryDate?: string;
  verificationUrl?: string;
};

type CertificateDetail = {
  uniqueId: string;
  title: string;
  status: string;
  recipientName: string;
  description?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  verificationUrl?: string;
  pdfFile?: string | null;
  qrCode?: string | null;
  certificateTypeName?: string;
  templateName?: string;
  notes?: string;
};

const normalizeSummary = (raw: any): CertificateSummary => ({
  uniqueId: String(raw?.unique_id || raw?.uniqueId || raw?.id || '').trim(),
  title: String(raw?.title || '').trim() || 'Certificate',
  typeName: String(raw?.certificate_type_name || raw?.certificateTypeName || '').trim(),
  recipientName: String(raw?.recipient_name || raw?.recipientName || raw?.user_name || '').trim(),
  status: String(raw?.status || 'issued').trim(),
  issueDate: String(raw?.issue_date || raw?.issueDate || raw?.created_at || '').trim(),
  expiryDate: raw?.expiry_date || raw?.expiryDate || undefined,
  verificationUrl: String(raw?.verification_url || raw?.verificationUrl || '').trim() || undefined,
});

const normalizeDetail = (raw: any): CertificateDetail => ({
  uniqueId: String(raw?.unique_id || raw?.uniqueId || raw?.id || '').trim(),
  title: String(raw?.title || '').trim() || 'Certificate',
  status: String(raw?.status || 'issued').trim(),
  recipientName: String(raw?.recipient_name || raw?.recipientName || raw?.user_name || '').trim(),
  description: String(raw?.description || '').trim() || undefined,
  issueDate: raw?.issue_date || raw?.issueDate || raw?.created_at || undefined,
  expiryDate: raw?.expiry_date || raw?.expiryDate || undefined,
  issuingAuthority: String(raw?.issuing_authority || raw?.issuingAuthority || '').trim() || undefined,
  verificationUrl: String(raw?.verification_url || raw?.verificationUrl || '').trim() || undefined,
  pdfFile: raw?.pdf_file ?? raw?.pdfFile ?? null,
  qrCode: raw?.qr_code ?? raw?.qrCode ?? null,
  certificateTypeName:
    String(raw?.certificate_type?.name || raw?.certificate_type_name || '').trim() || undefined,
  templateName: String(raw?.template?.name || '').trim() || undefined,
  notes: String(raw?.notes || '').trim() || undefined,
});

const formatDate = (value?: string | null) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '—';
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const pillForStatus = (value?: string | null) => {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'issued') return { bg: colors.success + '1A', fg: colors.success, label: 'Issued' };
  if (status === 'expired') return { bg: colors.warning + '1A', fg: colors.warning, label: 'Expired' };
  if (status === 'revoked') return { bg: colors.error + '1A', fg: colors.error, label: 'Revoked' };
  if (!status) return { bg: colors.gray[100], fg: colors.text.secondary, label: '—' };
  return { bg: colors.gray[100], fg: colors.text.secondary, label: status.replace(/_/g, ' ') };
};

const CertificatesScreen: React.FC = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<CertificateSummary[]>([]);

  const [verifyId, setVerifyId] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CertificateDetail | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await certificatesAPI.list();
      const payload = res?.data?.data ?? res?.data ?? {};
      const rawList =
        (payload && typeof payload === 'object' && Array.isArray((payload as any).certificates))
          ? (payload as any).certificates
          : Array.isArray(payload)
            ? payload
            : [];
      setCertificates(rawList.map(normalizeSummary).filter((c: CertificateSummary) => c.uniqueId));
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load certificates.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedCertificates = useMemo(() => {
    const copy = certificates.slice();
    copy.sort((a, b) => {
      const aTime = new Date(a.issueDate || 0).getTime();
      const bTime = new Date(b.issueDate || 0).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
    return copy;
  }, [certificates]);

  const openDetail = useCallback(async (summary: CertificateSummary) => {
    const uniqueId = String(summary.uniqueId || '').trim();
    if (!uniqueId) return;

    setSelectedId(uniqueId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const res = await certificatesAPI.get(uniqueId);
      const payload = res?.data?.data ?? res?.data ?? {};
      setDetail(normalizeDetail(payload));
    } catch (err: any) {
      setDetailError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load certificate.'
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  const handleVerify = useCallback(async (uniqueId: string) => {
    const cleaned = String(uniqueId || '').trim();
    if (!cleaned) {
      Alert.alert('Verify certificate', 'Enter a certificate ID.');
      return;
    }
    try {
      setVerifying(true);
      const res = await certificatesAPI.verify(cleaned);
      const payload = res?.data?.data ?? res?.data ?? {};
      const valid = Boolean(payload?.valid);
      Alert.alert(
        valid ? 'Valid certificate' : 'Certificate not valid',
        String(payload?.message || (valid ? 'Verified.' : 'Unable to verify.'))
      );
    } catch (err: any) {
      const payload = err?.response?.data || {};
      Alert.alert(
        'Verification failed',
        String(payload?.message || payload?.error || err?.message || 'Unable to verify certificate.')
      );
    } finally {
      setVerifying(false);
    }
  }, []);

  const handleVerifyInput = useCallback(async () => {
    await handleVerify(verifyId);
  }, [handleVerify, verifyId]);

  const handleDownloadPdf = useCallback(async (uniqueId: string, title?: string) => {
    const cleaned = String(uniqueId || '').trim();
    if (!cleaned) return;

    const token = getAuthToken();
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again to download certificates.');
      return;
    }

    try {
      const downloadUrl = `${getApiBaseUrl()}/certificates/${cleaned}/download/`;
      const key = `certificate-${cleaned}`;
      await localDownloadsService.ensureLocalFile({
        key,
        remoteUrl: downloadUrl,
        title: title || `certificate-${cleaned}`,
        fileType: 'pdf',
        mimeType: 'application/pdf',
        headers: { Authorization: `Bearer ${token}` },
      });
      await localDownloadsService.openLocalFile(key);
    } catch (err: any) {
      Alert.alert(
        'Download failed',
        String(err?.response?.data?.error || err?.message || 'Unable to download certificate.')
      );
    }
  }, []);

  const renderCertificateCard = (item: CertificateSummary) => {
    const pill = pillForStatus(item.status);
    return (
      <TouchableOpacity
        key={item.uniqueId}
        activeOpacity={0.85}
        onPress={() => openDetail(item)}
        style={styles.cardPressable}
      >
        <Card style={styles.certificateCard} variant="elevated" padding="md">
          <View style={styles.certificateRow}>
            <View style={styles.certificateIconWrap}>
              <View style={styles.certificateIconBg} />
              <Icon name="ribbon" size={22} color={colors.primary[600]} />
            </View>

            <View style={styles.certificateBody}>
              <View style={styles.certificateTopRow}>
                <Text style={styles.certificateTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
                </View>
              </View>
              <Text style={styles.certificateMeta} numberOfLines={1}>
                {item.typeName || 'Certificate'}
                {item.recipientName ? ` · ${item.recipientName}` : ''}
              </Text>
              <Text style={styles.certificateDate}>
                Issued {formatDate(item.issueDate)}
                {item.expiryDate ? ` · Expires ${formatDate(item.expiryDate)}` : ''}
              </Text>
            </View>

            <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading certificates...</Text>
      </View>
    );
  }

  const modalPill = pillForStatus(detail?.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Certificates</Text>
          <Text style={styles.headerSubtitle}>Your earned credentials</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            setRefreshing(true);
            load();
          }}
        >
          <Icon name="refresh" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Icon name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorTitle}>Certificates unavailable</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={() => load()} variant="outline" />
          </View>
        ) : null}

        <Card variant="outlined" padding="md" style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>Verify a certificate</Text>
          <Text style={styles.verifySub}>
            Enter a certificate ID to check if it is valid.
          </Text>
          <View style={styles.verifyRow}>
            <TextInput
              value={verifyId}
              onChangeText={setVerifyId}
              placeholder="e.g., CERT-1234-ABCD"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="characters"
              style={styles.verifyInput}
            />
            <Button
              title="Verify"
              onPress={handleVerifyInput}
              loading={verifying}
              variant="primary"
              style={styles.verifyBtn}
            />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My certificates</Text>
          <Text style={styles.sectionCount}>{sortedCertificates.length}</Text>
        </View>

        {sortedCertificates.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Icon name="ribbon-outline" size={44} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No certificates yet</Text>
            <Text style={styles.emptyText}>
              When you complete milestones, your certificates will appear here.
            </Text>
          </View>
        ) : (
          sortedCertificates.map(renderCertificateCard)
        )}
      </ScrollView>

      <Modal
        visible={Boolean(selectedId)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.headerBtn} onPress={closeDetail}>
              <Icon name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Certificate</Text>
              <Text style={styles.modalSubTitle} numberOfLines={1}>
                {selectedId || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                const id = selectedId;
                if (!id) return;
                openDetail({ uniqueId: id, title: '', typeName: '', recipientName: '', status: '', issueDate: '' });
              }}
            >
              <Icon name="refresh" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <View style={[styles.modalBody, styles.center]}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading certificate...</Text>
            </View>
          ) : detailError ? (
            <View style={styles.modalBody}>
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <Icon name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.errorTitle}>Unable to load</Text>
                </View>
                <Text style={styles.errorText}>{detailError}</Text>
                <Button
                  title="Try Again"
                  onPress={() => {
                    const id = selectedId;
                    if (!id) return;
                    openDetail({
                      uniqueId: id,
                      title: '',
                      typeName: '',
                      recipientName: '',
                      status: '',
                      issueDate: '',
                    });
                  }}
                  variant="outline"
                />
              </View>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Card variant="elevated" padding="lg" style={styles.detailHero}>
                <View style={styles.detailTop}>
                  <View style={styles.detailIconWrap}>
                    <View style={styles.detailIconBg} />
                    <Icon name="ribbon" size={24} color={colors.primary[700]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailTitle} numberOfLines={2}>
                      {detail?.title || 'Certificate'}
                    </Text>
                    <Text style={styles.detailMeta}>
                      {detail?.certificateTypeName || 'Certificate'}
                      {detail?.templateName ? ` · ${detail.templateName}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: modalPill.bg }]}>
                    <Text style={[styles.pillText, { color: modalPill.fg }]}>{modalPill.label}</Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Recipient</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {detail?.recipientName || '—'}
                    </Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Issued</Text>
                    <Text style={styles.detailValue}>{formatDate(detail?.issueDate)}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Expires</Text>
                    <Text style={styles.detailValue}>{formatDate(detail?.expiryDate)}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Authority</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {detail?.issuingAuthority || 'CampusHub'}
                    </Text>
                  </View>
                </View>

                {detail?.description ? (
                  <Text style={styles.detailDescription}>{detail.description}</Text>
                ) : null}

                <View style={styles.detailActions}>
                  <Button
                    title="Verify"
                    onPress={() => selectedId && handleVerify(selectedId)}
                    variant="secondary"
                    icon={<Icon name="shield-checkmark" size={18} color={colors.text.primary} />}
                    style={{ flex: 1 }}
                  />
                  <View style={{ width: spacing[3] }} />
                  <Button
                    title="Download PDF"
                    onPress={() => selectedId && handleDownloadPdf(selectedId, detail?.title)}
                    variant="primary"
                    icon={<Icon name="download" size={18} color={colors.text.inverse} />}
                    style={{ flex: 1 }}
                  />
                </View>

                <Button
                  title="Open verification link"
                  onPress={async () => {
                    const url = String(detail?.verificationUrl || '').trim();
                    if (!url) {
                      Alert.alert('Verification link', 'No verification link available.');
                      return;
                    }
                    const canOpen = await Linking.canOpenURL(url).catch(() => false);
                    if (!canOpen) {
                      Alert.alert('Verification link', 'Unable to open this link.');
                      return;
                    }
                    await Linking.openURL(url);
                  }}
                  variant="outline"
                  icon={<Icon name="link" size={18} color={colors.primary[500]} />}
                  style={{ marginTop: spacing[3] }}
                />
              </Card>

              <Text style={styles.detailFootnote}>
                Download uses your authenticated session. If it fails, refresh and try again.
              </Text>
            </ScrollView>
          )}
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
  center: {
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  errorCard: {
    backgroundColor: colors.card.light,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  errorText: {
    color: colors.text.secondary,
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  verifyCard: {
    marginBottom: spacing[4],
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  verifySub: {
    marginTop: spacing[1],
    color: colors.text.secondary,
    lineHeight: 18,
  },
  verifyRow: {
    flexDirection: 'row',
    marginTop: spacing[3],
    gap: spacing[3],
    alignItems: 'center',
  },
  verifyInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing[4],
    color: colors.text.primary,
    backgroundColor: colors.card.light,
  },
  verifyBtn: {
    minWidth: 110,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    marginTop: spacing[1],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: 999,
  },
  cardPressable: {
    marginBottom: spacing[3],
  },
  certificateCard: {
    borderRadius: borderRadius.xl,
  },
  certificateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  certificateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  certificateIconBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary[500] + '14',
  },
  certificateBody: {
    flex: 1,
  },
  certificateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  certificateTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  certificateMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  certificateDate: {
    marginTop: 6,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  emptyText: {
    marginTop: spacing[2],
    textAlign: 'center',
    color: colors.text.secondary,
    lineHeight: 18,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  modalSubTitle: {
    marginTop: 2,
    color: colors.text.secondary,
    fontSize: 12,
  },
  modalBody: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  detailHero: {
    borderRadius: borderRadius.xl,
    ...shadows.soft,
  },
  detailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  detailIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  detailIconBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent[500] + '18',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text.primary,
  },
  detailMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  detailGrid: {
    marginTop: spacing[4],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  detailCell: {
    width: '47%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    marginTop: 6,
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '700',
  },
  detailDescription: {
    marginTop: spacing[4],
    color: colors.text.secondary,
    lineHeight: 18,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  detailFootnote: {
    marginTop: spacing[4],
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default CertificatesScreen;
