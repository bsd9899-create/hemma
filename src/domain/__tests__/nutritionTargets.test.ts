import {
  ACTIVITY_FACTORS,
  ageFromBirthDate,
  calculateBMR,
  calculateTDEE,
  calculateTargets,
  type BodyProfile,
} from '../nutritionTargets';

/** ذكر ٣٠ سنة، ١٨٠ سم، ٨٠ كجم — مرجع ثابت لكل الاختبارات. */
const baseProfile: BodyProfile = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  goalType: 'general_health',
};

describe('calculateBMR — Mifflin-St Jeor', () => {
  it('يطابق القيمة المنشورة للمعادلة عند الذكور', () => {
    // 10(80) + 6.25(180) − 5(30) + 5 = 800 + 1125 − 150 + 5 = 1780
    expect(calculateBMR(baseProfile)).toBe(1780);
  });

  it('يطابق القيمة المنشورة للمعادلة عند الإناث', () => {
    // نفس المدخلات − 161 بدل + 5 = 1614
    expect(calculateBMR({ ...baseProfile, sex: 'female' })).toBe(1614);
  });

  it('ينقص مع تقدّم العمر بمقدار 5 kcal لكل سنة', () => {
    const young = calculateBMR({ ...baseProfile, ageYears: 30 });
    const older = calculateBMR({ ...baseProfile, ageYears: 40 });
    expect(young - older).toBe(50);
  });
});

describe('calculateTDEE', () => {
  it('يضرب الأيض في معامل النشاط', () => {
    expect(calculateTDEE(1780, 'moderate')).toBeCloseTo(1780 * ACTIVITY_FACTORS.moderate, 5);
  });

  it('يرتفع كلما ارتفع مستوى النشاط', () => {
    const levels = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
    const values = levels.map((l) => calculateTDEE(1780, l));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe('calculateTargets — تعديل الهدف', () => {
  it('يطرح عجز 500 kcal لفقد الوزن', () => {
    const maintain = calculateTargets(baseProfile);
    const losing = calculateTargets({ ...baseProfile, goalType: 'lose_weight' });
    expect(maintain.calories - losing.calories).toBe(500);
  });

  it('يضيف فائضًا معتدلًا لبناء العضل', () => {
    const maintain = calculateTargets(baseProfile);
    const gaining = calculateTargets({ ...baseProfile, goalType: 'gain_muscle' });
    expect(gaining.calories - maintain.calories).toBe(350);
  });

  it('يحافظ على الوزن في هدفَي النشاط والصحة العامة', () => {
    const activity = calculateTargets({ ...baseProfile, goalType: 'increase_activity' });
    const health = calculateTargets({ ...baseProfile, goalType: 'general_health' });
    expect(activity.calories).toBe(health.calories);
    expect(health.calories).toBe(health.tdee);
  });
});

describe('calculateTargets — حد الأمان السفلي', () => {
  it('لا ينزل بالسعرات تحت الحد الآمن مهما كان العجز', () => {
    // شخص صغير جدًا وخامل: العجز الكامل ينزل تحت الحد
    const tiny = calculateTargets({
      sex: 'female',
      ageYears: 60,
      heightCm: 150,
      weightKg: 45,
      activityLevel: 'sedentary',
      goalType: 'lose_weight',
    });
    expect(tiny.calories).toBeGreaterThanOrEqual(1200);
    expect(tiny.deficitLimitedBySafetyFloor).toBe(true);
  });

  it('لا يرفع العلم عندما لا يصطدم العجز بالحد', () => {
    expect(calculateTargets({ ...baseProfile, goalType: 'lose_weight' }).deficitLimitedBySafetyFloor).toBe(false);
  });
});

describe('calculateTargets — الماكروز', () => {
  it('يربط البروتين بوزن الجسم لا بنسبة من الطاقة', () => {
    // فقد وزن = 1.8 جم/كجم × 80 = 144
    expect(calculateTargets({ ...baseProfile, goalType: 'lose_weight' }).proteinG).toBe(144);
    // صحة عامة = 1.2 جم/كجم × 80 = 96
    expect(calculateTargets(baseProfile).proteinG).toBe(96);
  });

  it('يبقي البروتين ثابتًا عند تغيّر السعرات وحدها', () => {
    const sedentary = calculateTargets({ ...baseProfile, activityLevel: 'sedentary' });
    const veryActive = calculateTargets({ ...baseProfile, activityLevel: 'very_active' });
    expect(sedentary.proteinG).toBe(veryActive.proteinG);
    expect(veryActive.calories).toBeGreaterThan(sedentary.calories);
  });

  it('يضع الدهون عند ~27% من الطاقة (داخل نطاق AMDR 20–35%)', () => {
    const t = calculateTargets(baseProfile);
    const fatEnergyShare = (t.fatG * 9) / t.calories;
    expect(fatEnergyShare).toBeGreaterThanOrEqual(0.2);
    expect(fatEnergyShare).toBeLessThanOrEqual(0.35);
  });

  it('يحترم الحد الأدنى للكارب (130 جم — RDA)', () => {
    const t = calculateTargets({
      sex: 'female',
      ageYears: 55,
      heightCm: 155,
      weightKg: 90,
      activityLevel: 'sedentary',
      goalType: 'lose_weight',
    });
    expect(t.carbsG).toBeGreaterThanOrEqual(130);
  });

  it('مجموع طاقة الماكروز قريب من هدف السعرات', () => {
    const t = calculateTargets(baseProfile);
    const fromMacros = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    // تسامح 3% يستوعب التقريب لأقرب جرام في كل ماكرو
    expect(Math.abs(fromMacros - t.calories) / t.calories).toBeLessThan(0.03);
  });
});

describe('ageFromBirthDate', () => {
  it('يحسب السنوات الكاملة', () => {
    expect(ageFromBirthDate('1996-01-15', new Date('2026-06-01'))).toBe(30);
  });

  it('لا يعدّ سنة لم تكتمل بعد', () => {
    expect(ageFromBirthDate('1996-12-15', new Date('2026-06-01'))).toBe(29);
  });

  it('يعيد null لتاريخ غير صالح', () => {
    expect(ageFromBirthDate('ليس تاريخًا')).toBeNull();
  });
});
