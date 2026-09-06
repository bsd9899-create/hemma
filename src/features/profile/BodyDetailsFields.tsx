import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextField, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { ACTIVITY_FACTORS, type ActivityLevel, type Sex } from '@/src/domain/nutritionTargets';

const SEXES: Sex[] = ['male', 'female'];
const ACTIVITY_LEVELS = Object.keys(ACTIVITY_FACTORS) as ActivityLevel[];

type BodyDetailsValue = {
  sex: Sex | null;
  birthDate: string;
  heightCm: string;
  activityLevel: ActivityLevel | null;
};

type BodyDetailsFieldsProps = {
  value: BodyDetailsValue;
  onChange: (next: Partial<BodyDetailsValue>) => void;
  disabled?: boolean;
  birthDateError?: string;
  heightError?: string;
};

/** خيار واحد قابل للاختيار — نفس الشكل للجنس ومستوى النشاط. */
function Choice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: 'center',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed && !disabled && { opacity: 0.8 },
      ]}
    >
      <Text variant="captionStrong" color={selected ? 'onPrimary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * حقول الجسم اللازمة لحساب الأهداف. مجموعة في مكوّن واحد لأن onboarding
 * وتعديل الملف يحتاجانها بنفس الشكل والتحقق.
 */
export function BodyDetailsFields({ value, onChange, disabled, birthDateError, heightError }: BodyDetailsFieldsProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xxs }}>
        <Text variant="captionStrong" color="textSecondary">
          {t('profileEdit.sexLabel')}
        </Text>
        <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
          {SEXES.map((sex) => (
            <Choice
              key={sex}
              label={t(sex === 'male' ? 'profileEdit.sexMale' : 'profileEdit.sexFemale')}
              selected={value.sex === sex}
              disabled={disabled}
              onPress={() => onChange({ sex })}
            />
          ))}
        </View>
      </View>

      <TextField
        label={t('profileEdit.birthDateLabel')}
        placeholder="1996-05-20"
        value={value.birthDate}
        onChangeText={(next) => onChange({ birthDate: next })}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        editable={!disabled}
        error={birthDateError}
      />

      <TextField
        label={t('profileEdit.heightLabel')}
        value={value.heightCm}
        onChangeText={(next) => onChange({ heightCm: next })}
        keyboardType="decimal-pad"
        editable={!disabled}
        error={heightError}
      />

      <View style={{ gap: spacing.xxs }}>
        <Text variant="captionStrong" color="textSecondary">
          {t('profileEdit.activityLabel')}
        </Text>
        <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing.xs }}>
          {ACTIVITY_LEVELS.map((level) => (
            <Choice
              key={level}
              label={t(`profileEdit.activity.${level}`)}
              selected={value.activityLevel === level}
              disabled={disabled}
              onPress={() => onChange({ activityLevel: level })}
            />
          ))}
        </View>
      </View>

      <Text variant="caption" color="textSecondary">
        {t('profileEdit.bodyWhy')}
      </Text>
    </View>
  );
}

export type { BodyDetailsValue };
