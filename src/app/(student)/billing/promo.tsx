// Promo Code Screen

import { useRouter } from 'expo-router';
import React,{ useCallback,useState } from 'react';
import { Alert,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Input from '../../../components/ui/Input';
import { paymentsAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

const PromoScreen: React.FC = () => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleApply = useCallback(async () => {
    const cleaned = String(code || '').trim().toUpperCase();
    if (!cleaned) {
      Alert.alert('Promo code', 'Enter a promo code to continue.');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const response = await paymentsAPI.applyPromoCode(cleaned);
      const payload = response?.data?.data ?? response?.data ?? {};
      setResult(payload);
    } catch (err: any) {
      Alert.alert(
        'Promo code',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to apply promo code.'
      );
    } finally {
      setLoading(false);
    }
  }, [code]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promo Code</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.card}>
        <Input
          label="Code"
          placeholder="e.g. WELCOME10"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          containerStyle={{ marginBottom: spacing[3] }}
        />

        <Button
          title={loading ? 'Checking...' : 'Check Code'}
          onPress={handleApply}
          loading={loading}
          disabled={loading}
          fullWidth
        />

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{String(result?.code || '').toUpperCase()}</Text>
            <Text style={styles.resultText}>{result?.description || 'Promo applied.'}</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Discount</Text>
              <Text style={styles.resultValue}>
                {String(result?.discount_type || '').toLowerCase() === 'percentage'
                  ? `${result?.discount_value}%`
                  : `USD ${result?.discount_value}`}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
    backgroundColor: colors.card.light,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text.primary },
  placeholder: { width: 40 },

  card: {
    margin: spacing[4],
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    ...shadows.sm,
  },

  resultCard: {
    marginTop: spacing[4],
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  resultTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  resultText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[3] },
  resultLabel: { fontSize: 13, color: colors.text.secondary, fontWeight: '700' },
  resultValue: { fontSize: 13, color: colors.text.primary, fontWeight: '900' },
});

export default PromoScreen;

