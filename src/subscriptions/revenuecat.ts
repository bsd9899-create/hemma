import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { env } from '@/src/lib/env';
import { inspectRevenueCatKey } from './apiKey';

/**
 * معرّف الاستحقاق (Entitlement) في لوحة تحكم RevenueCat — يُضبط هناك
 * وقت إنشاء المنتجات، وليس اختراعًا من الكود. لو غُيّر الاسم في
 * RevenueCat يجب تحديثه هنا أيضًا.
 */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/**
 * اسم العرض (Offering) المعتمد في RevenueCat.
 *
 * ‏`offerings.current` هو الطبيعي، لكنه يعود null لو لم يُعلَّم أي عرض
 * كـ"current" في اللوحة — وهو خطأ إعداد شائع ونتيجته جدار دفع فارغ بلا
 * أي رسالة. الرجوع إلى العرض المسمّى يجعل الخطأ غير مرئي للمستخدم.
 */
export const DEFAULT_OFFERING_ID = 'default';

let isConfigured = false;

/**
 * الاشتراكات تعمل فقط بمفتاح SDK عام صالح.
 *
 * الفحص على **شكل** المفتاح لا على وجوده: مفتاح سري ملصوق بالخطأ يُهيّئ
 * SDK بنجاح ثم يُشحن داخل الحزمة، فيُستخرج منها. هنا يُرفض ويبقى
 * التطبيق كأن الاشتراكات غير مضبوطة — فشل مغلق لا صامت.
 */
const keyVerdict = inspectRevenueCatKey(env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY);

if (__DEV__ && keyVerdict.kind !== 'valid' && keyVerdict.kind !== 'missing') {
  // console.log لا console.error: الأخير يرفع LogBox فوق الواجهة.
  console.log('[revenuecat] المفتاح مرفوض:', keyVerdict.reason);
}

export const isRevenueCatConfigured = keyVerdict.kind === 'valid';

export function initPurchases(appUserID: string) {
  if (isConfigured || !isRevenueCatConfigured || Platform.OS !== 'ios') return;

  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY!, appUserID });
  isConfigured = true;
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}

export async function getCurrentOfferingPackages(): Promise<PurchasesPackage[]> {
  if (!isConfigured) return [];
  const offerings = await Purchases.getOfferings();
  return (offerings.current ?? offerings.all[DEFAULT_OFFERING_ID])?.availablePackages ?? [];
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * إغلاق المستخدم لورقة الدفع من آبل ليس خطأً — SDK يرميه كاستثناء يحمل
 * `userCancelled: true`، وبدون التمييز هذا تظهر رسالة خطأ حمراء لمجرد أن
 * المستخدم غيّر رأيه.
 */
export function isPurchaseCancelledError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    (error as { userCancelled?: unknown }).userCancelled === true
  );
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) return null;
  return Purchases.getCustomerInfo();
}
