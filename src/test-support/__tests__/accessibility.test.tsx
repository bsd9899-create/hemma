/**
 * فحص الوصول على الشجرة المعروضة فعليًا.
 *
 * الفحص الساكن لا يرى ما يراه قارئ الشاشة: زر نصّه رمز واحد ("✕") بلا
 * تسمية يُقرأ كـ"زر" فقط، وهدف لمس 24×24 يُخطئه من يده ترتجف. هذه
 * الفحوص تمشي على الشجرة كما تُبنى.
 */
import { SCREENS, mount, resetScreenMocks } from '../screenMocks';
import { findPressables } from '../renderScreen';

/**
 * أعمق عنصر قابل للضغط في كل سلسلة — وهو الذي يصل إلى قارئ الشاشة.
 *
 * ‏<Button onPress=…> يحمل onPress ويمرّرها إلى <Pressable> داخله الذي
 * يحمل الدور والمقاس، فعدّ الاثنين يبلّغ عن كل زر في التطبيق كأنه بلا
 * دور. والتصفية بـ typeof type === 'string' لا تنفع: Pressable نفسه
 * مكوّن مركّب في React Native، فتُسقِط كل شيء ويمرّ الاختبار فارغًا —
 * وهو ما حدث في أول نسخة من هذا الملف قبل أن يكشفه كسرها عمدًا.
 */
function hostPressables(view: Parameters<typeof findPressables>[0]) {
  const all = findPressables(view);
  return all.filter((node) => {
    const descendants = node.findAll(
      (child) => child !== node && typeof child.props?.onPress === 'function',
      { deep: true },
    );
    return descendants.length === 0 && !isSelfManaged(node);
  });
}

/** أصغر هدف لمس مقبول — إرشادات Apple وGoogle كلتاهما 44. */
const MIN_TOUCH_TARGET = 44;

beforeEach(resetScreenMocks);

type Style = Record<string, unknown>;

function flattenStyle(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  if (style && typeof style === 'object') return style as Style;
  return {};
}

/** أكبر مقاس فعّال للعنصر، شاملًا hitSlop على الجانبين. */
function effectiveSize(props: Record<string, unknown>): { width: number | null; height: number | null } {
  const style = flattenStyle(typeof props.style === 'function' ? props.style({ pressed: false }) : props.style);
  const slop = props.hitSlop;
  const slopValue = typeof slop === 'number' ? slop : 0;
  const slopObject = slop && typeof slop === 'object' ? (slop as Record<string, number>) : {};

  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  const height = num(style.height) ?? num(style.minHeight);
  const width = num(style.width) ?? num(style.minWidth);

  const vertical = slopValue * 2 + (slopObject.top ?? 0) + (slopObject.bottom ?? 0);
  const horizontal = slopValue * 2 + (slopObject.left ?? 0) + (slopObject.right ?? 0);

  return {
    width: width === null ? null : width + horizontal,
    height: height === null ? null : height + vertical,
  };
}

/**
 * مكوّنات تُدير وصولها بنفسها ولا نتحكّم في خصائصها.
 *
 * زر "المتابعة عبر Apple" يفرضه شرط آبل 4.8 ويأتي من إطارها هو: شكله
 * وتسميته ودوره كلها من نظام التشغيل، ولا تُقرأ من خصائصه هنا. استثناؤه
 * بالاسم أصدق من إضافة خصائص شكلية لإسكات اختبار.
 */
const SELF_MANAGED = ['AppleAuthenticationButton'];

function isSelfManaged(node: { type: unknown }): boolean {
  const name =
    typeof node.type === 'string'
      ? node.type
      : ((node.type as { displayName?: string; name?: string })?.displayName ??
        (node.type as { name?: string })?.name ??
        '');
  return SELF_MANAGED.some((known) => name.includes(known));
}

describe.each(SCREENS)('وصول شاشة $name', ({ load }) => {
  it('كل عنصر تفاعلي يحمل دورًا معلنًا', async () => {
    const view = await mount(load);
    const roleless = hostPressables(view)
      .filter((node) => !node.props.accessibilityRole && !node.props.role)
      // العناصر التي يلفّها مكوّن يحمل الدور بدل أن تحمله بنفسها.
      .filter((node) => !node.props.accessible)
      .map((node) => JSON.stringify(node.props.accessibilityLabel ?? node.props.testID ?? 'بلا تسمية'));
    expect(roleless).toEqual([]);
  });

  /**
   * العنصر الذي يصرّح بمقاسه يجب أن يبلغ 44 بعد hitSlop. الذي لا يصرّح
   * (يتمدّد بمحتواه أو بـ flex) لا يمكن قياسه هنا، فلا يُدّعى أنه فُحص.
   */
  it('كل عنصر يصرّح بمقاسه يبلغ 44 نقطة على الأقل', async () => {
    const view = await mount(load);
    const tooSmall = hostPressables(view)
      .map((node) => ({ label: node.props.accessibilityLabel ?? node.props.testID ?? '؟', ...effectiveSize(node.props) }))
      .filter(({ width, height }) => (width !== null && width < MIN_TOUCH_TARGET) || (height !== null && height < MIN_TOUCH_TARGET))
      .map(({ label, width, height }) => `${label}: ${width ?? '—'}×${height ?? '—'}`);
    expect(tooSmall).toEqual([]);
  });

  it('لا عنصر تفاعلي معطَّل بلا إعلان ذلك لقارئ الشاشة', async () => {
    const view = await mount(load);
    const silentlyDisabled = hostPressables(view)
      .filter((node) => node.props.disabled === true)
      .filter((node) => !node.props.accessibilityState?.disabled)
      .map((node) => String(node.props.accessibilityLabel ?? 'زر معطَّل'));
    expect(silentlyDisabled).toEqual([]);
  });
});
