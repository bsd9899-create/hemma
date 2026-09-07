import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Appear,
  Card,
  ErrorState,
  Screen,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  Text,
  colors,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { adminRepository, type AdminOverview } from '@/src/data/repositories/adminRepository';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { formatNumber, formatShortDate } from '@/src/lib/i18n/format';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/**
 * لوحة الإدارة — أرقام مجمّعة عن صحة المنتج، لا عن صحة أي شخص.
 *
 * ⚠️ إخفاء هذه الشاشة عن غير الأدمن **ليس** هو الحماية. الحماية أن
 * كل view تقرأها تفرض `where public.is_admin()` داخل قاعدة البيانات،
 * فمن يصل إلى هذا المسار بلا صلاحية يرى شاشة فارغة لا بيانات مسرَّبة.
 * راجع supabase/migrations/20260906000002_admin_role.sql.
 */
export default function AdminScreen() {
  const { t } = useTranslation();
  const isAdmin = useProfileStore((s) => s.profile?.is_admin ?? false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOverview(await adminRepository.getOverview());
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('admin.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void load();
    }, [isAdmin, load])
  );

  if (!isAdmin) {
    return (
      <Screen>
        <ScreenHeader title={t('admin.title')} action="back" />
        <ErrorState message={t('admin.notAuthorized')} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('admin.title')} action="back" />
      <Appear style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} />}
        >
          {error ? <ErrorState message={error} onRetry={() => void load()} retryLabel={t('common.retry')} /> : null}

          {!overview && isLoading ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton height={120} />
              <Skeleton height={120} />
            </View>
          ) : null}

          {overview ? (
            <>
              <SectionHeader title={t('admin.usersTitle')} />
              <Card style={{ gap: spacing.sm }}>
                <StatRow label={t('admin.totalUsers')} value={overview.users?.total_users} />
                <StatRow label={t('admin.onboarded')} value={overview.users?.onboarded_users} />
                <StatRow label={t('admin.new7')} value={overview.users?.new_last_7_days} />
                <StatRow label={t('admin.new30')} value={overview.users?.new_last_30_days} />
              </Card>

              <SectionHeader title={t('admin.subscriptionsTitle')} />
              <Card style={{ gap: spacing.sm }}>
                <StatRow label={t('admin.activePremium')} value={overview.subscriptions?.active_premium} />
                <StatRow label={t('admin.renewing')} value={overview.subscriptions?.renewing} />
                <StatRow label={t('admin.expired')} value={overview.subscriptions?.expired} />
              </Card>

              <SectionHeader title={t('admin.activityTitle')} />
              <Card style={{ gap: spacing.sm }}>
                {overview.activity.length === 0 ? (
                  <Text variant="caption" color="textSecondary">
                    {t('admin.noActivity')}
                  </Text>
                ) : (
                  overview.activity.map((day) => (
                    <StatRow
                      key={day.date}
                      label={formatShortDate(day.date)}
                      value={day.active_users}
                      suffix={t('admin.avgCompletion', {
                        value: formatNumber(day.avg_completion_percent ?? 0),
                      })}
                    />
                  ))
                )}
              </Card>
            </>
          ) : null}
        </ScrollView>
      </Appear>
    </Screen>
  );
}

function StatRow({ label, value, suffix }: { label: string; value?: number | null; suffix?: string }) {
  return (
    <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong">
        {/* صفر رقم صحيح يجب أن يظهر؛ الغياب وحده يظهر كشرطة. */}
        {value === null || value === undefined ? '—' : formatNumber(value)}
        {suffix ? ` · ${suffix}` : ''}
      </Text>
    </View>
  );
}
