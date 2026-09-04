import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  ErrorState,
  InlineMessage,
  Screen,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  TextField,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { goalsRepository, type GoalTargets } from '@/src/data/repositories/goalsRepository';
import { useAuthStore } from '@/src/features/auth/store';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/** حقول الشاشة كنصوص — نحوّلها لأرقام عند الحفظ فقط، حتى لا يُمسح ما يكتبه المستخدم أثناء الكتابة. */
type GoalFields = {
  target_steps: string;
  target_sleep_hours: string;
  target_workouts_per_week: string;
  target_calories: string;
  target_protein_g: string;
  target_carbs_g: string;
  target_fat_g: string;
  target_weight_kg: string;
};

const EMPTY_FIELDS: GoalFields = {
  target_steps: '',
  target_sleep_hours: '',
  target_workouts_per_week: '',
  target_calories: '',
  target_protein_g: '',
  target_carbs_g: '',
  target_fat_g: '',
  target_weight_kg: '',
};

function parsePositive(raw: string): number | null {
  const value = Number(raw.replace(',', '.'));
  return raw.trim() && Number.isFinite(value) && value > 0 ? value : null;
}

export default function GoalsScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [fields, setFields] = useState<GoalFields>(EMPTY_FIELDS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const goals = await goalsRepository.getCurrent(userId);
      setFields({
        target_steps: String(goals.target_steps),
        target_sleep_hours: String(goals.target_sleep_hours),
        target_workouts_per_week: String(goals.target_workouts_per_week),
        target_calories: String(goals.target_calories),
        target_protein_g: String(goals.target_protein_g),
        target_carbs_g: String(goals.target_carbs_g),
        target_fat_g: String(goals.target_fat_g),
        target_weight_kg: goals.target_weight_kg === null ? '' : String(goals.target_weight_kg),
      });
      setHasLoaded(true);
    } catch (e) {
      setLoadError(getFriendlyErrorMessage(e, t('goals.loadError')));
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnceRef.current) return;
      hasLoadedOnceRef.current = true;
      void load();
    }, [load])
  );

  function setField(key: keyof GoalFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    if (saveError) setSaveError(null);
    if (savedAt) setSavedAt(null);
  }

  async function handleSave() {
    if (isSaving || !userId) return;

    const steps = parsePositive(fields.target_steps);
    const sleep = parsePositive(fields.target_sleep_hours);
    const workouts = parsePositive(fields.target_workouts_per_week);
    const calories = parsePositive(fields.target_calories);
    const protein = parsePositive(fields.target_protein_g);
    const carbs = parsePositive(fields.target_carbs_g);
    const fat = parsePositive(fields.target_fat_g);

    // الوزن المستهدف وحده اختياري — الفراغ فيه يعني "لا هدف"، لا خطأ.
    const weightRaw = fields.target_weight_kg.trim();
    const weight = weightRaw ? parsePositive(weightRaw) : null;

    if (!steps || !sleep || !workouts || !calories || !protein || !carbs || !fat || (weightRaw && !weight)) {
      setSaveError(t('goals.invalidValue'));
      return;
    }

    const targets: Partial<GoalTargets> = {
      target_steps: Math.round(steps),
      target_sleep_hours: sleep,
      target_workouts_per_week: Math.round(workouts),
      target_calories: Math.round(calories),
      target_protein_g: Math.round(protein),
      target_carbs_g: Math.round(carbs),
      target_fat_g: Math.round(fat),
      target_weight_kg: weight,
    };

    setSaveError(null);
    setIsSaving(true);
    try {
      await goalsRepository.updateTargets(userId, targets);
      setSavedAt(Date.now());
    } catch (e) {
      setSaveError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasLoaded && isLoading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Skeleton height={60} />
          <Skeleton height={180} />
          <Skeleton height={180} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState message={loadError} onRetry={load} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  const numberField = (key: keyof GoalFields, label: string, decimal = false) => (
    <View style={{ flex: 1 }}>
      <TextField
        label={label}
        value={fields[key]}
        onChangeText={(next) => setField(key, next)}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        editable={!isSaving}
      />
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={t('goals.title')} subtitle={t('goals.subtitle')} action="back" />

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title={t('goals.activitySection')} />
            <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
              {numberField('target_steps', t('goals.steps'))}
              {numberField('target_sleep_hours', t('goals.sleepHours'), true)}
            </View>
            {numberField('target_workouts_per_week', t('goals.workoutsPerWeek'))}
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title={t('goals.nutritionSection')} />
            {numberField('target_calories', t('goals.calories'))}
            <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
              {numberField('target_protein_g', t('goals.protein'))}
              {numberField('target_carbs_g', t('goals.carbs'))}
              {numberField('target_fat_g', t('goals.fat'))}
            </View>
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title={t('goals.bodySection')} />
            <TextField
              label={t('goals.targetWeight')}
              placeholder={t('goals.targetWeightOptional')}
              value={fields.target_weight_kg}
              onChangeText={(next) => setField('target_weight_kg', next)}
              keyboardType="decimal-pad"
              editable={!isSaving}
              returnKeyType="done"
            />
          </Card>

          {saveError ? <InlineMessage tone="danger" message={saveError} /> : null}
          {savedAt ? <InlineMessage tone="success" message={t('goals.saved')} /> : null}

          <Button label={t('common.save')} size="lg" loading={isSaving} onPress={handleSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
