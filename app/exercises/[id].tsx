import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  InlineMessage,
  Screen,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  Text,
  colors,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import {
  exerciseRepository,
  type Exercise,
  type PersonalRecord,
  type WorkoutSet,
} from '@/src/data/repositories/exerciseRepository';
import { muscleLabelKey } from '@/src/features/exercises/labels';
import { totalVolumeKg, workingSetCount } from '@/src/domain/workoutSets';
import { formatNumber } from '@/src/lib/i18n/format';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function ExerciseDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const isArabic = i18n.language !== 'en';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [record, setRecord] = useState<PersonalRecord | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
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

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title="" action="back" />
        <View style={{ gap: spacing.md }}>
          <Skeleton height={90} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </View>
      </Screen>
    );
  }

  if (error || !exercise) {
    return (
      <Screen>
        <ScreenHeader title={t('exercises.title')} action="back" />
        <ErrorState
          message={error ?? t('exercises.notFound')}
          retryLabel={t('common.retry')}
          onRetry={() => void load()}
        />
      </Screen>
    );
  }

  const name = isArabic ? exercise.name_ar : exercise.name_en;
  const instructions = isArabic ? exercise.instructions_ar : exercise.instructions_en;
  const lastVolume = totalVolumeKg(lastSession);

  return (
    <Screen>
      <ScreenHeader title={name} action="back" />
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // الأرقام القياسية وآخر أداء يتغيّران بعد تسجيل مجموعات من
          // شاشة أخرى — بلا سحب للتحديث يبقى الرقم قديمًا بلا سبب ظاهر.
          <RefreshControl refreshing={isLoading} onRefresh={() => void load()} tintColor={colors.primary} />
        }
      >
        {/* العضلات المستهدفة */}
        <Card style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textSecondary">
            {t('exercises.targetMuscles')}
          </Text>
          <View style={{ flexDirection: rowDirection, gap: spacing.xs, flexWrap: 'wrap' }}>
            <Badge label={t(muscleLabelKey(exercise.primary_muscle))} tone="accent" />
            {exercise.secondary_muscles.map((m) => (
              <Badge key={m} label={t(muscleLabelKey(m))} tone="neutral" />
            ))}
          </View>
          <View style={{ flexDirection: rowDirection, gap: spacing.xs, flexWrap: 'wrap' }}>
            <Badge label={t(`exercises.equipment.${exercise.equipment}`)} tone="neutral" />
          </View>
        </Card>

        {/* الوسائط: تُعرض فقط بترخيص معروف. لا وسيط خير من وسيط
            لا نملك حقوقه — راجع docs/EXERCISE_MEDIA.md. */}
        {exercise.media_url && exercise.media_license ? null : (
          <Card variant="soft">
            <Text variant="caption" color="textSecondary">
              {t('exercises.noMediaYet')}
            </Text>
          </Card>
        )}

        {/* الأرقام القياسية */}
        <SectionHeader title={t('exercises.records')} />
        <Card style={{ gap: spacing.sm }}>
          {record === null || record.total_sets === 0 ? (
            <Text variant="caption" color="textSecondary">
              {t('exercises.noRecordsYet')}
            </Text>
          ) : (
            <>
              {record.max_weight_kg !== null ? (
                <RecordRow label={t('exercises.maxWeight')} value={`${formatNumber(record.max_weight_kg)} ${t('common.kg')}`} />
              ) : null}
              {record.max_reps !== null ? (
                <RecordRow label={t('exercises.maxReps')} value={formatNumber(record.max_reps)} />
              ) : null}
              {record.max_duration_seconds !== null ? (
                <RecordRow
                  label={t('exercises.maxDuration')}
                  value={t('exercises.seconds', { value: formatNumber(record.max_duration_seconds) })}
                />
              ) : null}
              {record.estimated_1rm_kg !== null ? (
                <>
                  <RecordRow
                    label={t('exercises.estimated1rm')}
                    value={`${formatNumber(record.estimated_1rm_kg)} ${t('common.kg')}`}
                  />
                  {/* تقدير لا قياس — قولها بدل تركها تُقرأ كرقم مؤكد. */}
                  <Text variant="caption" color="textSecondary">
                    {t('exercises.estimated1rmNote')}
                  </Text>
                </>
              ) : null}
              <RecordRow label={t('exercises.totalSets')} value={formatNumber(record.total_sets)} />
            </>
          )}
        </Card>

        {/* آخر أداء — أهم رقم قبل التسجيل */}
        <SectionHeader title={t('exercises.lastSession')} />
        <Card style={{ gap: spacing.sm }}>
          {lastSession.length === 0 ? (
            <Text variant="caption" color="textSecondary">
              {t('exercises.noHistoryYet')}
            </Text>
          ) : (
            <>
              {lastSession.map((s) => (
                <View
                  key={s.id}
                  style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text variant="caption" color="textSecondary">
                    {s.is_warmup
                      ? t('exercises.warmupSet', { number: s.set_number })
                      : t('exercises.setNumber', { number: s.set_number })}
                  </Text>
                  <Text variant="bodyStrong">{describeSet(s, t)}</Text>
                </View>
              ))}
              {lastVolume > 0 ? (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm }}>
                  <RecordRow
                    label={t('exercises.volume')}
                    value={`${formatNumber(Math.round(lastVolume))} ${t('common.kg')}`}
                  />
                  <Text variant="caption" color="textSecondary">
                    {t('exercises.volumeNote', { sets: workingSetCount(lastSession) })}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </Card>

        {/* طريقة الأداء */}
        {instructions.length > 0 ? (
          <>
            <SectionHeader title={t('exercises.howTo')} />
            <Card style={{ gap: spacing.sm }}>
              {instructions.map((step, i) => (
                <View key={step} style={{ flexDirection: rowDirection, gap: spacing.sm }}>
                  <Text variant="bodyStrong" color="primary">
                    {formatNumber(i + 1)}
                  </Text>
                  <Text variant="body" style={{ flex: 1 }}>
                    {step}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {isArabic && exercise.cues_ar.length > 0 ? (
          <Card variant="soft" style={{ gap: spacing.xs }}>
            <Text variant="captionStrong">{t('exercises.cues')}</Text>
            {exercise.cues_ar.map((cue) => (
              <Text key={cue} variant="caption" color="textSecondary">
                • {cue}
              </Text>
            ))}
          </Card>
        ) : null}

        <InlineMessage tone="info" message={t('exercises.safetyNote')} />

        <Button
          label={t('exercises.logSets')}
          size="lg"
          onPress={() => router.push(`/exercises/${exercise.id}/log`)}
        />
      </ScrollView>
    </Screen>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

/** وصف مجموعة واحدة بما يناسب مقياسها فقط — لا "0 كجم" لتمرين بلانك. */
function describeSet(s: WorkoutSet, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (s.weight_kg !== null && s.reps !== null) {
    return `${formatNumber(s.weight_kg)} ${t('common.kg')} × ${formatNumber(s.reps)}`;
  }
  if (s.reps !== null) return t('exercises.repsValue', { value: formatNumber(s.reps) });
  if (s.duration_seconds !== null) return t('exercises.seconds', { value: formatNumber(s.duration_seconds) });
  if (s.distance_m !== null) return `${formatNumber(s.distance_m)} ${t('common.meters')}`;
  return '—';
}
