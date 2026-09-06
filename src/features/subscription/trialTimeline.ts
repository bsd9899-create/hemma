/**
 * الخط الزمني للتجربة المجانية: ماذا يحدث اليوم، ومتى التذكير، ومتى
 * يبدأ الخصم — بتاريخ صريح لا "بعد ٣ أيام".
 *
 * السبب ليس تجميليًا: أكثر ما يقلق المستخدم في التجربة المجانية هو
 * "متى بالضبط سيُخصم مني؟". الإجابة الغامضة تجعله يلغي احتياطًا، أو
 * يشعر أنه خُدع لاحقًا. عرض التاريخ الفعلي يزيل السؤال، وهو أيضًا ما
 * تشترطه قواعد المتجر للإفصاح عن الاشتراك المتجدد.
 *
 * دالة صافية بلا i18n ولا تنسيق — الواجهة تتولّى العرض بلغة المستخدم.
 */

export type TrialStage = {
  titleKey: string;
  bodyKey: string;
  date: Date;
  /** المحطة الأخيرة (بدء الخصم) — تُعرض بتمييز مختلف. */
  isCharge: boolean;
};

/** التذكير قبل انتهاء التجربة بيوم واحد على الأقل. */
const REMINDER_DAYS_BEFORE_END = 1;

function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * يبني محطات التجربة من طولها الفعلي كما أعلنه المتجر.
 *
 * تجربة قصيرة جدًا (يوم واحد) لا تتسع لتذكير قبلها بيوم، فنُسقط محطة
 * التذكير بدل عرض تذكير في الماضي.
 */
export function buildTrialTimeline(trialDays: number, today: Date = new Date()): TrialStage[] {
  const stages: TrialStage[] = [
    {
      titleKey: 'paywall.timeline.todayTitle',
      bodyKey: 'paywall.timeline.todayBody',
      date: today,
      isCharge: false,
    },
  ];

  const reminderOffset = trialDays - REMINDER_DAYS_BEFORE_END;
  if (reminderOffset >= 1) {
    stages.push({
      titleKey: 'paywall.timeline.reminderTitle',
      bodyKey: 'paywall.timeline.reminderBody',
      date: addDays(today, reminderOffset),
      isCharge: false,
    });
  }

  stages.push({
    titleKey: 'paywall.timeline.chargeTitle',
    bodyKey: 'paywall.timeline.chargeBody',
    date: addDays(today, trialDays),
    isCharge: true,
  });

  return stages;
}
