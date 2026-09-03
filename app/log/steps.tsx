import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { useAuthStore } from '@/src/features/auth/store';
import { NumericLogForm } from '@/src/features/quick-add/NumericLogForm';

export default function LogStepsScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);

  return (
    <NumericLogForm
      titleKey="logSteps.title"
      emoji="👟"
      unitKey="logSteps.unit"
      placeholderKey="logSteps.placeholder"
      onSubmit={async (steps) => {
        if (!userId) throw new Error(t('common.notSignedIn'));
        await dailyLogsRepository.setStepsToday(userId, Math.round(steps));
      }}
    />
  );
}
