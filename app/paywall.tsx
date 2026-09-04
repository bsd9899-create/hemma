import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import { Badge, Button, Card, InlineMessage, Screen, ScreenHeader, Skeleton, Text, Wordmark, palette } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import {
  getCurrentOfferingPackages,
  isPurchaseCancelledError,
  isRevenueCatConfigured,
  purchasePackage,
  restorePurchases,
} from '@/src/subscriptions/revenuecat';
import { usePremiumStatus } from '@/src/subscriptions/usePremiumStatus';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { isPremium, refresh } = usePremiumStatus(userId);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRevenueCatConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- لا يوجد جلب بيانات لننتظره هنا أصلاً
      setIsLoading(false);
      return;
    }
    getCurrentOfferingPackages()
      .then(setPackages)
      .catch((e) => setError(getFriendlyErrorMessage(e, t('paywall.loadError'))))
      .finally(() => setIsLoading(false));
  }, [t]);

  const isBusy = busyPackageId !== null || isRestoring;

  async function handlePurchase(pkg: PurchasesPackage) {
    if (isBusy) return;
    setBusyPackageId(pkg.identifier);
    setError(null);
    try {
      await purchasePackage(pkg);
      await refresh();
      router.back();
    } catch (e) {
      // إغلاق ورقة الدفع تصرّف طبيعي وليس فشلًا — نعود بصمت بلا رسالة حمراء.
      if (!isPurchaseCancelledError(e)) {
        setError(getFriendlyErrorMessage(e, t('paywall.purchaseError')));
      }
    } finally {
      setBusyPackageId(null);
    }
  }

  async function handleRestore() {
    if (isBusy) return;
    setError(null);
    setIsRestoring(true);
    try {
      await restorePurchases();
      await refresh();
      router.back();
    } catch (e) {
      if (!isPurchaseCancelledError(e)) {
        setError(getFriendlyErrorMessage(e, t('paywall.restoreError')));
      }
    } finally {
      setIsRestoring(false);
    }
  }

  if (isPremium) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <Text variant="displayMd">✅</Text>
        <Text variant="title">{t('paywall.subscribedTitle')}</Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          {t('paywall.manageSubscription')}
        </Text>
        <Button label={t('paywall.close')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg }}>
        <ScreenHeader title="" action="close" />

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Wordmark size="md" />
          <Text variant="title" style={{ textAlign: 'center' }}>
            {t('paywall.title')}
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {t('paywall.subtitle')}
          </Text>
        </View>

        {!isRevenueCatConfigured ? (
          <Card variant="soft">
            <Text variant="body" color="textSecondary">
              {t('paywall.notConfigured')}
            </Text>
          </Card>
        ) : isLoading ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={100} />
            <Skeleton height={100} />
          </View>
        ) : packages.length === 0 ? (
          <Card variant="soft">
            <Text variant="body" color="textSecondary">
              {t('paywall.noPlans')}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {packages.map((pkg) => {
              const isAnnual = pkg.packageType === 'ANNUAL';
              return (
                <Card
                  key={pkg.identifier}
                  style={isAnnual ? { borderColor: palette.gold500, borderWidth: 2 } : undefined}
                >
                  {isAnnual ? <Badge label={t('paywall.bestValue')} tone="accent" /> : null}
                  <Text variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
                    {pkg.product.title}
                  </Text>
                  <Text variant="title" color="primary" style={{ marginTop: spacing.xxs }}>
                    {pkg.product.priceString}
                  </Text>
                  <Button
                    label={t('paywall.subscribe')}
                    variant={isAnnual ? 'primary' : 'secondary'}
                    size="lg"
                    style={{ marginTop: spacing.sm }}
                    loading={busyPackageId === pkg.identifier}
                    disabled={isBusy}
                    onPress={() => handlePurchase(pkg)}
                  />
                </Card>
              );
            })}
          </View>
        )}

        {error ? <InlineMessage tone="danger" message={error} /> : null}

        <Button
          label={t('paywall.restorePurchases')}
          variant="ghost"
          loading={isRestoring}
          disabled={isBusy}
          onPress={handleRestore}
        />
      </View>
    </Screen>
  );
}
