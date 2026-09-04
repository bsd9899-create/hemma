import { getFriendlyErrorMessage, isOfflineError } from '../errors';

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

  it('يعيد رسالة الخطأ نفسها لو كان خطأ منطق عادي', () => {
    expect(getFriendlyErrorMessage(new Error('كود الدعوة غير صحيح'))).toBe('كود الدعوة غير صحيح');
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

    it('يكتشف انقطاع الشبكة داخل أخطاء Supabase أيضًا', () => {
      const error = Object.assign(new Error('fetch failed: UnexpectedException'), { status: 0 });
      expect(getFriendlyErrorMessage(error)).toContain('غير متصل بالإنترنت');
    });
  });
});
