import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { useAuthStore } from '@/src/features/auth/store';
import { NumericLogForm } from '@/src/features/quick-add/NumericLogForm';

export default function LogSleepScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);

  return (
    <NumericLogForm
      titleKey="logSleep.title"
      emoji="💤"
      unitKey="logSleep.unit"
      placeholderKey="logSleep.placeholder"
      allowDecimal
      onSubmit={async (hours) => {
        if (!userId) throw new Error(t('common.notSignedIn'));
        await dailyLogsRepository.setSleepToday(userId, hours);
      }}
    />
  );
}
