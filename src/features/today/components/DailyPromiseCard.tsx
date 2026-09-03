import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DailyPromise, PromiseType } from '@/src/data/repositories/dailyPromiseRepository';
import { Card, Text, colors, rowDirection } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';
import { PROMISE_TYPES } from '../useDailyPromise';

type DailyPromiseCardProps = {
  promise: DailyPromise | null;
  isSaving?: boolean;
  error?: string | null;
  onChoose: (type: PromiseType) => void;
  onMarkFulfilled: (fulfilled: boolean) => void;
};

export function DailyPromiseCard({ promise, isSaving, error, onChoose, onMarkFulfilled }: DailyPromiseCardProps) {
  const { t } = useTranslation();

  const errorText = error ? (
    <Text variant="caption" color="danger" style={{ marginTop: spacing.xs }}>
      {error}
    </Text>
  ) : null;

  if (!promise) {
    return (
      <Card variant="soft">
        <Text variant="overline" color="textSecondary">
          {t('today.promiseQuestion')}
        </Text>
        <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {PROMISE_TYPES.map((type) => (
            <Pressable
              key={type}
              disabled={isSaving}
              onPress={() => onChoose(type)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: colors.surface,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              <Text variant="captionStrong">{t(`promises.${type}`)}</Text>
            </Pressable>
          ))}
        </View>
        {errorText}
      </Card>
    );
  }

  if (promise.fulfilled === null) {
    return (
      <Card variant="soft">
        <Text variant="overline" color="textSecondary">
          {t('today.promiseOfDay')}
        </Text>
        <Text variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
          {t(`promises.${promise.promise_type}`)}
        </Text>
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.sm }}>
          {t('today.promiseFulfilledQuestion')}
        </Text>
        <View style={{ flexDirection: rowDirection, gap: spacing.sm, marginTop: spacing.xs }}>
          <Pressable
            disabled={isSaving}
            onPress={() => onMarkFulfilled(true)}
            style={{
              flex: 1,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: 'center',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            <Text variant="captionStrong" color="onPrimary">
              {t('today.promiseYes')}
            </Text>
          </Pressable>
          <Pressable
            disabled={isSaving}
            onPress={() => onMarkFulfilled(false)}
            style={{
              flex: 1,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              alignItems: 'center',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            <Text variant="captionStrong">{t('today.promiseNotYet')}</Text>
          </Pressable>
        </View>
        {errorText}
      </Card>
    );
  }

  return (
    <Card variant="soft">
      <Text variant="overline" color="textSecondary">
        {t('today.promiseOfDay')}
      </Text>
      <Text variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
        {t(`promises.${promise.promise_type}`)} {promise.fulfilled ? t('today.promiseFulfilled') : t('today.promiseCarryOver')}
      </Text>
    </Card>
  );
}
