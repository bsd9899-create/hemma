import { useTranslation } from 'react-i18next';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { useAuthStore } from '@/src/features/auth/store';
import { NumericLogForm } from '@/src/features/quick-add/NumericLogForm';

export default function LogWaterScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);

  return (
    <NumericLogForm
      titleKey="logWater.title"
      emoji="💧"
      unitKey="logWater.unit"
      placeholderKey="logWater.placeholder"
      presets={[250, 500, 750]}
      onSubmit={async (amountMl) => {
        if (!userId) throw new Error(t('common.notSignedIn'));
        await dailyLogsRepository.addWater(userId, amountMl);
      }}
    />
  );
}
