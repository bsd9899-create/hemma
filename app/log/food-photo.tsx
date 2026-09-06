import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  InlineMessage,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  TextField,
  colors,
  rowDirection,
} from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { useAuthStore } from '@/src/features/auth/store';
import { dailyLogsRepository } from '@/src/data/repositories/dailyLogsRepository';
import {
  analyzeFoodPhoto,
  FoodAnalysisError,
  sumAnalysis,
  type FoodAnalysis,
} from '@/src/features/nutrition/foodAnalysis';
import { MEAL_TYPES } from '@/src/domain/nutrition';
import { formatNumber } from '@/src/lib/i18n/format';
import { getFriendlyErrorMessage } from '@/src/lib/errors';

export default function FoodPhotoScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const isArabic = i18n.language !== 'en';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [hint, setHint] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    // الإذن يُطلب عند الاستخدام لا عند فتح الشاشة: طلب الكاميرا قبل أن
    // يضغط المستخدم شيئًا يبدو اقتحاميًا ويُرفض أكثر.
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(t('foodPhoto.permissionDenied'));
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      allowsEditing: true,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    // الإلغاء تصرّف طبيعي لا خطأ — عودة صامتة.
    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setAnalysis(null);
    await runAnalysis(asset.base64!, asset.mimeType ?? 'image/jpeg');
  }

  async function runAnalysis(base64: string, mediaType: string) {
    setIsAnalyzing(true);
    setError(null);
    try {
      setAnalysis(await analyzeFoodPhoto({ imageBase64: base64, mediaType, hint: hint.trim() || undefined }));
    } catch (e) {
      // رسالة مختلفة لكل سبب: "تجاوزت الحدّ اليومي" و"الميزة غير مفعّلة"
      // و"تعذّر الاتصال" مشاكل مختلفة تمامًا وحلولها مختلفة.
      setError(
        e instanceof FoodAnalysisError
          ? t(`foodPhoto.errors.${e.code}`, { defaultValue: t('foodPhoto.errors.unknown') })
          : getFriendlyErrorMessage(e, t('foodPhoto.errors.unknown'))
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!userId || !analysis || isSaving) return;
    const totals = sumAnalysis(analysis.items);
    if (totals.calories <= 0) {
      setError(t('foodPhoto.nothingDetected'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const description = analysis.items
        .map((i) => (isArabic ? i.name_ar : i.name_en))
        .filter(Boolean)
        .join('، ');

      await dailyLogsRepository.addNutritionLog(userId, {
        mealType,
        description: description || t('foodPhoto.fallbackDescription'),
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.protein_g),
        carbsG: Math.round(totals.carbs_g),
        fatG: Math.round(totals.fat_g),
      });
      if (router.canDismiss()) router.dismissAll();
      else router.back();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, t('common.genericSaveError')));
    } finally {
      setIsSaving(false);
    }
  }

  const totals = analysis ? sumAnalysis(analysis.items) : null;

  return (
    <Screen>
      <ScreenHeader title={t('foodPhoto.title')} action="close" />
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: 220, borderRadius: radius.lg }}
            resizeMode="cover"
            accessibilityLabel={t('foodPhoto.photoAlt')}
          />
        ) : (
          <Card variant="soft" style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{t('foodPhoto.howItWorksTitle')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('foodPhoto.howItWorksBody')}
            </Text>
          </Card>
        )}

        <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button label={t('foodPhoto.takePhoto')} onPress={() => void pick('camera')} disabled={isAnalyzing} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={t('foodPhoto.choosePhoto')}
              variant="secondary"
              onPress={() => void pick('library')}
              disabled={isAnalyzing}
            />
          </View>
        </View>

        {/* نوع الوجبة يُختار قبل الحفظ: بلا ذلك تُحفظ كل صورة كـ"غداء"
            افتراضيًا، فيُفسد التصنيف شاشة التغذية بصمت. */}
        <View style={{ gap: spacing.xs }}>
          <Text variant="captionStrong" color="textSecondary">
            {t('logNutrition.mealType')}
          </Text>
          <View style={{ flexDirection: rowDirection, gap: spacing.xs, flexWrap: 'wrap' }}>
            {MEAL_TYPES.map((type) => {
              const selected = mealType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={t(`logNutrition.${type}`)}
                  onPress={() => setMealType(type)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.pill,
                      backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text variant="captionStrong" color={selected ? 'onPrimary' : 'textSecondary'}>
                    {t(`logNutrition.${type}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label={t('foodPhoto.hintLabel')}
          value={hint}
          onChangeText={setHint}
          placeholder={t('foodPhoto.hintPlaceholder')}
        />

        {isAnalyzing ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={24} />
            <Skeleton height={90} />
          </View>
        ) : null}

        {error ? <InlineMessage tone="danger" message={error} /> : null}

        {analysis && !isAnalyzing ? (
          <>
            {/* الثقة تُعرض دائمًا: تقدير منخفض الثقة معروض كرقم واثق
                هو أسوأ ما يمكن أن تفعله ميزة كهذه. */}
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm }}>
              <Badge
                label={t(`foodPhoto.confidence.${analysis.confidence}`)}
                tone={analysis.confidence === 'high' ? 'accent' : 'neutral'}
              />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {t('foodPhoto.estimateDisclaimer')}
              </Text>
            </View>

            {analysis.items.length === 0 ? (
              <Card variant="soft">
                <Text variant="body" color="textSecondary">
                  {t('foodPhoto.nothingDetected')}
                </Text>
              </Card>
            ) : (
              <Card style={{ gap: spacing.sm }}>
                {analysis.items.map((item, i) => (
                  <View
                    key={`${item.name_en}-${i}`}
                    style={{ flexDirection: rowDirection, justifyContent: 'space-between', gap: spacing.sm }}
                  >
                    <Text variant="body" style={{ flex: 1 }}>
                      {isArabic ? item.name_ar : item.name_en}
                      {item.grams > 0 ? (
                        <Text variant="caption" color="textSecondary">
                          {'  '}
                          {formatNumber(item.grams)} {t('common.grams')}
                        </Text>
                      ) : null}
                    </Text>
                    <Text variant="bodyStrong">
                      {formatNumber(Math.round(item.calories))} {t('common.kcal')}
                    </Text>
                  </View>
                ))}

                {totals ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#DAD2C4', paddingTop: spacing.sm, gap: spacing.xxs }}>
                    <Text variant="bodyStrong">
                      {t('foodPhoto.total')}: {formatNumber(Math.round(totals.calories))} {t('common.kcal')}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {t('foodPhoto.macros', {
                        protein: formatNumber(Math.round(totals.protein_g)),
                        carbs: formatNumber(Math.round(totals.carbs_g)),
                        fat: formatNumber(Math.round(totals.fat_g)),
                      })}
                    </Text>
                  </View>
                ) : null}
              </Card>
            )}

            {analysis.note_ar ? (
              <Text variant="caption" color="textSecondary">
                {analysis.note_ar}
              </Text>
            ) : null}

            {/* لا حفظ تلقائي: التقدير يُعرض ليؤكّده المستخدم أو يعدّله
                من شاشة التغذية. حفظ رقم مقدَّر بلا موافقته يملأ سجلّه
                بأرقام لم يقرّها. */}
            {analysis.items.length > 0 ? (
              <Button
                label={t('foodPhoto.confirmAndSave')}
                size="lg"
                loading={isSaving}
                onPress={handleSave}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
