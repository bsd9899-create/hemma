import { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  Badge,
  Button,
  Card,
  InlineMessage,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  Wordmark,
  palette,
  rowDirection,
} from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import {
  getCurrentOfferingPackages,
  hasPremiumEntitlement,
  isPurchaseCancelledError,
  isRevenueCatConfigured,
  purchasePackage,
  restorePurchases,
} from '@/src/subscriptions/revenuecat';
import {
  getTrialOffer,
  isBestValue,
  monthlyEquivalent,
  renewalPeriodKey,
  sortPackagesForDisplay,
  trialUnitKey,
} from '@/src/subscriptions/planPresentation';
import { TrialTimeline } from '@/src/features/subscription/TrialTimeline';
import { usePremiumStatus } from '@/src/subscriptions/usePremiumStatus';
import { formatNumber } from '@/src/lib/i18n/format';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

/**
 * الرابطان إلزاميان داخل هذه الشاشة تحديدًا — لا يكفي وجودهما في
 * "حسابي". Apple تشترط ظهور اتفاقية الترخيص وسياسة الخصوصية في نفس
 * الشاشة التي تعرض اشتراكًا متجددًا (App Store Review Guideline 3.1.2)،
 * وغيابهما سبب رفض متكرر ومعروف.
 */
const TERMS_URL = 'https://himmah.online/terms.html';
const PRIVACY_URL = 'https://himmah.online/privacy.html';

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
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isRevenueCatConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- لا يوجد جلب بيانات لننتظره هنا أصلاً
      setIsLoading(false);
      return;
    }
    getCurrentOfferingPackages()
      .then((fetched) => setPackages(sortPackagesForDisplay(fetched)))
      .catch((e) => setError(getFriendlyErrorMessage(e, t('paywall.loadError'))))
      .finally(() => setIsLoading(false));
  }, [t]);

  const isBusy = busyPackageId !== null || isRestoring;

  /**
   * طول التجربة كما أعلنه المتجر — لا رقم مكتوب في الكود.
   * نأخذ أطول تجربة معروضة: الخط الزمني واحد لكل الباقات، وعرض أقصر
   * مدة سيقصّر الوعد على من اختار الباقة الأطول.
   */
  const trialDays = packages.reduce<number | null>((longest, pkg) => {
    const offer = getTrialOffer(pkg);
    if (!offer || offer.unit.toUpperCase() !== 'DAY') return longest;
    return longest === null || offer.count > longest ? offer.count : longest;
  }, null);

  async function handlePurchase(pkg: PurchasesPackage) {
    if (isBusy) return;
    setBusyPackageId(pkg.identifier);
    setError(null);
    setNotice(null);
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
    setNotice(null);
    setIsRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      // الاستعادة "تنجح" تقنيًا حتى حين لا يوجد شيء يُستعاد. الإغلاق
      // الصامت هنا كان يترك المستخدم يظن أن اشتراكه عاد بينما لم يعد،
      // فنفحص الاستحقاق فعليًا ونقول له النتيجة.
      if (hasPremiumEntitlement(customerInfo)) {
        await refresh();
        router.back();
        return;
      }
      setNotice(t('paywall.nothingToRestore'));
    } catch (e) {
      if (!isPurchaseCancelledError(e)) {
        setError(getFriendlyErrorMessage(e, t('paywall.restoreError')));
      }
    } finally {
      setIsRestoring(false);
    }
  }

  /**
   * فتح رابط خارجي بأمان.
   *
   * `Linking.openURL(url).catch(...)` وحده غير كافٍ: الدالة قد ترمي
   * **تزامنيًا** (رابط مشوَّه، أو منصة بلا معالج) فلا يُستدعى catch
   * إطلاقًا وينهار التطبيق. await داخل try يمسك الحالتين معًا — وهو
   * نفس النمط المستخدم في شاشة "حسابي".
   */
  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setError(t('profile.linkError'));
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
      {/* الشاشة أطول من الجهاز بعد إضافة إفصاح التجربة وشروط التجديد
          والروابط القانونية — بلا تمرير تُقتطع الروابط الإلزامية على
          الأجهزة الصغيرة، وهي بالضبط ما يبحث عنه مراجع App Store. */}
      <ScrollView
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
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
            <Skeleton height={140} />
            <Skeleton height={140} />
          </View>
        ) : packages.length === 0 ? (
          <Card variant="soft">
            <Text variant="body" color="textSecondary">
              {t('paywall.noPlans')}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {/* الخط الزمني مرة واحدة فوق الباقات لا داخل كل بطاقة:
                التسلسل واحد مهما اختار المستخدم، وتكراره ضجيج. */}
            {trialDays !== null ? (
              <Card variant="soft" style={{ gap: spacing.sm }}>
                <Text variant="bodyStrong">{t('paywall.timeline.heading', { count: trialDays, days: formatNumber(trialDays) })}</Text>
                <TrialTimeline trialDays={trialDays} />
              </Card>
            ) : null}

            {packages.map((pkg) => {
              const featured = isBestValue(pkg);
              const trial = getTrialOffer(pkg);
              const periodKey = renewalPeriodKey(pkg);
              const perMonth = monthlyEquivalent(pkg);
              return (
                <Card
                  key={pkg.identifier}
                  style={featured ? { borderColor: palette.green900, borderWidth: 2 } : undefined}
                >
                  {featured ? <Badge label={t('paywall.bestValue')} tone="accent" /> : null}

                  <Text variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
                    {pkg.product.title}
                  </Text>

                  {/* السعر يأتي من المتجر (priceString) بعملة المستخدم
                      وضريبته — لا رقم مكتوب في الكود. */}
                  <Text variant="title" color="primary" style={{ marginTop: spacing.xxs }}>
                    {pkg.product.priceString}
                    {periodKey ? (
                      <Text variant="body" color="textSecondary">
                        {' '}
                        {t(periodKey)}
                      </Text>
                    ) : null}
                  </Text>

                  {/* المكافئ الشهري: باقة ٣ أشهر بسعر إجمالي تبدو أغلى
                      من الشهرية وهي أرخص. المقارنة الصحيحة تحتاج القسمة. */}
                  {perMonth !== null ? (
                    <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xxs }}>
                      {t('paywall.perMonthEquivalent', { value: formatNumber(perMonth) })}
                    </Text>
                  ) : null}

                  {/* إفصاح التجربة المجانية: مدتها، ثم ماذا يحدث بعدها.
                      عرض المدة بلا ذكر التجديد التلقائي مخالفة صريحة. */}
                  {trial ? (
                    <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xxs }}>
                      {t('paywall.trialLine', {
                        count: trial.count,
                        days: formatNumber(trial.count),
                        unit: t(trialUnitKey(trial), { count: trial.count }),
                        price: pkg.product.priceString,
                        period: periodKey ? t(periodKey) : '',
                      })}
                    </Text>
                  ) : null}

                  <Button
                    label={trial ? t('paywall.startTrial') : t('paywall.subscribe')}
                    variant={featured ? 'primary' : 'secondary'}
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

        {/* الطمأنة قبل الزر لا بعده: القلق يسبق الضغط. */}
        {trialDays !== null ? (
          <Text variant="captionStrong" color="success" style={{ textAlign: 'center' }}>
            ✓ {t('paywall.noChargeToday')}
          </Text>
        ) : null}

        {error ? <InlineMessage tone="danger" message={error} /> : null}
        {notice ? <InlineMessage tone="info" message={notice} /> : null}

        <Button
          label={t('paywall.restorePurchases')}
          variant="ghost"
          loading={isRestoring}
          disabled={isBusy}
          onPress={handleRestore}
        />

        {/* شروط التجديد التلقائي — نص ثابت مطلوب بغضّ النظر عن وجود تجربة. */}
        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          {t('paywall.renewalTerms')}
        </Text>

        <View style={{ flexDirection: rowDirection, justifyContent: 'center', gap: spacing.md }}>
          <Button label={t('paywall.termsOfUse')} variant="ghost" onPress={() => void openLink(TERMS_URL)} />
          <Button label={t('paywall.privacyPolicy')} variant="ghost" onPress={() => void openLink(PRIVACY_URL)} />
        </View>
      </ScrollView>
    </Screen>
  );
}
