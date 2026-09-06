/**
 * ما الذي يرسله التطبيق فعليًا عند تسجيل الدخول بـ Google؟
 *
 * سبب وجود هذا الاختبار تشخيصي: المستخدم يرى على شاشة Google
 * «للمتابعة إلى zvcynshexfffvxskqhet.supabase.co» — نطاقًا غريبًا. هذه
 * الاختبارات تثبت أن النص **لا يأتي من التطبيق**: التطبيق لا يرسل
 * client_id ولا redirect_uri إلى Google إطلاقًا، بل Supabase من يبنيهما
 * على الخادم. لذلك لا يمكن إصلاح النص من الكود — مصدره إعداد شاشة
 * موافقة OAuth في Google Cloud (راجع docs/OAUTH_SETUP.md).
 */

const mockOpenAuthSession = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchange = jest.fn();

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...a: unknown[]) => mockOpenAuthSession(...a),
}));

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `hemma://${path}`,
}));

jest.mock('@/src/data/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...a: unknown[]) => mockSignInWithOAuth(...a),
      exchangeCodeForSession: (...a: unknown[]) => mockExchange(...a),
    },
  },
}));

jest.mock('@/src/data/repositories/profileRepository', () => ({
  profileRepository: { updateCurrent: jest.fn(async () => undefined) },
}));

// eslint-disable-next-line import/first
import { signInWithGoogle } from '../oauth';

beforeEach(() => {
  mockOpenAuthSession.mockReset();
  mockSignInWithOAuth.mockReset();
  mockExchange.mockReset();
  mockExchange.mockResolvedValue({ error: null });
});

describe('signInWithGoogle — ما يرسله التطبيق', () => {
  it('يمرّر رابط عودة التطبيق فقط، ولا يبني أي معطى خاص بـ Google', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hemma://auth/callback?code=abc' });

    await signInWithGoogle();

    const [args] = mockSignInWithOAuth.mock.calls[0];
    expect(args.provider).toBe('google');
    expect(args.options.redirectTo).toBe('hemma://auth/callback');
    expect(args.options.skipBrowserRedirect).toBe(true);

    // ⚠️ الجوهر: لا client_id ولا redirect_uri ولا أي شيء يخص Google.
    // اسم/نطاق التطبيق الذي تعرضه Google يأتي من إعداد Google Cloud وحده.
    const sent = JSON.stringify(args);
    expect(sent).not.toMatch(/client_id/i);
    expect(sent).not.toMatch(/client_secret/i);
    expect(sent).not.toMatch(/googleusercontent/i);
    expect(sent).not.toMatch(/accounts\.google\.com/i);
  });

  it('يفتح جلسة المصادقة برابط Supabase نفسه بلا تعديل', async () => {
    const authorizeUrl = 'https://project.supabase.co/auth/v1/authorize?provider=google&code_challenge=x';
    mockSignInWithOAuth.mockResolvedValue({ data: { url: authorizeUrl }, error: null });
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hemma://auth/callback?code=abc' });

    await signInWithGoogle();

    expect(mockOpenAuthSession).toHaveBeenCalledWith(authorizeUrl, 'hemma://auth/callback');
  });

  it('يبادل الكود بجلسة بعد العودة الناجحة', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://p.supabase.co/x' }, error: null });
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hemma://auth/callback?code=THE_CODE' });

    const result = await signInWithGoogle();

    expect(mockExchange).toHaveBeenCalledWith('THE_CODE');
    expect(result.cancelled).toBe(false);
  });

  it('يعامل إغلاق المستخدم للمتصفح كإلغاء صامت لا خطأ', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://p.supabase.co/x' }, error: null });
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithGoogle()).resolves.toEqual({ cancelled: true });
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it('يرفع رفض المزوّد برسالته بدل ابتلاعه', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://p.supabase.co/x' }, error: null });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'hemma://auth/callback?error=access_denied&error_description=User+denied',
    });

    await expect(signInWithGoogle()).rejects.toThrow('User denied');
  });

  it('لا يبادل كودًا غير موجود', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://p.supabase.co/x' }, error: null });
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'hemma://auth/callback' });

    await expect(signInWithGoogle()).rejects.toThrow();
    expect(mockExchange).not.toHaveBeenCalled();
  });
});
