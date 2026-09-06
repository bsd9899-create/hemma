/**
 * أدوات تشغيل الشاشات فعليًا داخل الاختبارات.
 *
 * لماذا: فحص الكود بالقراءة لا يكشف زرًا لا يفعل شيئًا، ولا شاشة تنهار
 * عند بيانات ناقصة، ولا حالة تحميل لا تنتهي. هذه الأدوات تُركّب الشاشة
 * الحقيقية بمكوّناتها وخطافاتها الحقيقية، وتسمح بالضغط على كل عنصر
 * تفاعلي فيها — وهو أقرب ما يمكن الوصول إليه من تشغيل التطبيق على جهاز
 * داخل بيئة بلا محاكي.
 *
 * طبقة البيانات وحدها هي المموّهة (Supabase وexpo-router والوحدات
 * الأصلية)؛ منطق الشاشة نفسه يُنفَّذ كما هو في الإنتاج.
 */
import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';

export type ScreenHarness = RenderResult;

export function renderScreen(element: ReactElement): ScreenHarness {
  return render(element);
}

/**
 * يجمع كل العناصر القابلة للضغط في الشجرة المعروضة.
 *
 * نبحث عن `onPress` في props بدل الاعتماد على أدوار الوصول وحدها، لأن
 * الهدف هو العثور على أزرار **بلا** تسمية أو دور أيضًا — وهي بالضبط ما
 * نريد اكتشافه.
 */
export function findPressables(screen: ScreenHarness) {
  return screen.UNSAFE_root.findAll((node) => typeof node.props?.onPress === 'function');
}

/** أدوار الوصول التي نعتبرها "عنصر تفاعلي يجب أن يحمل تسمية". */
export const INTERACTIVE_ROLES = ['button', 'link', 'radio', 'checkbox', 'switch', 'tab'];

/**
 * كل النصوص الظاهرة فعليًا في الشجرة المعروضة.
 *
 * لا نستخدم JSON.stringify على المخرَج: عناصر مثل RefreshControl تحمل
 * مراجع دائرية إلى Fiber فترمي. هذا المشي يقرأ الأبناء النصية فقط —
 * وهو ما يراه المستخدم على أي حال.
 */
export function renderedText(screen: ScreenHarness): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string' || typeof node === 'number') {
      parts.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object' && 'children' in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(screen.toJSON());
  return parts.join(' ');
}
