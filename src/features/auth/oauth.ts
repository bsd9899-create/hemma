import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/src/data/supabase';
import { profileRepository } from '@/src/data/repositories/profileRepository';

// يُغلق أي جلسة WebBrowser معلّقة تلقائيًا عند عودة التطبيق من الخلفية —
// موصى به من توثيق expo-web-browser، وإن كان أثره الفعلي هنا محدودًا
// لأننا نستخدم openAuthSessionAsync (يُغلق نفسه فور نجاح إعادة التوجيه).
WebBrowser.maybeCompleteAuthSession();

/**
 * رابط العودة إلى التطبيق بعد تسجيل الدخول عبر متصفح خارجي —
 * hemma://auth/callback على الجهاز الحقيقي (نسخة Dev Client/الإنتاج).
 * يجب إضافة هذا الرابط بالضبط إلى Supabase Dashboard → Authentication →
 * URL Configuration → Redirect URLs، وإلا سيرفض Supabase إعادة التوجيه.
 */
const redirectTo = Linking.createURL('auth/callback');

// ⚠️ DEBUG مؤقت لتشخيص "Invalid path specified in request URL" — احذف هذا
// القسم بعد انتهاء التشخيص. يطبع فقط الروابط/المسارات، لا مفاتيح ولا tokens.
if (__DEV__) {
  console.log('[AUTH-DEBUG] redirectTo (Linking.createURL):', redirectTo);
  console.log('[AUTH-DEBUG] scheme الفعلي وقت التشغيل (Constants.expoConfig):', Constants.expoConfig?.scheme);
  console.log('[AUTH-DEBUG] iOS bundleIdentifier الفعلي وقت التشغيل:', Constants.expoConfig?.ios?.bundleIdentifier);
  console.log('[AUTH-DEBUG] executionEnvironment (dev client أم غيره):', Constants.executionEnvironment);
}

type SignInResult = { cancelled: boolean };

/** يستخرج كود PKCE من رابط العودة، أو يرمي الخطأ الذي أرجعه المزوّد (رفض/إلغاء من طرف Google). */
function extractAuthCode(url: string): string {
  const parsed = new URL(url);
  const errorDescription = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error');
  if (errorDescription) throw new Error(errorDescription);

  const code = parsed.searchParams.get('code');
  if (!code) throw new Error('لم يصل رمز الدخول من مزوّد الخدمة');
  return code;
}

/**
 * تسجيل الدخول عبر Google — تدفق OAuth القياسي لتطبيقات الجوّال:
 * Supabase يعطينا رابط موافقة Google، نفتحه بمتصفح نظام آمن
 * (ASWebAuthenticationSession على iOS)، ثم نبادل الكود العائد بجلسة حقيقية.
 * لا حاجة لأي SDK أصلي من Google — Supabase يتولى كل التبادل مع Google خلف الكواليس.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (__DEV__) {
    console.log('[AUTH-DEBUG] signInWithOAuth error:', error ? { name: error.name, status: error.status, message: error.message } : null);
    console.log('[AUTH-DEBUG] رابط /authorize الفعلي العائد من Supabase (data.url):', data?.url);
    if (data?.url) {
      try {
        console.log('[AUTH-DEBUG] redirect_uri المُرسَل لجوجل عبر Supabase:', new URL(data.url).searchParams.get('redirect_uri'));
      } catch {
        // تجاهل — لو data.url غير قابل للتحليل سيظهر ذلك من السطر أعلاه أصلًا.
      }
    }
  }
  if (error) throw error;
  if (!data.url) throw new Error('تعذّر بدء تسجيل الدخول عبر Google');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (__DEV__) {
    console.log('[AUTH-DEBUG] WebBrowser.openAuthSessionAsync نتيجة type:', result.type);
    if ('url' in result) {
      console.log('[AUTH-DEBUG] رابط العودة (code مُخفى):', result.url.replace(/([?&]code=)[^&]+/, '$1REDACTED'));
    }
  }
  if (result.type !== 'success') {
    // المستخدم أغلق المتصفح بنفسه — ليست حالة خطأ، فقط إلغاء صامت.
    return { cancelled: true };
  }

  if (__DEV__) {
    const params = new URL(result.url).searchParams;
    console.log('[AUTH-DEBUG] رجع إلى hemma://auth/callback؟', result.url.startsWith(redirectTo));
    console.log('[AUTH-DEBUG] هل يوجد code في رابط العودة؟', params.has('code'));
    console.log('[AUTH-DEBUG] هل يوجد error/error_description في رابط العودة؟', params.get('error') ?? params.get('error_description') ?? null);
  }

  const code = extractAuthCode(result.url);
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (__DEV__) {
    console.log(
      '[AUTH-DEBUG] exchangeCodeForSession error:',
      exchangeError ? { name: exchangeError.name, status: exchangeError.status, message: exchangeError.message } : null
    );
  }
  if (exchangeError) throw exchangeError;
  return { cancelled: false };
}

/** متاح فقط على iOS (زر Apple الأصلي) — Android/الويب لا يحتاجانه في نطاق هذا التطبيق حاليًا. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/**
 * تسجيل الدخول عبر Apple — يستخدم واجهة Apple الأصلية مباشرة (بدون متصفح
 * خارجي إطلاقًا)، مع nonce عشوائي مُجزَّأ بـ SHA-256 كما توصي به توثيقات
 * Apple وSupabase معًا لمنع إعادة تشغيل نفس بيانات الدخول (replay attack).
 */
export async function signInWithApple(): Promise<SignInResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
      return { cancelled: true };
    }
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('تعذّر الحصول على بيانات الدخول من Apple');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (__DEV__) {
    console.log('[AUTH-DEBUG] signInWithIdToken (apple) error:', error ? { name: error.name, status: error.status, message: error.message } : null);
  }
  if (error) throw error;

  // Apple يرسل الاسم الكامل مرة واحدة فقط عند أول موافقة على الإطلاق —
  // لا يصل ضمن identityToken أبدًا، لذلك نحفظه يدويًا هنا فور توفره؛
  // في الزيارات التالية سيكون fullName فارغًا وهذا متوقع تمامًا.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) {
    await profileRepository.updateCurrent({ display_name: fullName }).catch(() => {
      // فشل تحديث الاسم ليس سببًا لإفشال تسجيل الدخول نفسه — المستخدم دخل بنجاح بالفعل.
    });
  }

  return { cancelled: false };
}
