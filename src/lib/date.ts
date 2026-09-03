/** تنسيق تاريخ محلي YYYY-MM-DD لأعمدة `date` (بدون منطقة زمنية) في قاعدة البيانات. */
export function toDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** بداية اليوم المحلي كـ ISO — لتصفية السجلات ذات timestamptz (ماء/تمرين/نوم...). */
export function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * الحرف الأول لاسم اليوم من مصفوفة مترجَمة (راجع weekday.letters في
 * ملفات الترجمة) — بترتيب `Date.getDay()` (0 = الأحد). الدالة نفسها
 * لا تعرف لغة، فقط تفهرس المصفوفة التي يمررها المستدعي.
 */
export function weekdayLetter(dateKey: string, letters: readonly string[]): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return letters[date.getDay()];
}
