import {
  buildSubscriptionPatch,
  isKnownUserId,
  PREMIUM_ACTIVE_EVENTS,
  PREMIUM_INACTIVE_EVENTS,
  safeEqual,
  staleGuardTimestamp,
  type RevenueCatEvent,
} from '../functions/_shared/subscription';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-09-07T10:00:00.000Z');

function event(overrides: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  return { type: 'RENEWAL', app_user_id: USER, ...overrides };
}

describe('السر المشترك', () => {
  it('يقبل المطابق تمامًا', () => {
    expect(safeEqual('Bearer s3cret', 'Bearer s3cret')).toBe(true);
  });

  it.each([
    ['حرف واحد مختلف', 'Bearer s3cret', 'Bearer s3crat'],
    ['بادئة صحيحة فقط', 'Bearer s3c', 'Bearer s3cret'],
    ['أطول من الصحيح', 'Bearer s3cretX', 'Bearer s3cret'],
    ['فارغ مقابل سر', '', 'Bearer s3cret'],
    ['سر مقابل فارغ', 'Bearer s3cret', ''],
  ])('يرفض: %s', (_name, provided, expected) => {
    expect(safeEqual(provided, expected)).toBe(false);
  });

  it('يقارن كل البايتات مهما اختلف الطول (لا خروج مبكر)', () => {
    // الطول المختلف لا يجعلها ترجع فورًا: المقارنة تمرّ على الأطول كاملًا.
    expect(safeEqual('a', 'a'.repeat(500))).toBe(false);
    expect(safeEqual('a'.repeat(500), 'a')).toBe(false);
  });

  it('يقارن البايتات لا الأحرف (نص عربي)', () => {
    expect(safeEqual('سرّ', 'سرّ')).toBe(true);
    expect(safeEqual('سرّ', 'سر')).toBe(false);
  });
});

describe('هوية المستخدم', () => {
  it('يقبل UUID حقيقيًا', () => {
    expect(isKnownUserId(USER)).toBe(true);
  });

  /**
   * هذه هي الحالة التي كانت تجعل RevenueCat يعيد المحاولة إلى الأبد:
   * معرّف مجهول يُمرَّر إلى عمود uuid فيرفع 22P02 فنُرجع 500.
   */
  it.each([
    ['معرّف مجهول من RevenueCat', '$RCAnonymousID:8a9b0c1d2e3f'],
    ['نص فارغ', ''],
    ['UUID ناقص', '11111111-1111-4111-8111'],
    ['نص عادي', 'user_42'],
    ['حقن SQL', "'; drop table subscriptions; --"],
  ])('يرفض: %s', (_name, id) => {
    expect(isKnownUserId(id)).toBe(false);
  });
});

describe('قرار الاشتراك', () => {
  it.each([...PREMIUM_ACTIVE_EVENTS].map((type) => [type] as const))('%s يفعّل الاشتراك', (type) => {
    expect(buildSubscriptionPatch(event({ type }), NOW).is_premium).toBe(true);
  });

  it.each([...PREMIUM_INACTIVE_EVENTS].map((type) => [type] as const))('%s يوقف الاشتراك', (type) => {
    const patch = buildSubscriptionPatch(event({ type }), NOW);
    expect(patch.is_premium).toBe(false);
    expect(patch.will_renew).toBe(false);
  });

  /**
   * أغلى خطأ ممكن في هذا الملف: إلغاء التجديد التلقائي ليس انتهاء
   * اشتراك. من ألغى التجديد اليوم دفع حتى نهاية دورته، وسلبه إياها
   * سرقة صريحة لما دفع ثمنه.
   */
  it('CANCELLATION لا تسلب اشتراكًا مدفوعًا', () => {
    const patch = buildSubscriptionPatch(event({ type: 'CANCELLATION' }), NOW);
    expect(patch).not.toHaveProperty('is_premium');
  });

  it('TRANSFER لا تغيّر حالة الاشتراك', () => {
    expect(buildSubscriptionPatch(event({ type: 'TRANSFER' }), NOW)).not.toHaveProperty('is_premium');
  });

  it('حدث لا نعرفه لا يغيّر حالة الاشتراك', () => {
    expect(buildSubscriptionPatch(event({ type: 'SOME_NEW_EVENT_2027' }), NOW)).not.toHaveProperty('is_premium');
  });

  it('الغياب يختلف عن false — الأول "لا تغيّر" والثاني "أوقف"', () => {
    const cancelled = buildSubscriptionPatch(event({ type: 'CANCELLATION' }), NOW);
    const expired = buildSubscriptionPatch(event({ type: 'EXPIRATION' }), NOW);
    expect('is_premium' in cancelled).toBe(false);
    expect('is_premium' in expired).toBe(true);
    expect(expired.is_premium).toBe(false);
  });
});

