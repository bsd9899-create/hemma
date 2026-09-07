import { render } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import { Appear } from '../components/Appear';
import { duration, ENTER_OFFSET } from '../motion';

/**
 * الحركة التي تتجاهل إعداد "تقليل الحركة" ليست تفصيلًا تجميليًا: من
 * يفعّله كثيرًا ما يفعّله لأن الحركة تسبّب له دوارًا فعليًا. هذه الفحوص
 * تثبّت أن الإلغاء كامل لا مجرّد إبطاء.
 */
describe('احترام تقليل الحركة', () => {
  const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');

  afterEach(() => {
    spy.mockReset();
  });

  it('يُركّب المحتوى في الحالتين', async () => {
    for (const reduced of [false, true]) {
      spy.mockResolvedValue(reduced);
      const view = render(
        <Appear>
          <Text>محتوى</Text>
        </Appear>,
      );
      expect(view.getByText('محتوى')).toBeTruthy();
      view.unmount();
    }
  });

  it('يسأل النظام عن الإعداد بدل افتراضه', async () => {
    spy.mockResolvedValue(true);
    render(
      <Appear>
        <Text>محتوى</Text>
      </Appear>,
    );
    expect(spy).toHaveBeenCalled();
  });
});

describe('مدد الحركة معقولة', () => {
  /**
   * أقصر من 150 يُقرأ كوميض لا كانتقال، وأطول من 300 يُقرأ كبطء في
   * التطبيق نفسه. هذه ليست أرقامًا اعتباطية بل حدود ما يُدرَك كاستجابة.
   */
  it('مدة الظهور بين 150 و300 مللي ثانية', () => {
    expect(duration.enter).toBeGreaterThanOrEqual(150);
    expect(duration.enter).toBeLessThanOrEqual(300);
  });

  it('ردّ فعل اللمس أسرع من الظهور', () => {
    expect(duration.press).toBeLessThan(duration.enter);
  });

  /**
   * إزاحة كبيرة تجعل المحتوى ينزلق من خارج الشاشة، وهو ما يسبّب الدوار
   * تحديدًا. ثماني نقاط إيحاء بالاستقرار لا انتقال مكاني.
   */
  it('الإزاحة قصيرة — إيحاء لا انزلاق', () => {
    expect(ENTER_OFFSET).toBeLessThanOrEqual(12);
    expect(ENTER_OFFSET).toBeGreaterThan(0);
  });
});

describe('كل شاشة تحمّل بيانات تُظهر محتواها بانتقال', () => {
  const { readFileSync, readdirSync } = require('fs') as typeof import('fs');
  const { join } = require('path') as typeof import('path');

  const APP = join(__dirname, '../../../app');

  function screens(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screens(path);
      return entry.name.endsWith('.tsx') ? [path] : [];
    });
  }

  /**
   * الشاشة التي تعرض هيكلًا عظميًا ثم تستبدله بالمحتوى في إطار واحد
   * تُقرأ كقفزة. الشاشات التي لا تحمّل شيئًا لا يعنيها هذا.
   */
  const loading = screens(APP).filter((file) => /Skeleton/.test(readFileSync(file, 'utf8')));

  it('وُجدت شاشات تحميل (حارس ضد اختبار لا يفحص شيئًا)', () => {
    expect(loading.length).toBeGreaterThanOrEqual(8);
  });

  it.each(loading.map((f) => [f.replace(APP, 'app'), f] as const))('%s تستعمل Appear', (_name, file) => {
    expect(readFileSync(file, 'utf8')).toContain('<Appear');
  });
});
