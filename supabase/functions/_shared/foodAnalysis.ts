/**
 * تحقّق مُدخلات تحليل الطعام وتطهير مخرجات النموذج، مفصولين عن Deno
 * وعن الشبكة حتى يمكن تشغيلهما في الاختبارات.
 *
 * الطرفان هنا غير موثوقين: الصورة تأتي من العميل، والنتيجة تأتي من
 * نموذج لغوي. كلاهما يُفحص قبل أن يكلّف مالًا أو يدخل قاعدة البيانات.
 */

/** أكبر صورة مقبولة. الأكبر يُرفض قبل أن يُستهلك رصيد بلا فائدة. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** حدّ الاستخدام اليومي لكل مستخدم — حماية للتكلفة لا تقييد للمستخدم. */
export const DAILY_LIMIT = 25;

export type ImageRejection = 'invalid_image' | 'image_too_large';

/**
 * سبب رفض الصورة، أو null لو كانت مقبولة.
 *
 * الترتيب مقصود: النوع والوجود يُفحصان قبل الحجم، لأن فحص الحجم على
 * مُدخَل غائب لا معنى له.
 */
export function rejectImage(imageBase64: unknown, mediaType: unknown): ImageRejection | null {
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) return 'invalid_image';
  if (typeof mediaType !== 'string' || !ALLOWED_MEDIA_TYPES.has(mediaType)) return 'invalid_image';
  // طول base64 ≈ 4/3 من حجم البايتات — نقدّره قبل أي عمل مكلف.
  if ((imageBase64.length * 3) / 4 > MAX_IMAGE_BYTES) return 'image_too_large';
  return null;
}

/** نص المستخدم المرسل مع الصورة، مقصوصًا حتى لا يبتلع نافذة السياق. */
export function buildUserText(hint: unknown): string {
  const trimmed = typeof hint === 'string' ? hint.trim() : '';
  if (!trimmed) return 'حلّل هذه الوجبة.';
  return `حلّل هذه الوجبة. ملاحظة من المستخدم: ${trimmed.slice(0, 200)}`;
}

/** النموذج قد يلفّ JSON بأسوار markdown رغم التعليمات. */
export function stripCodeFence(text: string): string {
  return text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
}

export type FoodItem = {
  name_ar: string;
  name_en: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type FoodAnalysis = {
  items: FoodItem[];
  confidence: 'high' | 'medium' | 'low';
  note_ar: string;
};

const MAX_ITEMS = 12;

/**
 * تطهير مخرجات النموذج قبل تصديقها.
 *
 * مخرجات النموذج **مدخلات غير موثوقة** حتى لو كان النموذج ملكنا: رقم
 * سالب أو ضخم أو نص مكان رقم سيتسرّب إلى قاعدة البيانات ثم إلى حسابات
 * المستخدم. القصّ هنا لا لاحقًا.
 */
export function sanitizeResult(raw: unknown): FoodAnalysis | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;

  const items = obj.items.slice(0, MAX_ITEMS).map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    return {
      name_ar: str(item.name_ar),
      name_en: str(item.name_en),
      grams: num(item.grams, 5000),
      calories: num(item.calories, 5000),
      protein_g: num(item.protein_g, 500),
      carbs_g: num(item.carbs_g, 1000),
      fat_g: num(item.fat_g, 500),
    };
  });

  const confidence = obj.confidence === 'high' || obj.confidence === 'medium' ? obj.confidence : 'low';
  return { items, confidence, note_ar: str(obj.note_ar) };
}

function num(value: unknown, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.round(parsed * 10) / 10, max);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 120) : '';
}

