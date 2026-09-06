import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';

/**
 * هيكل موحّد لكل خطوة في التسجيل: شريط تقدّم، وسم قسم، سؤال واحد،
 * وزر واحد.
 *
 * لماذا سؤال واحد لكل شاشة بدل نموذج واحد طويل: النموذج الطويل يعرض
 * كل ما نطلبه دفعة واحدة فيبدو استجوابًا، ويجعل كل حقل فارغ عبئًا
 * مرئيًا. الخطوة الواحدة تُبقي العبء المدرَك ثابتًا مهما طال التسجيل،
 * وشريط التقدّم يحوّل "كم بقي؟" من قلق إلى معلومة.
 */
type OnboardingStepProps = PropsWithChildren<{
  /** ترتيب الخطوة الحالية (تبدأ من ١). */
  stepNumber: number;
  totalSteps: number;
  /** وسم القسم فوق العنوان — "عنك"، "هدفك". */
  sectionKey: string;
  titleKey: string;
  /** شرح تحت العنوان؛ يُحذف حين يشرح السؤال نفسه. */
  subtitleKey?: string;
  /** تعطيل المتابعة حتى تكتمل الإجابة. */
  canContinue: boolean;
  isLast?: boolean;
  isSubmitting?: boolean;
  onNext: () => void;
  onBack?: () => void;
}>;

export function OnboardingStep({
  stepNumber,
  totalSteps,
  sectionKey,
  titleKey,
  subtitleKey,
  canContinue,
  isLast,
  isSubmitting,
  onNext,
  onBack,
  children,
}: OnboardingStepProps) {
  const { t } = useTranslation();
  const progress = Math.min(1, stepNumber / totalSteps);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={24}
    >
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm }}>
        {onBack ? (
          <Button label={t('common.back')} variant="ghost" onPress={onBack} />
        ) : null}
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: totalSteps, now: stepNumber }}
          accessibilityLabel={t('onboarding.progressLabel', { current: stepNumber, total: totalSteps })}
          style={{ flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.xs }}>
          <Text variant="overline" color="accent">
            {t(sectionKey)}
          </Text>
          <Text variant="displayMd">{t(titleKey)}</Text>
          {subtitleKey ? (
            <Text variant="body" color="textSecondary">
              {t(subtitleKey)}
            </Text>
          ) : null}
        </View>

        {children}
      </ScrollView>

      <View style={{ paddingBottom: spacing.md }}>
        <Button
          label={t(isLast ? 'onboarding.finish' : 'common.next')}
          size="lg"
          disabled={!canContinue}
          loading={isSubmitting}
          onPress={onNext}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
