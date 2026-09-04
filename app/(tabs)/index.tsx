import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  ErrorState,
  ProgressRing,
  Screen,
  SectionHeader,
  Text,
  TodaySkeleton,
  Wordmark,
  colors,
  palette,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { useTodayData } from '@/src/features/today/useTodayData';
import { getNextTask } from '@/src/features/today/nextTask';
import { MetricTile } from '@/src/features/today/components/MetricTile';
import { useTeamData } from '@/src/features/teams/useTeamData';
import { getTimeGreeting } from '@/src/lib/greeting';
import { formatNumber } from '@/src/lib/i18n/format';

export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const displayName = useProfileStore((s) => s.profile?.display_name);
  const { summary, isLoading, error, refetch } = useTodayData(userId);
  const { data: team, hasTeam } = useTeamData(userId);
  if (!summary && isLoading) {
    return (
      <Screen edges={['top']}>
        <TodaySkeleton />
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen edges={['top']} style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState message={error ?? t('today.loadError')} onRetry={refetch} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  const nextTask = getNextTask(summary);

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View
          style={{
            flexDirection: rowDirection,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.md,
            gap: spacing.md,
          }}
        >
          <Text variant="displayMd" style={{ flex: 1 }}>
            {getTimeGreeting(t)} {displayName ?? ''} 👋
          </Text>
          <Wordmark size="sm" />
        </View>

        {/* البطاقة الرئيسية — قرار اليوم وإنجاز اليوم معًا، تجيب فورًا على
            "كيف وضعي؟" بدون تفريق بصري بين رقمين مرتبطين بنفس الفكرة. */}
        <Card variant={summary.recoveryMode ? 'soft' : 'surface'}>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="overline" color="textSecondary">
                {summary.recoveryMode ? t('today.recoveryMode') : t('today.decisionOfDay')}
              </Text>
              <Text variant="title">{t(summary.decisionTextKey)}</Text>
            </View>
            <ProgressRing
              progress={summary.completionPercent / 100}
              size={92}
              strokeWidth={9}
              fillColor={summary.completionPercent >= 90 ? palette.gold500 : colors.primary}
            >
              <Text variant="title" color={summary.completionPercent >= 90 ? 'accent' : 'primary'}>
                {summary.completionPercent}%
              </Text>
            </ProgressRing>
          </View>
        </Card>

        <View style={{ marginTop: spacing.xs }}>
          <SectionHeader title={t('today.sectionTitle')} />
        </View>

        {/* صف واحد متوازن من ثلاثة مؤشرات — بعد خروج الماء بقيت بطاقة
            يتيمة في صف ثانٍ، وكانت السعرات (أهم رقم في التغذية) غائبة
            عن الشاشة الرئيسية تمامًا. */}
        <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
          <MetricTile
            emoji="🏋️"
            label={t('today.workout')}
            valueText={t('today.workoutValue', { minutes: summary.workoutMinutes })}
            progress={summary.workoutMinutes / 30}
            href="/log/workout"
          />
          <MetricTile
            emoji="🍽️"
            label={t('today.calories')}
            valueText={t('today.caloriesValue', {
              value: formatNumber(summary.calories),
              target: formatNumber(summary.caloriesTarget),
            })}
            progress={summary.caloriesTarget > 0 ? summary.calories / summary.caloriesTarget : 0}
            href="/(tabs)/nutrition"
          />
          <MetricTile
            emoji="👟"
            label={t('today.steps')}
            valueText={t('today.stepsValue', {
              steps: formatNumber(summary.steps),
              target: formatNumber(summary.stepsTarget),
            })}
            progress={summary.steps / summary.stepsTarget}
            href="/log/steps"
          />
        </View>

        <Card>
          <SectionHeader title={t('today.nextTaskTitle')} />
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
            <Text variant="displayMd">{nextTask.emoji}</Text>
            <View>
              <Text variant="bodyStrong">{t(nextTask.titleKey)}</Text>
              <Text variant="caption" color="textSecondary">
                {t(nextTask.subtitleKey, nextTask.subtitleParams)}
              </Text>
            </View>
          </View>
          {nextTask.ctaLabelKey && nextTask.ctaHref ? (
            <Button
              label={t(nextTask.ctaLabelKey)}
              style={{ marginTop: spacing.md }}
              onPress={() => router.push(nextTask.ctaHref!)}
            />
          ) : null}
        </Card>

        <Card variant="soft">
          <SectionHeader title={t('today.teamSectionTitle')} />
          {hasTeam && team ? (
            <>
              <Text variant="bodyStrong" style={{ marginTop: spacing.xs }}>
                {t('today.teamPulse', { percent: team.pulsePercent ?? 0 })}
              </Text>
              {team.myRank ? (
                <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xxs }}>
                  {t('today.myRank', { rank: team.myRank })}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
                {t('today.noTeamText')}
              </Text>
              <Button
                label={t('today.goToTeams')}
                variant="secondary"
                style={{ marginTop: spacing.sm }}
                onPress={() => router.push('/teams')}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
