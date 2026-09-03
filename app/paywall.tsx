import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import { Button, Card, Screen, Skeleton, Text, Wordmark, palette } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { getCurrentOfferingPackages, isRevenueCatConfigured, purchasePackage, restorePurchases } from '@/src/subscriptions/revenuecat';
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

  async function handlePurchase(pkg: PurchasesPackage) {
    setBusyPackageId(pkg.identifier);
    setError(null);
    try {
      await purchasePackage(pkg);
      await refresh();
      router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('paywall.purchaseError')));
    } finally {
      setBusyPackageId(null);
    }
  }

  async function handleRestore() {
    setError(null);
    setIsRestoring(true);
    try {
      await restorePurchases();
      await refresh();
      router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('paywall.restoreError')));
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
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Wordmark />
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
                  {isAnnual ? (
                    <Text variant="overline" color="accent">
                      {t('paywall.bestValue')}
                    </Text>
                  ) : null}
                  <Text variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
                    {pkg.product.title}
                  </Text>
                  <Text variant="title" color="primary" style={{ marginTop: spacing.xxs }}>
                    {pkg.product.priceString}
                  </Text>
                  <Button
                    label={busyPackageId === pkg.identifier ? t('paywall.purchasing') : t('paywall.subscribe')}
                    variant={isAnnual ? 'primary' : 'secondary'}
                    style={{ marginTop: spacing.sm }}
                    disabled={busyPackageId !== null}
                    onPress={() => handlePurchase(pkg)}
                  />
                </Card>
              );
            })}
          </View>
        )}

        {error ? (
          <Text variant="caption" color="danger" style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}

        <Button
          label={isRestoring ? t('paywall.restoring') : t('paywall.restorePurchases')}
          variant="ghost"
          disabled={isRestoring}
          onPress={handleRestore}
        />
      </View>
    </Screen>
  );
}