describe('حقول التعديل', () => {
  it('يترجم متجر Play ويجعل App Store الافتراضي', () => {
    expect(buildSubscriptionPatch(event({ store: 'PLAY_STORE' }), NOW).store).toBe('play_store');
    expect(buildSubscriptionPatch(event({ store: 'APP_STORE' }), NOW).store).toBe('app_store');
    expect(buildSubscriptionPatch(event({}), NOW).store).toBe('app_store');
  });

  it('يحوّل تاريخ الانتهاء إلى ISO', () => {
    const at = Date.UTC(2026, 11, 31, 12, 0, 0);
    expect(buildSubscriptionPatch(event({ expiration_at_ms: at }), NOW).expires_at).toBe(
      '2026-12-31T12:00:00.000Z',
    );
  });

  it.each([
    ['غائب', undefined],
    ['null', null],
    ['صفر', 0],
    ['سالب', -1],
    ['NaN', NaN],
    ['لا نهائي', Infinity],
  ])('تاريخ انتهاء %s يصبح null لا تاريخًا مشوّهًا', (_name, ms) => {
    expect(buildSubscriptionPatch(event({ expiration_at_ms: ms as number }), NOW).expires_at).toBeNull();
  });

  it('will_renew يصدق فقط لشراء أو تجديد', () => {
    expect(buildSubscriptionPatch(event({ type: 'RENEWAL' }), NOW).will_renew).toBe(true);
    expect(buildSubscriptionPatch(event({ type: 'INITIAL_PURCHASE' }), NOW).will_renew).toBe(true);
    expect(buildSubscriptionPatch(event({ type: 'UNCANCELLATION' }), NOW).will_renew).toBe(false);
  });

  it('product_id الغائب يصبح null لا undefined', () => {
    expect(buildSubscriptionPatch(event({}), NOW).product_id).toBeNull();
  });

  it('يسجّل وقت المزامنة من الساعة المُمرَّرة', () => {
    expect(buildSubscriptionPatch(event({}), NOW).last_synced_at).toBe(NOW.toISOString());
  });
});

describe('الحماية من الأحداث المتأخرة', () => {
  it('يعطي حدًّا زمنيًا حين يرسل الحدث ختمه', () => {
    const at = Date.UTC(2026, 8, 7, 9, 0, 0);
    expect(staleGuardTimestamp(event({ event_timestamp_ms: at }))).toBe('2026-09-07T09:00:00.000Z');
  });

  /**
   * بلا ختم زمني لا شرط أصلًا. شرط مبنيّ على NaN أسوأ من لا شرط: يطابق
   * صفرًا من الصفوف دائمًا، فلا يُحدَّث اشتراك أحد أبدًا وبصمت.
   */
  it.each([
    ['غائب', undefined],
    ['null', null],
    ['NaN', NaN],
    ['صفر', 0],
  ])('ختم %s يعني لا شرط', (_name, ms) => {
    expect(staleGuardTimestamp(event({ event_timestamp_ms: ms as number }))).toBeNull();
  });
});
