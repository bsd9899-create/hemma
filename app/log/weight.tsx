import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { useAuthStore } from '@/src/features/auth/store';
import { NumericLogForm } from '@/src/features/quick-add/NumericLogForm';

export default function LogWeightScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);

  return (
    <NumericLogForm
      titleKey="logWeight.title"
      emoji="⚖️"
      unitKey="logWeight.unit"
      placeholderKey="logWeight.placeholder"
      allowDecimal
      onSubmit={async (weightKg) => {
        if (!userId) throw new Error(t('common.notSignedIn'));
        await dailyLogsRepository.addWeight(userId, weightKg);
      }}
    />
  );
}
