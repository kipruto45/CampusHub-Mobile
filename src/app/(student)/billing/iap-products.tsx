// In-App Products Screen

import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Input from '../../../components/ui/Input';
import { iapAPI } from '../../../services/api';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { borderRadius,spacing } from '../../../theme/spacing';

type Platform = 'web' | 'apple' | 'google';
type ProductType = 'subscription' | 'one_time' | 'feature_unlock';

type Product = {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  product_type: ProductType;
  subscription_type?: string | null;
  price: string;
  currency: string;
  tier?: string;
  feature_key?: string;
  is_available?: boolean;
  apple_product_id?: string;
  google_product_id?: string;
  stripe_price_id?: string;
  platform_product_id?: string;
  purchase_supported?: boolean;
};

const ProductsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platform, setPlatform] = useState<Platform>('web');
  const [type, setType] = useState<ProductType>('subscription');
  const [products, setProducts] = useState<Product[]>([]);
  const [startingId, setStartingId] = useState<string | null>(null);

  // Manual token fields (Apple/Google) for environments without native IAP SDK wiring.
  const [transactionId, setTransactionId] = useState('');
  const [receiptData, setReceiptData] = useState('');
  const [purchaseToken, setPurchaseToken] = useState('');
  const [orderId, setOrderId] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await iapAPI.getProducts({ platform, type });
      const payload = response?.data?.data ?? response?.data ?? {};
      const results = Array.isArray(payload?.products) ? payload.products : [];
      setProducts(results);
    } catch (err: any) {
      Alert.alert(
        'Products',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load products.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [platform, type]);

  useEffect(() => {
    load();
  }, [load]);

  const platformOptions = useMemo(
    () => [
      { id: 'web', label: 'Web checkout', icon: 'card' },
      { id: 'apple', label: 'Apple', icon: 'logo-apple' },
      { id: 'google', label: 'Google', icon: 'logo-android' },
    ],
    []
  );

  const typeOptions = useMemo(
    () => [
      { id: 'subscription', label: 'Subscriptions' },
      { id: 'feature_unlock', label: 'Features' },
      { id: 'one_time', label: 'One-time' },
    ],
    []
  );

  const startPurchase = useCallback(
    async (product: Product) => {
      const platformProductId = String(product.platform_product_id || '').trim();
      if (!platformProductId) {
        Alert.alert('Product', 'This product is missing a platform purchase id.');
        return;
      }

      if (platform === 'web' && product.product_type !== 'subscription') {
        Alert.alert('Not supported', 'Web checkout is currently supported for subscriptions only.');
        return;
      }

      if (platform === 'apple' && !String(transactionId || '').trim()) {
        Alert.alert('Transaction ID required', 'Enter an Apple transaction id to continue.');
        return;
      }

      if (platform === 'google' && !String(purchaseToken || '').trim()) {
        Alert.alert('Purchase token required', 'Enter a Google purchase token to continue.');
        return;
      }

      try {
        setStartingId(product.id);
        const response = await iapAPI.subscribe({
          platform,
          product_id: platformProductId,
          ...(platform === 'apple'
            ? {
                transaction_id: String(transactionId || '').trim(),
                receipt_data: String(receiptData || '').trim() || undefined,
              }
            : {}),
          ...(platform === 'google'
            ? {
                purchase_token: String(purchaseToken || '').trim(),
                order_id: String(orderId || '').trim() || undefined,
              }
            : {}),
        });

        const payload = response?.data?.data ?? response?.data ?? {};
        const checkoutUrl = String(payload?.checkout_url || '').trim();

        if (checkoutUrl) {
          await WebBrowser.openBrowserAsync(checkoutUrl);
          Alert.alert(
            'Complete checkout',
            'Finish checkout in your browser, then return and refresh your in-app purchase status.'
          );
          return;
        }

        Alert.alert('Purchase processed', payload?.already_processed ? 'Already processed.' : 'Purchase recorded.');
      } catch (err: any) {
        Alert.alert(
          'Purchase failed',
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Unable to process purchase.'
        );
      } finally {
        setStartingId(null);
      }
    },
    [platform, orderId, purchaseToken, receiptData, transactionId]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity
          style={styles.backBtn}
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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Purchase channel</Text>
          <View style={styles.choiceRow}>
            {platformOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, platform === opt.id ? styles.chipActive : null]}
                onPress={() => setPlatform(opt.id as Platform)}
              >
                <Icon
                  name={opt.icon as any}
                  size={16}
                  color={platform === opt.id ? colors.primary[700] : colors.text.tertiary}
                />
                <Text style={[styles.chipText, platform === opt.id ? styles.chipTextActive : null]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing[4] }]}>Type</Text>
          <View style={styles.choiceRow}>
            {typeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, type === opt.id ? styles.chipActive : null]}
                onPress={() => setType(opt.id as ProductType)}
              >
                <Text style={[styles.chipText, type === opt.id ? styles.chipTextActive : null]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {platform !== 'web' ? (
            <View style={styles.notice}>
              <Icon name="information-circle" size={16} color={colors.warning} />
              <Text style={styles.noticeText}>
                Native in-app purchase SDK is not wired in this build. You can still submit tokens manually for testing.
              </Text>
            </View>
          ) : null}

          {platform === 'apple' ? (
            <View style={{ marginTop: spacing[4] }}>
              <Input
                label="Transaction ID"
                placeholder="Apple transaction id"
                value={transactionId}
                onChangeText={setTransactionId}
                autoCapitalize="none"
              />
              <Input
                label="Receipt data (optional)"
                placeholder="Paste receipt payload"
                value={receiptData}
                onChangeText={setReceiptData}
                autoCapitalize="none"
              />
            </View>
          ) : null}

          {platform === 'google' ? (
            <View style={{ marginTop: spacing[4] }}>
              <Input
                label="Purchase token"
                placeholder="Google purchase token"
                value={purchaseToken}
                onChangeText={setPurchaseToken}
                autoCapitalize="none"
              />
              <Input
                label="Order ID (optional)"
                placeholder="Order id"
                value={orderId}
                onChangeText={setOrderId}
                autoCapitalize="none"
              />
            </View>
          ) : null}
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="diamond" size={36} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No products</Text>
            <Text style={styles.emptyText}>Try a different type or channel.</Text>
          </View>
        ) : (
          products.map((p) => {
            const starting = startingId === p.id;
            const priceLabel = `${p.currency} ${p.price}`;
            const supported = Boolean(p.purchase_supported);
            return (
              <View key={p.id} style={styles.productCard}>
                <View style={styles.productTop}>
                  <View style={styles.productLeft}>
                    <View style={styles.productIcon}>
                      <Icon name="diamond" size={16} color={colors.primary[500]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{p.name}</Text>
                      <Text style={styles.productMeta}>
                        {String(p.platform).toUpperCase()} • {String(p.product_type).replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.productPrice}>{priceLabel}</Text>
                </View>

                {p.description ? <Text style={styles.productDesc}>{p.description}</Text> : null}

                <Button
                  title={supported ? (starting ? 'Starting...' : 'Buy') : 'Unavailable'}
                  onPress={() => startPurchase(p)}
                  loading={starting}
                  disabled={!supported || starting}
                  fullWidth
                />
              </View>
            );
          })
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing[3], color: colors.text.secondary, fontSize: 13 },

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

  scrollContent: { padding: spacing[4], paddingBottom: spacing[10] },

  card: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, marginBottom: spacing[2] },

  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.gray[100],
  },
  chipActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  chipTextActive: { color: colors.primary[700] },

  notice: {
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.warning + '12',
    borderWidth: 1,
    borderColor: colors.warning + '33',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  noticeText: { flex: 1, fontSize: 12, color: colors.text.secondary, fontWeight: '600', lineHeight: 16 },

  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: { marginTop: spacing[3], fontSize: 15, fontWeight: '900', color: colors.text.primary },
  emptyText: { marginTop: spacing[2], fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  productCard: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  productTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  productIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  productMeta: { marginTop: 2, fontSize: 12, color: colors.text.tertiary },
  productPrice: { fontSize: 13, fontWeight: '900', color: colors.primary[700] },
  productDesc: { marginTop: spacing[3], marginBottom: spacing[4], fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

  bottomSpacing: { height: spacing[4] },
});

export default ProductsScreen;
