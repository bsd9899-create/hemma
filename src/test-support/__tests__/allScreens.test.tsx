/**
 * تشغيل فعلي لكل شاشة على **بيانات فارغة** — أول ما يراه مستخدم جديد،
 * وأكثر ما يُنسى في الاختبار اليدوي.
 *
 * هذا ليس فحص أنواع: كل شاشة تُركَّب بمكوّناتها وخطافاتها الحقيقية، ثم
 * يُضغَط كل عنصر تفاعلي فيها. يكشف ما لا يكشفه tsc إطلاقًا:
 *   - شاشة تنهار عند بيانات ناقصة أو فارغة
 *   - زر يرمي استثناءً عند الضغط
 *   - NaN أو undefined أو null معروضة للمستخدم
 *   - عنصر تفاعلي بلا تسمية وصول
 *
 * الحالة الممتلئة تُغطّى في populatedScreens.test.tsx.
 */
import { act } from '@testing-library/react-native';
import { SCREENS, mount, mockProfileRef, mockRouter, resetScreenMocks } from '../screenMocks';
import { findPressables, renderedText, INTERACTIVE_ROLES } from '../renderScreen';

beforeEach(resetScreenMocks);

/** هل داخل هذه العقدة نص يقرؤه قارئ الشاشة؟ */
function hasVisibleText(node: { children?: unknown[] }): boolean {
  const stack: unknown[] = [...(node.children ?? [])];
  while (stack.length) {
    const item = stack.pop();
    if (typeof item === 'string' && /[؀-ۿa-zA-Z0-9]/.test(item)) return true;
    if (item && typeof item === 'object' && 'children' in item) {
      const kids = (item as { children?: unknown[] }).children;
      if (Array.isArray(kids)) stack.push(...kids);
    }
  }
  return false;
}

/**
 * تبويب "إضافة" شاشة إعادة توجيه بحتة (<Redirect/>): لا تعرض شيئًا
 * بحكم التصميم، فالضغطة عليه تُفتح quick-add كـ modal عبر tabPress.
 * تُختبر على حدة بدل إخضاعها لتوقّعات شاشة عادية.
 */
describe('تبويب الإضافة', () => {
  it('يعيد التوجيه بلا عرض محتوى', async () => {
    const view = await mount(() => require('@/app/(tabs)/add'));
    expect(view.toJSON()).toBeNull();
  });
});

describe.each(SCREENS)('شاشة $name', ({ load }) => {
  it('تُركَّب وتُعرَض بلا انهيار', async () => {
    const view = await mount(load);
    expect(view.toJSON()).not.toBeNull();
  });

  it('لا تعرض NaN ولا undefined ولا null كنص للمستخدم', async () => {
    const view = await mount(load);
    const text = renderedText(view);
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/\bundefined\b/);
    expect(text).not.toMatch(/\bnull\b/);
  });

  it('كل عنصر تفاعلي يُضغَط بلا استثناء غير مُمسَك', async () => {
    const view = await mount(load);
    // نعيد الاستعلام بعد كل ضغطة: ضغطة قد تغيّر الحالة فتُلغي تركيب
    // عقد كنا التقطناها، والضغط على عقدة مُلغاة خطأ في الاختبار لا في
    // التطبيق. نحدّ العدد لتفادي حلقة لا تنتهي عند إعادة العرض.
    const seen = new Set<() => void>();
    for (let round = 0; round < 40; round++) {
      const next = findPressables(view).find((n) => !seen.has(n.props.onPress));
      if (!next) break;
      const handler = next.props.onPress;
      seen.add(handler);
      await act(async () => {
        handler();
      });
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('كل عنصر بدور تفاعلي يحمل تسمية وصول', async () => {
    const view = await mount(load);
    const unlabelled = view.UNSAFE_root
      .findAll((n) => INTERACTIVE_ROLES.includes(n.props?.accessibilityRole))
      .filter((n) => {
        const label = n.props?.accessibilityLabel;
        if (typeof label === 'string' && label.trim()) return false;
        // نص ظاهر داخل العنصر يكفي كتسمية لقارئ الشاشة. نمشي على
        // الأبناء يدويًا: JSON.stringify يرمي على مراجع Fiber الدائرية.
        return !hasVisibleText(n);
      });
    expect(unlabelled.map((n) => n.props?.accessibilityRole)).toEqual([]);
  });
});
