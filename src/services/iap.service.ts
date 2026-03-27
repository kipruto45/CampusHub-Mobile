import { Platform } from 'react-native';

type NativePlatform = 'apple' | 'google';
type NativeProductType = 'subscription' | 'one_time' | 'feature_unlock';

export type NativePurchasePayload = {
  platform: NativePlatform;
  productId: string;
  transactionId?: string;
  receiptData?: string;
  purchaseToken?: string;
  orderId?: string;
  raw?: any;
};

let cachedModule: any | null | undefined;

const getIapModule = async (): Promise<any | null> => {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import('react-native-iap');
    cachedModule = mod;
    return mod;
  } catch (err) {
    cachedModule = null;
    return null;
  }
};

const mapPlatform = (): NativePlatform | null => {
  if (Platform.OS === 'ios') return 'apple';
  if (Platform.OS === 'android') return 'google';
  return null;
};

const mapPurchase = (purchase: any): NativePurchasePayload => {
  const platform = mapPlatform() || 'apple';
  return {
    platform,
    productId: String(purchase?.productId || ''),
    transactionId:
      purchase?.transactionId ||
      purchase?.transactionIdentifier ||
      purchase?.originalTransactionIdentifierIOS ||
      purchase?.id,
    receiptData: purchase?.transactionReceipt || purchase?.receipt,
    purchaseToken: purchase?.purchaseToken || purchase?.token,
    orderId: purchase?.orderId || purchase?.originalJson?.orderId,
    raw: purchase,
  };
};

const waitForPurchase = async (iap: any, timeoutMs = 90000): Promise<any> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        purchaseSub?.remove();
        errorSub?.remove();
      } catch {}
      reject(new Error('Purchase timed out'));
    }, timeoutMs);

    const purchaseSub = iap.purchaseUpdatedListener((purchase: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        purchaseSub?.remove();
        errorSub?.remove();
      } catch {}
      resolve(purchase);
    });

    const errorSub = iap.purchaseErrorListener((error: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        purchaseSub?.remove();
        errorSub?.remove();
      } catch {}
      reject(error);
    });
  });

export const isNativeIapAvailable = async (): Promise<boolean> => {
  const mod = await getIapModule();
  return Boolean(mod);
};

export const initNativeIap = async (): Promise<{ available: boolean }> => {
  const mod = await getIapModule();
  if (!mod) return { available: false };
  await mod.initConnection();
  if (Platform.OS === 'android' && typeof mod.flushFailedPurchasesCachedAsPendingAndroid === 'function') {
    try {
      await mod.flushFailedPurchasesCachedAsPendingAndroid();
    } catch {}
  }
  return { available: true };
};

export const purchaseWithNativeIap = async (
  productId: string,
  type: NativeProductType
): Promise<NativePurchasePayload> => {
  const mod = await getIapModule();
  if (!mod) {
    throw new Error('Native in-app purchases are not available in this build.');
  }

  await initNativeIap();

  const purchasePromise = waitForPurchase(mod);
  if (type === 'subscription' && typeof mod.requestSubscription === 'function') {
    await mod.requestSubscription({ sku: productId });
  } else if (typeof mod.requestPurchase === 'function') {
    await mod.requestPurchase({ sku: productId });
  } else {
    throw new Error('Native purchase request is unavailable.');
  }

  const purchase = await purchasePromise;
  try {
    if (typeof mod.finishTransaction === 'function') {
      await mod.finishTransaction({ purchase, isConsumable: false });
    }
  } catch {}

  return mapPurchase(purchase);
};

export const restoreNativePurchases = async (): Promise<NativePurchasePayload[]> => {
  const mod = await getIapModule();
  if (!mod) {
    return [];
  }
  await initNativeIap();
  if (typeof mod.getAvailablePurchases !== 'function') {
    return [];
  }
  const purchases = await mod.getAvailablePurchases();
  return Array.isArray(purchases) ? purchases.map(mapPurchase) : [];
};
