import i18n from '@/src/lib/i18n';

/**
 * أخطاء Supabase (PostgrestError / AuthApiError / StorageError) ترث Error
 * وتحمل رسالة تقنية بالإنجليزية تكشف أسماء الجداول والأعمدة وسياسات RLS —
 * لا يصح عرضها للمستخدم. نميّزها عن أخطاء التطبيق نفسه (التي نرميها نحن
 * برسائل عربية مقصودة) بوجود `code` أو `status`، ثم نترجم أشهر أكواد
 * Postgres/PostgREST إلى رسالة واضحة قابلة للتصرف.
 */
type BackendError = { message?: unknown; code?: unknown; status?: unknown; details?: unknown; hint?: unknown };

const CODE_MESSAGE_KEYS: Record<string, string> = {
  '42501': 'common.errors.permissionDenied', // RLS أو صلاحية غير كافية
  '23505': 'common.errors.duplicate', // unique_violation
  '23502': 'common.errors.missingData', // not_null_violation
  '23503': 'common.errors.invalidReference', // foreign_key_violation
  '23514': 'common.errors.invalidValue', // check_violation
  '22P02': 'common.errors.invalidValue', // invalid_text_representation
  PGRST116: 'common.errors.notFound', // صف غير موجود مع .single()
  PGRST301: 'common.errors.sessionExpired', // JWT منتهٍ/غير صالح
};

function asBackendError(error: unknown): BackendError | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as BackendError;
  const hasCode = typeof candidate.code === 'string' || typeof candidate.code === 'number';
  const hasStatus = typeof candidate.status === 'number';
  return hasCode || hasStatus ? candidate : null;
}

function backendMessageKey(error: BackendError): string | null {
  const code = typeof error.code === 'string' ? error.code : String(error.code ?? '');
  if (code && CODE_MESSAGE_KEYS[code]) return CODE_MESSAGE_KEYS[code];

  const status = typeof error.status === 'number' ? error.status : undefined;
  if (status === 401) return 'common.errors.sessionExpired';
  if (status === 403) return 'common.errors.permissionDenied';
  if (status === 404) return 'common.errors.notFound';
  if (status !== undefined && status >= 500) return 'common.errors.serverError';
  return null;
}

/**
 * يحوّل أي خطأ إلى رسالة مفهومة للمستخدم بلغته الحالية، دون كشف تفاصيل
 * تقنية أو أسماء جداول/أعمدة. التفاصيل الكاملة تُطبع في وضع التطوير فقط
 * حتى يبقى السبب الحقيقي مرئيًا للمطوّر بدل أن يُبتلع خلف رسالة عامة.
 */
export function getFriendlyErrorMessage(error: unknown, fallback?: string): string {
  if (__DEV__) {
    console.error('[error]', error);
  }

  if (isOfflineError(error)) {
    return i18n.t('common.offlineError');
  }

  const backendError = asBackendError(error);
  if (backendError) {
    const key = backendMessageKey(backendError);
    // خطأ من الخادم بلا كود معروف: نستخدم رسالة الشاشة العامة، ولا نعرض
    // رسالة Postgres الخام للمستخدم مهما كانت.
    return key ? i18n.t(key) : (fallback ?? i18n.t('common.genericError'));
  }

  // خطأ رميناه نحن داخل التطبيق — رسالته مكتوبة أصلًا للمستخدم.
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback ?? i18n.t('common.genericError');
}

/** يكتشف فشل fetch الناتج عن انقطاع الشبكة (وليس خطأ خادم/منطق). */
export function isOfflineError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && typeof (error as BackendError).message === 'string'
        ? ((error as BackendError).message as string)
        : '';
  if (!message) return false;

  const normalized = message.toLowerCase();
  return (
    normalized.includes('network request failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('fetch failed') ||
    normalized.includes('the internet connection appears to be offline')
  );
}
