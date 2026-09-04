import { RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, ErrorState, ProgressSkeleton, Screen, Text, colors, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { useProgressData } from '@/src/features/progress/useProgressData';
import { WeeklyBarChart } from '@/src/features/progress/components/WeeklyBarChart';
import { formatNumber } from '@/src/lib/i18n/format';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { summary, isLoading, error, refetch } = useProgressData(userId);

  if (!summary && isLoading) {
    return (
      <Screen>
        <ProgressSkeleton />
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState message={error ?? t('progress.loadError')} onRetry={refetch} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  const hasAnyActivity =
    summary.workoutsThisWeek > 0 || summary.weightNowKg !== null || summary.history.some((h) => h.completion_percent > 0);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Text variant="displayMd" style={{ marginTop: spacing.md }}>
          {t('progress.title')}
        </Text>

        {!hasAnyActivity ? (
          <Card variant="soft">
            <Text variant="body" color="textSecondary">
              {t('progress.noActivity')}
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text variant="overline" color="textSecondary">
            {t('progress.last7Days')}
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <WeeklyBarChart history={summary.history} days={7} />
          </View>
        </Card>

        <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
          <Card variant="soft" style={{ flex: 1 }}>
            <Text variant="caption" color="textSecondary">
              {t('progress.currentWeight')}
            </Text>
            <Text variant="title" style={{ marginTop: spacing.xxs }}>
              {summary.weightNowKg !== null ? t('progress.weightUnit', { value: summary.weightNowKg }) : '—'}
            </Text>
            {summary.weightDeltaKg !== null ? (
              <Text
                variant="caption"
                color={summary.weightDeltaKg <= 0 ? 'success' : 'textSecondary'}
                style={{ marginTop: spacing.xxs }}
              >
                {t(summary.weightDeltaKg > 0 ? 'progress.weightDeltaPositive' : 'progress.weightDeltaNonPositive', {
                  value: summary.weightDeltaKg,
                })}
              </Text>
            ) : null}
          </Card>

          <Card variant="soft" style={{ flex: 1 }}>
            <Text variant="caption" color="textSecondary">
              {t('progress.averageSteps')}
            </Text>
            <Text variant="title" style={{ marginTop: spacing.xxs }}>
              {formatNumber(summary.averageSteps)}
            </Text>
            <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xxs }}>
              {t('progress.last7DaysShort')}
            </Text>
          </Card>
        </View>

        <Card variant="soft">
          <Text variant="caption" color="textSecondary">
            {t('progress.workoutsThisWeek')}
          </Text>
          <Text variant="title" style={{ marginTop: spacing.xxs }}>
            {summary.workoutsThisWeek}
          </Text>
        </Card>

        <Card>
          <Text variant="overline" color="textSecondary">
            {t('progress.weeklyReviewTitle')}
          </Text>
          <Text variant="displayLg" color="primary" style={{ marginTop: spacing.xxs }}>
            {t('progress.scoreOutOf10', { score: summary.weeklyReview.score })}
          </Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
            <Text variant="body">
              {t('progress.strongestPoint')}{' '}
              <Text variant="bodyStrong">{t(`weeklyMetrics.${summary.weeklyReview.strongestKey}`)}</Text>
            </Text>
            <Text variant="body">
              {t('progress.weakestPoint')} <Text variant="bodyStrong">{t(`weeklyMetrics.${summary.weeklyReview.weakestKey}`)}</Text>
            </Text>
          </View>
          <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.sm }}>
            {t('progress.focusNextWeek', { label: t(`weeklyMetrics.${summary.weeklyReview.focusNextWeekKey}`) })}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
