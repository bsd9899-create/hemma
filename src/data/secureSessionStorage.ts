/**
 * تخزين جلسة Supabase في Keychain/Keystore بدل AsyncStorage.
 *
 * ⚠️ غير مُفعَّل بعد — راجع "كيف يُفعَّل" في الأسفل. الملف جاهز عمدًا
 * وغير موصول، لأن تبديل مخزن الجلسة يمسّ المصادقة، وهي محميّة بقرار
 * صريح منك.
 *
 * ── المشكلة ───────────────────────────────────────────────────────
 * AsyncStorage يكتب على iOS في ملف عادي داخل حاوية التطبيق، غير
 * مشفَّر ومشمول في النسخ الاحتياطية. الجلسة تحوي refresh token طويل
 * العمر يمنح حاملَه وصولًا كاملًا للحساب. أي نسخة احتياطية غير مشفَّرة،
 * أو جهاز مكسور الحماية (jailbroken)، أو أداة فحص محلية، تقرأه نصًا
 * صريحًا. Keychain يحلّ هذا بالتشفير على مستوى النظام.
 *
 * ── قيد SecureStore وحلّه ─────────────────────────────────────────
 * SecureStore يرفض القيم فوق ~2048 بايت، وجلسة Supabase (توكن وصول
 * JWT + refresh token + بيانات المستخدم) تتجاوز هذا الحد بسهولة. لذلك
 * نقسّم القيمة إلى أجزاء ونخزّن عدد الأجزاء في مفتاح فهرس.
 *
 * ── لماذا لن يخرج أحد من حسابه ───────────────────────────────────
 * getItem يقرأ من SecureStore أولًا، وإن لم يجد شيئًا يقرأ من
 * AsyncStorage (المخزن القديم) وينقل القيمة إلى SecureStore ثم يحذف
 * القديمة. أي أن أول تشغيل بعد التفعيل يهاجر الجلسة القائمة بصمت،
 * ولا يُطلب من أحد تسجيل الدخول من جديد.
 *
 * ── كيف يُفعَّل ────────────────────────────────────────────────────
 * في src/data/supabase.ts، استبدل:
 *     storage: AsyncStorage,
 * بـ:
 *     storage: secureSessionStorage,
 * ثم ابنِ Dev Client جديدًا (expo-secure-store وحدة أصلية، وهي مُعلنة
 * أصلًا في plugins داخل app.json فلا حاجة لتغيير الإعداد).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** الحد الآمن لكل جزء — أقل من حد SecureStore (~2048) بهامش مريح. */
const CHUNK_SIZE = 1536;

/** مفتاح يحمل عدد أجزاء قيمة ما. */
function indexKey(key: string): string {
  return `${key}__chunks`;
}

function chunkKey(key: string, i: number): string {
  return `${key}__${i}`;
}

/**
 * SecureStore يقبل [A-Za-z0-9._-] فقط في أسماء المفاتيح. مفاتيح
 * Supabase تحوي أحيانًا محارف أخرى، فنُطهّرها بشكل حتمي (نفس المدخل
 * يعطي نفس المخرج دائمًا) حتى تبقى القراءة والكتابة متطابقتين.
 */
function sanitize(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readChunked(key: string): Promise<string | null> {
  const safeKey = sanitize(key);
  const countRaw = await SecureStore.getItemAsync(indexKey(safeKey));
  if (countRaw === null) return null;

  const count = Number.parseInt(countRaw, 10);
  if (!Number.isFinite(count) || count <= 0) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(safeKey, i));
    // جزء مفقود يعني قيمة تالفة (كتابة انقطعت مثلًا). نعاملها كغياب
    // تام بدل إعادة جلسة نصفية يرفضها Supabase برسالة غامضة.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function writeChunked(key: string, value: string): Promise<void> {
  const safeKey = sanitize(key);
  await clearChunked(key);

  const parts: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    parts.push(value.slice(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < parts.length; i++) {
    await SecureStore.setItemAsync(chunkKey(safeKey, i), parts[i]);
  }
  // الفهرس يُكتب أخيرًا: قبل اكتماله لا تُعتبر القيمة موجودة أصلًا،
  // فانقطاع في المنتصف يترك غيابًا نظيفًا لا قيمة نصفية.
  await SecureStore.setItemAsync(indexKey(safeKey), String(parts.length));
}

async function clearChunked(key: string): Promise<void> {
  const safeKey = sanitize(key);
  const countRaw = await SecureStore.getItemAsync(indexKey(safeKey));
  if (countRaw !== null) {
    const count = Number.parseInt(countRaw, 10);
    if (Number.isFinite(count)) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(safeKey, i));
      }
    }
  }
  await SecureStore.deleteItemAsync(indexKey(safeKey));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const secure = await readChunked(key);
    if (secure !== null) return secure;

    // هجرة صامتة من المخزن القديم: من كان مسجّلًا دخوله يبقى مسجّلًا.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy === null) return null;

    try {
      await writeChunked(key, legacy);
      await AsyncStorage.removeItem(key);
    } catch {
      // فشل النقل لا يجب أن يُفقد المستخدم جلسته — نُعيد القيمة القديمة
      // ونعيد المحاولة في التشغيل التالي.
    }
    return legacy;
  },

  async setItem(key: string, value: string): Promise<void> {
    await writeChunked(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await clearChunked(key);
    // نظّف أي بقايا في المخزن القديم عند تسجيل الخروج.
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};
