import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
  TeamsSkeleton,
  colors,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { useTeamData } from '@/src/features/teams/useTeamData';

export default function TeamsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data, hasTeam, isLoading, error, refetch } = useTeamData(userId);

  if (hasTeam === null && isLoading) {
    return (
      <Screen>
        <TeamsSkeleton />
      </Screen>
    );
  }

  if (hasTeam === false) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.sm }}>
          <EmptyState
            emoji="👥"
            title={t('teams.title')}
            description={t('teams.intro')}
            actionLabel={t('teams.createTeam')}
            onAction={() => router.push('/teams/create')}
          />
          <Button
            label={t('teams.joinWithCode')}
            variant="ghost"
            onPress={() => router.push('/teams/join')}
          />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState message={error ?? t('teams.loadError')} onRetry={refetch} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={{ marginTop: spacing.md }}>
          <Text variant="displayMd">{data.team.name}</Text>
          <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xxs }}>
            {t('teams.inviteCode', { code: data.team.invite_code })}
          </Text>
        </View>

        <Card variant="soft">
          <SectionHeader title={t('teams.pulseToday')} />
          <Text variant="displayLg" color="primary" style={{ marginTop: spacing.xxs }}>
            {data.pulsePercent ?? 0}%
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <ProgressBar progress={(data.pulsePercent ?? 0) / 100} />
          </View>
        </Card>

        <Card>
          <Text variant="overline" color="textSecondary">
            {t('teams.leaderboard')}
          </Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {data.leaderboard.map((row, index) => (
              <View
                key={row.user_id}
                style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm }}>
                  <Text variant="bodyStrong" color={index === 0 ? 'accent' : 'textSecondary'}>
                    {index === 0 ? '🥇' : `#${index + 1}`}
                  </Text>
                  <Text variant="body">
                    {row.display_name}
                    {row.user_id === userId ? t('teams.youSuffix') : ''}
                  </Text>
                </View>
                <Text variant="bodyStrong" color={index === 0 ? 'accent' : 'textPrimary'}>
                  {row.total_points}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="soft">
          <Text variant="overline" color="textSecondary">
            {t('teams.members', { count: data.roster.length })}
          </Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {data.roster.map((member) => (
              <Text key={member.user_id} variant="body">
                {member.display_name} {member.role === 'owner' ? '👑' : ''}
              </Text>
            ))}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="overline" color="textSecondary">
              {t('teams.challenges')}
            </Text>
            <Button
              label={t('teams.newChallenge')}
              variant="ghost"
              onPress={() => router.push({ pathname: '/teams/new-challenge', params: { teamId: data.team.id } })}
            />
          </View>

          {data.challenges.length === 0 ? (
            <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
              {t('teams.noChallenges')}
            </Text>
          ) : (
            <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
              {data.challenges.map((challenge) => (
                <View key={challenge.id}>
                  <Text variant="bodyStrong">{challenge.title}</Text>
                  <Text variant="caption" color="textSecondary">
                    {t('teams.dateRange', { start: challenge.start_date, end: challenge.end_date })}
                  </Text>
                  <View style={{ marginTop: spacing.xs }}>
                    <ProgressBar progress={challenge.myProgressPercent / 100} />
                  </View>
                  <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xxs }}>
                    {t('teams.myCommitment', { percent: challenge.myProgressPercent })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
