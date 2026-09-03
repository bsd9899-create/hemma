import i18n from '@/src/lib/i18n';

/**
 * يحوّل أخطاء الشبكة/Supabase الخام إلى رسالة مفهومة للمستخدم بلغته
 * الحالية. نستخدمها في كل مكان بدل عرض `error.message` الخام (غالبًا
 * إنجليزي وتقني)، وتكتشف تحديدًا حالة "لا يوجد اتصال إنترنت" لتعطي
 * رسالة مختلفة قابلة للتصرف (أعد المحاولة) بدل رسالة عامة.
 */
export function getFriendlyErrorMessage(error: unknown, fallback?: string): string {
  if (isOfflineError(error)) {
    return i18n.t('common.offlineError');
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback ?? i18n.t('common.genericError');
}

/** يكتشف فشل fetch الناتج عن انقطاع الشبكة (وليس خطأ خادم/منطق). */
export function isOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('the internet connection appears to be offline')
  );
}
