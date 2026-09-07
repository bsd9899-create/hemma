/**
 * الوسيط المرخَّص يظهر فعلًا حين يوجد.
 *
 * حذفتُ كتلة الاعتذار عن غياب الفيديو، وأزلت معها آخر إشارة إلى
 * `media_url` في الشاشة — فأصبح ترخيص فيديو لاحقًا لا يعرض شيئًا، بلا
 * أي خطأ. الفحص هنا يمنع تكرار ذلك.
 */
import { renderedText } from '../renderScreen';
import { mockScreenData, mount, resetScreenMocks } from '../screenMocks';
import { testExercise } from '../mocks';

beforeEach(resetScreenMocks);

const LICENSED = {
  ...testExercise,
  media_url: 'https://cdn.example.com/squat.mp4',
  media_license: 'CC BY 4.0',
  media_attribution: 'تصوير: مركز اللياقة — CC BY 4.0',
};

function mountDetail() {
  return mount(() => require('@/app/exercises/[id]'));
}

describe('عرض الوسيط المرخَّص', () => {
  it('يعرض الإسناد حين يكون الترخيص مسجَّلًا', async () => {
    mockScreenData.exerciseOverride = LICENSED;
    expect(renderedText(await mountDetail())).toContain('CC BY 4.0');
  });

  it('لا يعرض شيئًا حين يوجد رابط بلا ترخيص', async () => {
    mockScreenData.exerciseOverride = { ...LICENSED, media_license: null, media_attribution: null };
    const text = renderedText(await mountDetail());
    expect(text).not.toContain('CC BY');
    expect(text).toContain('طريقة الأداء');
  });

  it('لا يعرض شيئًا حين يوجد ترخيص بلا رابط', async () => {
    mockScreenData.exerciseOverride = { ...LICENSED, media_url: null };
    expect(renderedText(await mountDetail())).not.toContain('CC BY 4.0');
  });

  it('الإرشاد يبقى معروضًا مع الوسيط لا بدلًا منه', async () => {
    mockScreenData.exerciseOverride = LICENSED;
    const text = renderedText(await mountDetail());
    expect(text).toContain('CC BY 4.0');
    expect(text).toContain('طريقة الأداء');
  });
});
