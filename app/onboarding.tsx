import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { GoalType } from '@/src/data/database.types';
import { profileRepository } from '@/src/data/repositories/profileRepository';
import { goalsRepository } from '@/src/data/repositories/goalsRepository';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import { Button, Card, InlineMessage, Screen, Text, TextField, rowDirection } from '@/src/design-system';
import { spacing } from '@/src/design-system/spacing';
import { signOut } from '@/src/features/auth/api';
import { useAuthStore } from '@/src/features/auth/store';
import { useProfileStore } from '@/src/features/auth/profileStore';
import { OnboardingStep } from '@/src/features/onboarding/OnboardingStep';
import { OptionCards, type Option } from '@/src/features/onboarding/OptionCards';
import {
  ageFromBirthDate,
  calculateTargets,
  type ActivityLevel,
  type Sex,
} from '@/src/domain/nutritionTargets';
import { formatNumber } from '@/src/lib/i18n/format';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

const GOAL_OPTIONS: Option<GoalType>[] = [
  { value: 'lose_weight', emoji: '🎯', labelKey: 'goalType.lose_weight', hintKey: 'onboarding.goalHint.lose_weight' },
  { value: 'gain_muscle', emoji: '💪', labelKey: 'goalType.gain_muscle', hintKey: 'onboarding.goalHint.gain_muscle' },
  { value: 'increase_activity', emoji: '🚶', labelKey: 'goalType.increase_activity', hintKey: 'onboarding.goalHint.increase_activity' },
  { value: 'general_health', emoji: '🌱', labelKey: 'goalType.general_health', hintKey: 'onboarding.goalHint.general_health' },
];

const SEX_OPTIONS: Option<Sex>[] = [
  { value: 'male', emoji: '♂️', labelKey: 'profileEdit.sexMale' },
  { value: 'female', emoji: '♀️', labelKey: 'profileEdit.sexFemale' },
];

/**
 * مستويات النشاط بنطاق رقمي صريح تحت كل خيار.
 *
 * "نشيط" وحدها تعني أشياء مختلفة لكل شخص، ومعامل PAL المحسوب منها
 * يصبح تخمينًا. النطاق يحوّل الاختيار إلى تعريف.
 */
const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: 'sedentary', emoji: '🛋️', labelKey: 'activityLevel.sedentary', hintKey: 'onboarding.activityHint.sedentary' },
  { value: 'light', emoji: '🚶', labelKey: 'activityLevel.light', hintKey: 'onboarding.activityHint.light' },
  { value: 'moderate', emoji: '🏃', labelKey: 'activityLevel.moderate', hintKey: 'onboarding.activityHint.moderate' },
  { value: 'active', emoji: '🏋️', labelKey: 'activityLevel.active', hintKey: 'onboarding.activityHint.active' },
  { value: 'very_active', emoji: '🏅', labelKey: 'activityLevel.very_active', hintKey: 'onboarding.activityHint.very_active' },
];

