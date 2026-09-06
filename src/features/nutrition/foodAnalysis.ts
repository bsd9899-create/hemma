import { supabase } from '@/src/data/supabase';

/** عنصر واحد قدّره النموذج داخل الوجبة. */
export type AnalyzedItem = {
  name_ar: string;
  name_en: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type FoodAnalysis = {
  items: AnalyzedItem[];
  confidence: 'high' | 'medium' | 'low';
  note_ar: string;
};

/** أخطاء نعرضها للمستخدم برسائل مختلفة — لا رسالة عامة واحدة. */
export type FoodAnalysisErrorCode =
  | 'not_configured'
  | 'daily_limit_reached'
  | 'invalid_image'
  | 'image_too_large'
  | 'unparseable_result'
  | 'upstream_unavailable'
  | 'unknown';

export class FoodAnalysisError extends Error {
  constructor(readonly code: FoodAnalysisErrorCode) {
    super(code);
    this.name = 'FoodAnalysisError';
  }
}

/**
 * يرسل الصورة إلى Edge Function للتحليل.
 *
 * لا يوجد مفتاح مزوّد في التطبيق: الدالة على الخادم تحمله. العميل يرسل
 * الصورة وتوكن المستخدم فقط — راجع supabase/functions/analyze-food.
 *
 * النتيجة **تقدير يعرضه التطبيق للتأكيد**، ولا تُحفظ تلقائيًا. حفظ رقم
 * مقدَّر بلا موافقة المستخدم يملأ سجلّه بأرقام لم يقرّها.
 */
export async function analyzeFoodPhoto(params: {
  imageBase64: string;
  mediaType: string;
  hint?: string;
}): Promise<FoodAnalysis> {
  const { data, error } = await supabase.functions.invoke<FoodAnalysis & { error?: string }>(
    'analyze-food',
    { body: params }
  );

  if (error) {
    // supabase-js يلفّ استجابات non-2xx في FunctionsHttpError ويُخفي
    // الجسم؛ نقرأه لنعرف السبب الحقيقي بدل عرض "فشل" مبهم.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.json();
        throw new FoodAnalysisError((body?.error as FoodAnalysisErrorCode) ?? 'unknown');
      } catch (e) {
        if (e instanceof FoodAnalysisError) throw e;
      }
    }
    throw new FoodAnalysisError('unknown');
  }

  if (!data || !Array.isArray(data.items)) throw new FoodAnalysisError('unparseable_result');
  return data;
}

/** مجموع الوجبة من عناصرها — ما يُحفظ فعليًا بعد تأكيد المستخدم. */
export function sumAnalysis(items: AnalyzedItem[]): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein_g: total.protein_g + item.protein_g,
      carbs_g: total.carbs_g + item.carbs_g,
      fat_g: total.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}
