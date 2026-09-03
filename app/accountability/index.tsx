import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AccountabilitySkeleton, Button, Card, Screen, Text, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { useTeamData } from '@/src/features/teams/useTeamData';
import { useAccountability } from '@/src/features/accountability/useAccountability';
import type { PingKind } from '@/src/data/repositories/accountabilityRepository';

const PING_KINDS: { kind: PingKind; labelKey: string }[] = [
  { kind: 'lets_go', labelKey: 'accountability.pingLetsGo' },
  { kind: 'almost_there', labelKey: 'accountability.pingAlmostThere' },
  { kind: 'well_done', labelKey: 'accountability.pingWellDone' },
  { kind: 'with_you', labelKey: 'accountability.pingWithYou' },
];

export default function AccountabilityScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: team, hasTeam } = useTeamData(userId);
  const {
    pair,
    pings,
    otherUserId,
    isIncomingRequest,
    isOutgoingRequest,
    isLoading,
    isActing,
    error,
    sendRequest,
    respond,
    endPair,
    sendPing,
    refetch,
  } = useAccountability(userId);

  function nameOf(id: string | null) {
    if (!id) return t('accountability.fallbackPartnerName');
    return team?.roster.find((m) => m.user_id === id)?.display_name ?? t('accountability.fallbackPartnerName');
  }

  if (isLoading && !pair) {
    return (
      <Screen>
        <AccountabilitySkeleton />
      </Screen>
    );
  }

  // خطأ في التحميل الأولي (وليس "لا يوجد رفيق بعد") — لا نعرض شاشة
  // الاختيار في هذه الحالة، لأنها قد توهم المستخدم بأن كل شيء طبيعي.
  if (error && !pair) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <Text variant="body" color="textSecondary">
          {error}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: spacing.md }}>
          <Text variant="displayMd">{t('accountability.title')}</Text>
          <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
            {t('accountability.intro')}
          </Text>
        </View>

        {!pair && (
          <Card variant="soft">
            {hasTeam && team && team.roster.length > 1 ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="captionStrong" color="textSecondary">
                  {t('accountability.pickFromTeam')}
                </Text>
                {team.roster
                  .filter((m) => m.user_id !== userId)
                  .map((member) => (
                    <View
                      key={member.user_id}
                      style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text variant="body">{member.display_name}</Text>
                      <Button
                        label={t('accountability.request')}
                        variant="secondary"
                        disabled={isActing}
                        onPress={() => sendRequest(member.user_id)}
                      />
                    </View>
                  ))}
              </View>
            ) : (
              <Text variant="body" color="textSecondary">
                {t('accountability.needTeammate')}
              </Text>
            )}
          </Card>
        )}

        {isOutgoingRequest && (
          <Card variant="soft">
            <Text variant="body">{t('accountability.waitingForResponse', { name: nameOf(otherUserId) })}</Text>
            <Button
              label={t('accountability.cancelRequest')}
              variant="ghost"
              disabled={isActing}
              style={{ marginTop: spacing.sm }}
              onPress={endPair}
            />
          </Card>
        )}

        {isIncomingRequest && (
          <Card variant="soft">
            <Text variant="bodyStrong">{t('accountability.incomingRequest', { name: nameOf(otherUserId) })}</Text>
            <View style={{ flexDirection: rowDirection, gap: spacing.sm, marginTop: spacing.sm }}>
              <Button label={t('accountability.accept')} disabled={isActing} onPress={() => respond(true)} style={{ flex: 1 }} />
              <Button
                label={t('accountability.reject')}
                variant="secondary"
                disabled={isActing}
                onPress={() => respond(false)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {pair?.status === 'active' && (
          <>
            <Card>
              <Text variant="overline" color="textSecondary">
                {t('accountability.yourPartner')}
              </Text>
              <Text variant="title" style={{ marginTop: spacing.xxs }}>
                {nameOf(otherUserId)}
              </Text>
              <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
                {PING_KINDS.map((option) => (
                  <Button
                    key={option.kind}
                    label={t(option.labelKey)}
                    variant="secondary"
                    disabled={isActing}
                    onPress={() => sendPing(option.kind)}
                  />
                ))}
              </View>
            </Card>

            <Card variant="soft">
              <Text variant="overline" color="textSecondary">
                {t('accountability.recentActivity')}
              </Text>
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                {pings.length === 0 ? (
                  <Text variant="body" color="textSecondary">
                    {t('accountability.noActivity')}
                  </Text>
                ) : (
                  pings.map((ping) => (
                    <Text key={ping.id} variant="body">
                      {ping.sender_id === userId ? t('common.you') : nameOf(ping.sender_id)}:{' '}
                      {t(PING_KINDS.find((o) => o.kind === ping.kind)?.labelKey ?? '')}
                    </Text>
                  ))
                )}
              </View>
            </Card>

            <Button label={t('accountability.endPartnership')} variant="ghost" disabled={isActing} onPress={endPair} />
          </>
        )}

        {error && pair ? (
          <Text variant="caption" color="danger" style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
