import {
  estimateOneRepMax,
  fieldsForMetric,
  isPersonalRecord,
  totalVolumeKg,
  workingSetCount,
  type SetLike,
} from '../workoutSets';

function set(partial: Partial<SetLike>): SetLike {
  return {
    weight_kg: null, reps: null, duration_seconds: null, distance_m: null, is_warmup: false, ...partial,
  };
}

describe('totalVolumeKg', () => {
  it('يجمع الوزن × التكرارات', () => {
    expect(totalVolumeKg([set({ weight_kg: 100, reps: 5 }), set({ weight_kg: 80, reps: 10 })])).toBe(1300);
  });

  it('يستثني الإحماء — وإلا ارتفع الحجم بمجرد إحماء أطول', () => {
    const sets = [set({ weight_kg: 60, reps: 10, is_warmup: true }), set({ weight_kg: 100, reps: 5 })];
    expect(totalVolumeKg(sets)).toBe(500);
  });

  it('يتجاهل المجموعات بلا وزن أو تكرارات بدل إنتاج NaN', () => {
    expect(totalVolumeKg([set({ duration_seconds: 60 }), set({ weight_kg: 50, reps: 5 })])).toBe(250);
  });
});

describe('workingSetCount', () => {
  it('لا يعدّ الإحماء', () => {
    expect(workingSetCount([set({ is_warmup: true }), set({}), set({})])).toBe(2);
  });
});

describe('estimateOneRepMax — Epley 1985', () => {
  it('يطابق المعادلة المنشورة', () => {
    // 100 × (1 + 5/30) = 116.67 → 116.7
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });

  it('تكرار واحد = الوزن نفسه بلا تقدير', () => {
    expect(estimateOneRepMax(120, 1)).toBe(120);
  });

  it('يرفض التقدير فوق 10 تكرارات بدل رقم واثق وخاطئ', () => {
    // دقة Epley تنهار مع التكرارات العالية — null أصدق من رقم مخترع.
    expect(estimateOneRepMax(60, 20)).toBeNull();
  });

  it('يرفض المدخلات غير المنطقية', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(NaN, 5)).toBeNull();
  });
});

describe('isPersonalRecord', () => {
  const noPrevious = { estimated1rmKg: null, maxReps: null, maxDurationSeconds: null };

  it('يعتبر مجموعة أخف بتكرارات أكثر رقمًا قياسيًا إذا زاد 1RM المقدَّر', () => {
    // 90×8 → 1RM ≈ 114، أعلى من 100×1 = 100. مقارنة الوزن وحده كانت ستفشل.
    const previous = { estimated1rmKg: 100, maxReps: null, maxDurationSeconds: null };
    expect(isPersonalRecord('weight_reps', set({ weight_kg: 90, reps: 8 }), previous)).toBe(true);
  });

  it('لا يعتبر وزنًا أعلى بتكرار أقل رقمًا قياسيًا إذا انخفض 1RM', () => {
    const previous = { estimated1rmKg: 130, maxReps: null, maxDurationSeconds: null };
    expect(isPersonalRecord('weight_reps', set({ weight_kg: 120, reps: 1 }), previous)).toBe(false);
  });

  it('أول مجموعة على الإطلاق رقم قياسي', () => {
    expect(isPersonalRecord('weight_reps', set({ weight_kg: 50, reps: 5 }), noPrevious)).toBe(true);
  });

  it('الإحماء لا يكون رقمًا قياسيًا أبدًا', () => {
    expect(isPersonalRecord('weight_reps', set({ weight_kg: 200, reps: 5, is_warmup: true }), noPrevious)).toBe(false);
  });

  it('تمارين التكرارات تُقارن بالتكرارات', () => {
    const previous = { estimated1rmKg: null, maxReps: 12, maxDurationSeconds: null };
    expect(isPersonalRecord('reps_only', set({ reps: 15 }), previous)).toBe(true);
    expect(isPersonalRecord('reps_only', set({ reps: 10 }), previous)).toBe(false);
  });

  it('تمارين المدة تُقارن بالثواني', () => {
    const previous = { estimated1rmKg: null, maxReps: null, maxDurationSeconds: 90 };
    expect(isPersonalRecord('duration', set({ duration_seconds: 120 }), previous)).toBe(true);
  });

  it('لا يدّعي رقمًا قياسيًا للمسافة+الزمن (مسافة أطول بوتيرة أبطأ ليست تحسّنًا)', () => {
    expect(isPersonalRecord('distance_duration', set({ distance_m: 5000, duration_seconds: 1800 }), noPrevious)).toBe(false);
  });
});

describe('fieldsForMetric', () => {
  it('يعرض الوزن والتكرارات لتمارين الأثقال فقط', () => {
    expect(fieldsForMetric('weight_reps')).toEqual({ weight: true, reps: true, duration: false, distance: false });
  });

  it('لا يعرض وزنًا لتمرين مدة مثل البلانك', () => {
    expect(fieldsForMetric('duration')).toEqual({ weight: false, reps: false, duration: true, distance: false });
  });

  it('يعرض المسافة والزمن للجري', () => {
    expect(fieldsForMetric('distance_duration').distance).toBe(true);
  });
});
