import { buildTrialTimeline } from '../trialTimeline';

const TODAY = new Date('2026-09-06T10:00:00Z');

describe('buildTrialTimeline', () => {
  it('يبني ثلاث محطات لتجربة ٣ أيام: اليوم، تذكير، بدء الخصم', () => {
    const stages = buildTrialTimeline(3, TODAY);
    expect(stages).toHaveLength(3);
    expect(stages[0].isCharge).toBe(false);
    expect(stages[2].isCharge).toBe(true);
  });

  it('يضع التذكير قبل الخصم بيوم لا في يومه', () => {
    const [, reminder, charge] = buildTrialTimeline(3, TODAY);
    expect(charge.date.getTime() - reminder.date.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('يحسب تاريخ الخصم من طول التجربة الفعلي', () => {
    expect(buildTrialTimeline(3, TODAY)[2].date.toISOString().slice(0, 10)).toBe('2026-09-09');
    expect(buildTrialTimeline(7, TODAY)[2].date.toISOString().slice(0, 10)).toBe('2026-09-13');
  });

  it('يُسقط محطة التذكير في تجربة يوم واحد بدل عرض تذكير في الماضي', () => {
    const stages = buildTrialTimeline(1, TODAY);
    expect(stages).toHaveLength(2);
    expect(stages[1].isCharge).toBe(true);
  });

  it('لا يعدّل التاريخ الممرَّر إليه', () => {
    const before = TODAY.getTime();
    buildTrialTimeline(3, TODAY);
    expect(TODAY.getTime()).toBe(before);
  });
});
