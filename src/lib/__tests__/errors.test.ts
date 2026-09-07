import i18n from '@/src/lib/i18n';
import { getFriendlyErrorMessage, isOfflineError, UserFacingError } from '../errors';

describe('isOfflineError', () => {
  it('يتعرّف على فشل fetch الشائع في React Native', () => {
    expect(isOfflineError(new Error('Network request failed'))).toBe(true);
  });

  it('يتعرّف على فشل fetch في المتصفح/Node', () => {
    expect(isOfflineError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('لا يعتبر خطأ منطق عادي انقطاع شبكة', () => {
    expect(isOfflineError(new Error('كود الدعوة غير صحيح'))).toBe(false);
  });

  it('لا يفشل مع قيم ليست Error', () => {
    expect(isOfflineError('نص عادي')).toBe(false);
    expect(isOfflineError(null)).toBe(false);
  });
});

describe('getFriendlyErrorMessage', () => {
  it('يعطي رسالة انقطاع اتصال مخصّصة عند خطأ شبكة', () => {
    expect(getFriendlyErrorMessage(new Error('Network request failed'))).toContain('غير متصل بالإنترنت');
  });

  /**
   * كان هذا الاختبار يمرّر `new Error('نص عربي')` ويتوقّع عرضه كما هو —
   * أي أنه كان يثبّت الافتراض الخاطئ نفسه: أن كل Error كتبناه نحن. النية
   * صحيحة (الرسالة المقصودة تُعرض)، والتعبير عنها هو ما تغيّر.
   */
  it('يعيد الرسالة المقصودة كما هي حين تُعلَن كذلك', () => {
    expect(getFriendlyErrorMessage(new UserFacingError('كود الدعوة غير صحيح'))).toBe('كود الدعوة غير صحيح');
  });

  it('لا يعرض رسالة Error عادي لأنها قد تكون خطأ برمجيًا', () => {
    expect(getFriendlyErrorMessage(new Error('كود الدعوة غير صحيح'), 'تعذّر الانضمام')).toBe('تعذّر الانضمام');
  });

  it('يستخدم fallback المخصّص عند غياب رسالة واضحة', () => {
    expect(getFriendlyErrorMessage('شيء غريب', 'تعذّر الحفظ')).toBe('تعذّر الحفظ');
  });

  it('يستخدم الرسالة العامة الافتراضية لو لم يُمرَّر fallback', () => {
    expect(getFriendlyErrorMessage({})).toBe('حدث خطأ غير متوقع، حاول مرة أخرى');
  });

  describe('أخطاء Supabase/Postgres', () => {
    /** يحاكي PostgrestError: يرث Error ويحمل code ورسالة تقنية إنجليزية. */
    function postgrestError(code: string, message: string) {
      return Object.assign(new Error(message), { code, details: null, hint: null, name: 'PostgrestError' });
    }

    it('يترجم رفض RLS إلى رسالة صلاحيات واضحة بدل الرسالة التقنية', () => {
      const error = postgrestError('42501', 'new row violates row-level security policy for table "daily_logs"');
      expect(getFriendlyErrorMessage(error)).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء');
    });

    it('لا يسرّب أسماء الجداول أو الأعمدة للمستخدم', () => {
      const error = postgrestError('42501', 'new row violates row-level security policy for table "daily_logs"');
      expect(getFriendlyErrorMessage(error)).not.toContain('daily_logs');
    });

    it('يترجم تكرار قيمة فريدة', () => {
      expect(getFriendlyErrorMessage(postgrestError('23505', 'duplicate key value'))).toBe('هذا العنصر مُسجَّل مسبقًا');
    });

    it('يترجم حقلًا مطلوبًا ناقصًا', () => {
      expect(getFriendlyErrorMessage(postgrestError('23502', 'null value in column "goal_type"'))).toBe(
        'بعض الحقول المطلوبة ناقصة'
      );
    });

    it('يترجم انتهاء الجلسة من status 401', () => {
      const error = Object.assign(new Error('JWT expired'), { status: 401, name: 'AuthApiError' });
      expect(getFriendlyErrorMessage(error)).toBe('انتهت جلستك — سجّل الدخول مرة أخرى');
    });

    it('يترجم أخطاء الخادم 5xx إلى رسالة مؤقتة', () => {
      const error = Object.assign(new Error('internal error'), { status: 503, name: 'AuthApiError' });
      expect(getFriendlyErrorMessage(error)).toBe('الخدمة غير متاحة مؤقتًا — حاول بعد قليل');
    });

    it('يقع على fallback الشاشة عند كود خادم غير معروف، بلا رسالة تقنية', () => {
      const error = postgrestError('XX999', 'some internal postgres detail');
      expect(getFriendlyErrorMessage(error, 'تعذّر الحفظ')).toBe('تعذّر الحفظ');
    });

    it('لا يسرّب كود الخطأ ولا نصه الإنجليزي إلى رسالة المستخدم', () => {
      const error = postgrestError('42501', 'permission denied for table profiles');
      const message = getFriendlyErrorMessage(error);
      expect(message).not.toContain('42501');
      expect(message).not.toContain('permission denied');
      expect(message).not.toContain('profiles');
      expect(message).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء');
    });

    it('يكتشف انقطاع الشبكة داخل أخطاء Supabase أيضًا', () => {
      const error = Object.assign(new Error('fetch failed: UnexpectedException'), { status: 0 });
      expect(getFriendlyErrorMessage(error)).toContain('غير متصل بالإنترنت');
    });
  });
});

describe('لا تصل رسالة تقنية إلى المستخدم أبدًا', () => {
  /**
   * كل واحد من هذه رماه محرّك JavaScript لا نحن، ورسالته إنجليزية
   * تقنية. ظهورها وسط واجهة عربية هو ما كان يحدث فعلًا في ثلاث شاشات.
   */
  const RUNTIME_FAILURES: [string, unknown][] = [
    ['TypeError', new TypeError('repo.getMyTeam is not a function')],
    ['ReferenceError', new ReferenceError('userId is not defined')],
    ['SyntaxError', new SyntaxError('Unexpected token < in JSON at position 0')],
    ['RangeError', new RangeError('Maximum call stack size exceeded')],
    ['Error عادي بنص إنجليزي', new Error('Cannot read property length of undefined')],
  ];

  it.each(RUNTIME_FAILURES)('%s لا تُعرض رسالته', (_name, failure) => {
    const shown = getFriendlyErrorMessage(failure);
    const raw = (failure as Error).message;
    expect(shown).not.toContain(raw);
    expect(shown).not.toMatch(/[a-zA-Z]{4,}/);
  });

  it.each(RUNTIME_FAILURES)('%s يحترم رسالة الشاشة البديلة', (_name, failure) => {
    expect(getFriendlyErrorMessage(failure, 'تعذّر تحميل فريقك')).toBe('تعذّر تحميل فريقك');
  });

  it('الرسالة المكتوبة للمستخدم عمدًا تُعرض كما هي', () => {
    expect(getFriendlyErrorMessage(new UserFacingError('سجّل دخولك أولًا'))).toBe('سجّل دخولك أولًا');
  });

  it('الرسالة المقصودة تسبق البديل، لأنها أدق منه', () => {
    expect(getFriendlyErrorMessage(new UserFacingError('كود الدعوة غير صحيح'), 'تعذّر الانضمام')).toBe(
      'كود الدعوة غير صحيح',
    );
  });

  it('UserFacingError بلا نص يسقط إلى البديل بدل عرض فراغ', () => {
    expect(getFriendlyErrorMessage(new UserFacingError(''), 'تعذّر الحفظ')).toBe('تعذّر الحفظ');
  });

  it('انقطاع الشبكة يبقى مميّزًا رغم أنه TypeError في React Native', () => {
    const offline = new TypeError('Network request failed');
    expect(getFriendlyErrorMessage(offline)).toBe(i18n.t('common.offlineError'));
  });
});