const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const sessionEmail = useAuthStore((s) => s.session?.user.email);
  const fetchProfile = useProfileStore((s) => s.fetch);
  const profileLoadError = useProfileStore((s) => s.loadError);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const age = birthDate ? ageFromBirthDate(birthDate) : null;
  const height = Number(heightCm);
  const weight = Number(weightKg);

  /**
   * الخطة المحسوبة — تُعرض في الخطوة الأخيرة قبل الحفظ.
   *
   * هذا هو سبب طلب البيانات أصلًا: بدونها كان المستخدم ينهي التسجيل
   * ويرى قيمة FDA المرجيعة العامة كأنها هدفه. الآن يرى رقمه هو، محسوبًا
   * أمامه، فيفهم من أين جاء.
   */
  const plan = useMemo(() => {
    if (!sex || age === null || !Number.isFinite(height) || !Number.isFinite(weight) || !activityLevel || !goalType) {
      return null;
    }
    if (height <= 0 || weight <= 0) return null;
    return calculateTargets({ sex, ageYears: age, heightCm: height, weightKg: weight, activityLevel, goalType });
  }, [sex, age, height, weight, activityLevel, goalType]);

  const canContinue = ((): boolean => {
    switch (step) {
      case 1: return displayName.trim().length > 0;
      case 2: return goalType !== null;
      case 3: return sex !== null;
      case 4: return BIRTH_DATE_PATTERN.test(birthDate) && age !== null && age >= 13 && age <= 100;
      case 5: return Number.isFinite(height) && height >= 90 && height <= 250
                  && Number.isFinite(weight) && weight >= 25 && weight <= 400;
      case 6: return activityLevel !== null;
      default: return plan !== null;
    }
  })();

  async function confirmSignOut() {
    Alert.alert(t('onboarding.signOutConfirmTitle'), t('onboarding.signOutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('onboarding.signOut'),
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
          } catch (e) {
            setError(getFriendlyErrorMessage(e, t('profile.signOutError')));
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setError(null);
      setStep((current) => current + 1);
      return;
    }
    if (isSubmitting || !userId || !plan) return;

    setError(null);
    setIsSubmitting(true);
    try {
      // الملف أولًا: الأهداف بلا بيانات جسم لا معنى لها، وفشل الأول
      // يجب ألا يترك أهدافًا محسوبة من بيانات لم تُحفظ.
      await profileRepository.updateCurrent({
        display_name: displayName.trim(),
        goal_type: goalType!,
        sex,
        birth_date: birthDate,
        height_cm: height,
        activity_level: activityLevel,
        onboarding_completed_at: new Date().toISOString(),
      });

      await goalsRepository.updateTargets(userId, {
        target_calories: plan.calories,
        target_protein_g: plan.proteinG,
        target_carbs_g: plan.carbsG,
        target_fat_g: plan.fatG,
        targets_source: 'calculated',
      });

      // الوزن سجلّ لا حقل ملف: نحفظه كأول قياس ليبدأ الرسم البياني من
      // اليوم الأول بدل شاشة فارغة حتى أول تسجيل يدوي.
      await dailyLogsRepository.addWeight(userId, weight).catch(() => {
        // فشل تسجيل الوزن لا يُبطل التسجيل كله — البيانات الأساسية حُفظت.
      });

      await fetchProfile();
      router.replace('/(tabs)');
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <OnboardingStep
        stepNumber={step}
        totalSteps={TOTAL_STEPS}
        sectionKey={step <= 2 ? 'onboarding.sectionYou' : step <= 6 ? 'onboarding.sectionBody' : 'onboarding.sectionPlan'}
        titleKey={`onboarding.step${step}.title`}
        subtitleKey={step === TOTAL_STEPS ? undefined : `onboarding.step${step}.subtitle`}
        canContinue={canContinue}
        isLast={step === TOTAL_STEPS}
        isSubmitting={isSubmitting}
        onNext={() => void handleNext()}
        onBack={step > 1 ? () => setStep((c) => c - 1) : undefined}
      >
        {step === 1 ? (
          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('onboarding.namePlaceholder')}
            autoFocus
            returnKeyType="next"
            accessibilityLabel={t('onboarding.step1.title')}
          />
        ) : null}

        {step === 2 ? <OptionCards options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} /> : null}
        {step === 3 ? <OptionCards options={SEX_OPTIONS} value={sex} onChange={setSex} /> : null}

        {step === 4 ? (
          <View style={{ gap: spacing.xs }}>
            <TextField
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="1996-01-15"
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t('onboarding.step4.title')}
            />
            {/* تأكيد فوري أن ما كُتب فُهم كما قُصد — تاريخ مكتوب يدويًا
                يُخطئ بسهولة، والعمر المشتق يكشف الخطأ في لحظته. */}
            {age !== null ? (
              <Text variant="caption" color="textSecondary">
                {t('onboarding.ageDerived', { age: formatNumber(age) })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 5 ? (
          <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('profileEdit.heightLabel')}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
                placeholder="175"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('onboarding.weightKg')}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholder="75"
              />
            </View>
          </View>
        ) : null}

        {step === 6 ? (
          <OptionCards options={ACTIVITY_OPTIONS} value={activityLevel} onChange={setActivityLevel} />
        ) : null}

        {/* الخطوة الأخيرة: الخطة المحسوبة، مع مصدرها.
            عرض الرقم بلا شرح يجعله رقمًا آخر من التطبيق؛ عرض المعادلة
            التي أنتجته يجعله رقم المستخدم. */}
        {step === TOTAL_STEPS && plan ? (
          <View style={{ gap: spacing.md }}>
            <Card style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Text variant="overline" color="textSecondary">
                {t('onboarding.dailyCalories')}
              </Text>
              <Text variant="displayLg" color="primary">
                {formatNumber(plan.calories)}
              </Text>
              <View style={{ flexDirection: rowDirection, gap: spacing.lg }}>
                <MacroPill label={t('goals.protein')} value={plan.proteinG} />
                <MacroPill label={t('goals.carbs')} value={plan.carbsG} />
                <MacroPill label={t('goals.fat')} value={plan.fatG} />
              </View>
            </Card>

            <Text variant="caption" color="textSecondary">
              {t('onboarding.planBasis', {
                bmr: formatNumber(plan.bmr),
                tdee: formatNumber(plan.tdee),
              })}
            </Text>

            {plan.deficitLimitedBySafetyFloor ? (
              <InlineMessage tone="info" message={t('goals.suggestedFloor')} />
            ) : null}

            <Text variant="caption" color="textSecondary">
              {t('onboarding.planEditable')}
            </Text>
          </View>
        ) : null}

        {profileLoadError && !error ? <InlineMessage tone="danger" message={profileLoadError} /> : null}
        {error ? <InlineMessage tone="danger" message={error} /> : null}

        {/* مخرج دائم: مستخدم دخل بحساب خاطئ يجب ألا يعلق في التسجيل. */}
        <View style={{ alignItems: 'center', gap: spacing.xxs, marginTop: spacing.md }}>
          <Text variant="caption" color="textSecondary">
            {sessionEmail ? `${t('onboarding.signedInAs')} · ${sessionEmail}` : t('onboarding.signedInAs')}
          </Text>
          <Button
            label={t('onboarding.signOut')}
            variant="ghost"
            loading={isSigningOut}
            disabled={isSubmitting}
            onPress={confirmSignOut}
          />
        </View>
      </OnboardingStep>
    </Screen>
  );
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xxs }}>
      <Text variant="bodyStrong">{formatNumber(value)}</Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}
