import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * هل طلب المستخدم تقليل الحركة من إعدادات النظام؟
 *
 * تجاهل هذا الإعداد ليس تفصيلًا تجميليًا: من يفعّله غالبًا يفعّله لأن
 * الحركة تسبّب له دوارًا أو غثيانًا فعليًا (vestibular disorders). فأي
 * حركة نضيفها يجب أن تسقط إلى صفر عنده لا أن تتباطأ.
 *
 * يبدأ بـ false ثم يُصحَّح بعد أول قراءة — القراءة غير متزامنة على
 * المنصّتين، والانتظار يعني شاشة فارغة لحظة الإقلاع.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
