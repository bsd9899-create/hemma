import { env } from '@/src/lib/env';

/**
 * ⚠️ تشخيصي مؤقت فقط — لعزل سبب "fetch failed" داخل عملية التطبيق نفسها.
 * احذف هذا الملف بالكامل بعد انتهاء التشخيص (وزر الاستدعاء في sign-in.tsx).
 * لا يلمس أي إعداد OAuth/Supabase — قراءة فقط، لا أسرار تُطبع.
 */

function describeError(e: unknown): { name?: string; message?: string; cause?: unknown } {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, cause: (e as { cause?: unknown }).cause };
  }
  return { message: String(e) };
}

async function testFetch(label: string, url: string): Promise<void> {
  const startedAt = Date.now();
  try {
    const res = await fetch(url);
    console.log(`[NET-DEBUG] ${label} (fetch): SUCCESS status=${res.status} (${Date.now() - startedAt}ms)`);
  } catch (e) {
    console.log(`[NET-DEBUG] ${label} (fetch): FAIL (${Date.now() - startedAt}ms)`, describeError(e));
  }
}

function testXHR(label: string, url: string): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      console.log(`[NET-DEBUG] ${label} (XHR): SUCCESS status=${xhr.status} (${Date.now() - startedAt}ms)`);
      resolve();
    };
    xhr.onerror = () => {
      console.log(`[NET-DEBUG] ${label} (XHR): FAIL status=${xhr.status} readyState=${xhr.readyState} (${Date.now() - startedAt}ms)`);
      resolve();
    };
    xhr.ontimeout = () => {
      console.log(`[NET-DEBUG] ${label} (XHR): TIMEOUT (${Date.now() - startedAt}ms)`);
      resolve();
    };
    try {
      xhr.send();
    } catch (e) {
      console.log(`[NET-DEBUG] ${label} (XHR): send() threw synchronously`, describeError(e));
      resolve();
    }
  });
}

export async function runNetworkDiagnostics(): Promise<void> {
  console.log('[NET-DEBUG] ===== بدء فحص الشبكة =====');
  console.log('[NET-DEBUG] typeof global.fetch:', typeof globalThis.fetch);
  console.log('[NET-DEBUG] typeof XMLHttpRequest:', typeof XMLHttpRequest);

  const supabaseHealthUrl = `${env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`;

  await testFetch('1) Supabase /auth/v1/health', supabaseHealthUrl);
  await testXHR('2) Supabase /auth/v1/health', supabaseHealthUrl);
  await testFetch('3) example.com', 'https://example.com');

  console.log('[NET-DEBUG] ===== انتهى فحص الشبكة =====');
}
