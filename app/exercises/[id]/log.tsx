import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Appear,
  Badge,
  Button,
  Card,
  InlineMessage,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  TextField,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import {
  exerciseRepository,
  type Exercise,
  type NewSet,
  type PersonalRecord,
  type WorkoutSet,
} from '@/src/data/repositories/exerciseRepository';
import { fieldsForMetric, isPersonalRecord } from '@/src/domain/workoutSets';
import { formatNumber } from '@/src/lib/i18n/format';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/** صف واحد في نموذج التسجيل — نصوص لا أرقام، لأن الحقل نصّي حتى الحفظ. */
type DraftSet = {
  weight: string;
  reps: string;
  duration: string;
  distance: string;
  isWarmup: boolean;
};

const EMPTY_SET: DraftSet = { weight: '', reps: '', duration: '', distance: '', isWarmup: false };

function parseOptional(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function LogSetsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const isArabic = i18n.language !== 'en';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [record, setRecord] = useState<PersonalRecord | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSet[]>([]);
  const [sets, setSets] = useState<DraftSet[]>([{ ...EMPTY_SET }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const found = await exerciseRepository.getById(id);
      setExercise(found);
      if (found && userId) {
        const [pr, last] = await Promise.all([
          exerciseRepository.getPersonalRecord(userId, found.id),
          exerciseRepository.getLastSession(userId, found.id),
        ]);
        setRecord(pr);
        setLastSession(last);
      }
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('exercises.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [id, userId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (isLoading || !exercise) {
    return (
      <Screen>
        <ScreenHeader title="" action="close" />
        <View style={{ gap: spacing.md }}>
          <Skeleton height={80} />
          <Skeleton height={120} />
        </View>
      </Screen>
    );
  }

  const fields = fieldsForMetric(exercise.metric);
  const name = isArabic ? exercise.name_ar : exercise.name_en;

  function updateSet(index: number, patch: Partial<DraftSet>) {
    setSets((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    if (error) setError(null);
  }

  function addSet() {
    // المجموعة الجديدة ترث قيم السابقة: في التدريب الحقيقي تتكرّر نفس
    // الأوزان، وإعادة كتابتها في كل صف عمل يدوي بلا سبب.
    setSets((current) => {
      const previous = current[current.length - 1];
      return [...current, { ...previous, isWarmup: false }];
    });
  }

  function removeSet(index: number) {
    setSets((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function handleSave() {
    if (isSaving || !userId || !exercise) return;

    const payload: NewSet[] = [];
    let setNumber = 0;
    for (const draft of sets) {
      const weight = parseOptional(draft.weight);
      const reps = parseOptional(draft.reps);
      const duration = parseOptional(draft.duration);
      const distance = parseOptional(draft.distance);

      // صف فارغ تمامًا يُتجاهل بدل رفض الحفظ كله — المستخدم قد يضيف
      // صفًا ثم يقرر ألا يملأه.
      const hasAnything = weight !== null || reps !== null || duration !== null || distance !== null;
      if (!hasAnything) continue;

      if (fields.reps && reps === null) {
        setError(t('exercises.repsRequired'));
        return;
      }
      if (fields.duration && duration === null) {
        setError(t('exercises.durationRequired'));
        return;
      }

      setNumber += 1;
      payload.push({
        exerciseId: exercise.id,
        setNumber,
        weightKg: fields.weight ? weight : null,
        reps: fields.reps ? reps : null,
        durationSeconds: fields.duration ? duration : null,
        distanceM: fields.distance ? distance : null,
        isWarmup: draft.isWarmup,
      });
    }

    if (payload.length === 0) {
      setError(t('exercises.nothingToSave'));
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await exerciseRepository.logSets(userId, null, payload);
      if (router.canDismiss()) router.dismissAll();
      else router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSaving(false);
    }
  }

  const previousBest = {
    estimated1rmKg: record?.estimated_1rm_kg ?? null,
    maxReps: record?.max_reps ?? null,
    maxDurationSeconds: record?.max_duration_seconds ?? null,
  };

  return (
    <Screen>
      <ScreenHeader title={name} action="close" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <Appear style={{ flex: 1 }}>
        <ScrollView
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* آخر أداء أعلى الشاشة: القرار الأول للمستخدم هو "ماذا رفعت
                آخر مرة؟"، وإخفاؤه يجعله يخمّن أو يخرج من الشاشة. */}
            {lastSession.length > 0 ? (
              <Card variant="soft" style={{ gap: spacing.xxs }}>
                <Text variant="captionStrong">{t('exercises.lastSession')}</Text>
                <Text variant="caption" color="textSecondary">
                  {lastSession
                    .filter((s) => !s.is_warmup)
                    .map((s) =>
                      s.weight_kg !== null && s.reps !== null
                        ? `${formatNumber(s.weight_kg)}×${formatNumber(s.reps)}`
                        : s.reps !== null
                          ? formatNumber(s.reps)
                          : formatNumber(s.duration_seconds)
                    )
                    .join(' · ')}
                </Text>
              </Card>
            ) : null}

            {sets.map((draft, index) => {
              const weight = parseOptional(draft.weight);
              const reps = parseOptional(draft.reps);
              const duration = parseOptional(draft.duration);
              const wouldBeRecord = isPersonalRecord(
                exercise.metric,
                {
                  weight_kg: weight,
                  reps,
                  duration_seconds: duration,
                  distance_m: parseOptional(draft.distance),
                  is_warmup: draft.isWarmup,
                },
                previousBest
              );

              return (
                <Card key={index} style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="captionStrong">
                      {draft.isWarmup
                        ? t('exercises.warmupSet', { number: formatNumber(index + 1) })
                        : t('exercises.setNumber', { number: formatNumber(index + 1) })}
                    </Text>
                    <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm }}>
                      {/* تأكيد فوري أن هذه المجموعة رقم قياسي — أقوى دافع
                          في التطبيق كله، ويضيع إن ظهر بعد الحفظ فقط. */}
                      {wouldBeRecord ? <Badge label={t('exercises.newRecord')} tone="accent" /> : null}
                      {sets.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('exercises.removeSet')}
                          hitSlop={10}
                          onPress={() => removeSet(index)}
                        >
                          <Text variant="bodyStrong" color="danger">
                            ✕
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
                    {fields.weight ? (
                      <View style={{ flex: 1 }}>
                        <TextField
                          label={t('exercises.weight')}
                          value={draft.weight}
                          onChangeText={(v) => updateSet(index, { weight: v })}
                          keyboardType="decimal-pad"
                          placeholder="0"
                        />
                      </View>
                    ) : null}
                    {fields.reps ? (
                      <View style={{ flex: 1 }}>
                        <TextField
                          label={t('exercises.reps')}
                          value={draft.reps}
                          onChangeText={(v) => updateSet(index, { reps: v })}
                          keyboardType="number-pad"
                          placeholder="0"
                        />
                      </View>
                    ) : null}
                    {fields.duration ? (
                      <View style={{ flex: 1 }}>
                        <TextField
                          label={t('exercises.durationSeconds')}
                          value={draft.duration}
                          onChangeText={(v) => updateSet(index, { duration: v })}
                          keyboardType="number-pad"
                          placeholder="0"
                        />
                      </View>
                    ) : null}
                    {fields.distance ? (
                      <View style={{ flex: 1 }}>
                        <TextField
                          label={t('exercises.distanceMeters')}
                          value={draft.distance}
                          onChangeText={(v) => updateSet(index, { distance: v })}
                          keyboardType="decimal-pad"
                          placeholder="0"
                        />
                      </View>
                    ) : null}
                  </View>

                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: draft.isWarmup }}
                    accessibilityLabel={t('exercises.warmup')}
                    hitSlop={8}
                    onPress={() => updateSet(index, { isWarmup: !draft.isWarmup })}
                  >
                    <Text variant="caption" color={draft.isWarmup ? 'primary' : 'textSecondary'}>
                      {draft.isWarmup ? '☑' : '☐'} {t('exercises.warmup')}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}

            <Button label={t('exercises.addSet')} variant="secondary" onPress={addSet} />

            {error ? <InlineMessage tone="danger" message={error} /> : null}

            <Button label={t('common.save')} size="lg" loading={isSaving} onPress={handleSave} />
          </ScrollView>
      </Appear>
      </KeyboardAvoidingView>
    </Screen>
  );
}
