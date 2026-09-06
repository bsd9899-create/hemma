import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
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
import { useExerciseLibrary } from '@/src/features/exercises/useExerciseLibrary';
import { MUSCLE_GROUPS, muscleLabelKey } from '@/src/features/exercises/labels';
import type { MuscleGroup } from '@/src/data/database.types';

export default function ExerciseLibraryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { exercises, favourites, filter, setFilter, toggleFavourite, isLoading, error } =
    useExerciseLibrary(userId);
  const [search, setSearch] = useState('');

  const isArabic = i18n.language !== 'en';

  function selectMuscle(muscle: MuscleGroup | null) {
    setFilter((f) => ({ ...f, muscle: f.muscle === muscle ? null : muscle }));
  }

  return (
    <Screen>
      <ScreenHeader title={t('exercises.title')} action="back" />

      <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        <TextField
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setFilter((f) => ({ ...f, search: v }));
          }}
          placeholder={t('exercises.searchPlaceholder')}
          returnKeyType="search"
          accessibilityLabel={t('exercises.searchPlaceholder')}
        />

        {/* شرائح العضلات — تمرير أفقي حتى لا تُقصّ على الشاشات الصغيرة */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...MUSCLE_GROUPS]}
          keyExtractor={(m) => m ?? 'all'}
          contentContainerStyle={{ gap: spacing.xs }}
          renderItem={({ item }) => {
            const selected = (filter.muscle ?? null) === item;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                onPress={() => selectMuscle(item)}
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
                  {item === null ? t('exercises.allMuscles') : t(muscleLabelKey(item))}
                </Text>
              </Pressable>
            );
          }}
        />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: filter.favouritesOnly ?? false }}
          onPress={() => setFilter((f) => ({ ...f, favouritesOnly: !f.favouritesOnly }))}
          hitSlop={8}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          <Text variant="captionStrong" color={filter.favouritesOnly ? 'primary' : 'textSecondary'}>
            {filter.favouritesOnly ? '★ ' : '☆ '}
            {t('exercises.favouritesOnly')}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <ErrorState message={error} retryLabel={t('common.retry')} onRetry={() => setFilter({ ...filter })} />
      ) : isLoading ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={76} />
          <Skeleton height={76} />
          <Skeleton height={76} />
        </View>
      ) : exercises.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title={t('exercises.emptyTitle')}
          description={t('exercises.emptyDescription')}
        />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isFavourite = favourites.has(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isArabic ? item.name_ar : item.name_en}
                onPress={() => router.push(`/exercises/${item.id}`)}
                style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
              >
                <Card>
                  <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ flex: 1, gap: spacing.xxs }}>
                      <Text variant="bodyStrong">{isArabic ? item.name_ar : item.name_en}</Text>
                      <View style={{ flexDirection: rowDirection, gap: spacing.xs, flexWrap: 'wrap' }}>
                        <Badge label={t(muscleLabelKey(item.primary_muscle))} tone="neutral" />
                        <Badge label={t(`exercises.equipment.${item.equipment}`)} tone="neutral" />
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(isFavourite ? 'exercises.removeFavourite' : 'exercises.addFavourite')}
                      hitSlop={12}
                      onPress={() => void toggleFavourite(item.id)}
                    >
                      <Text variant="title" color={isFavourite ? 'accent' : 'textSecondary'}>
                        {isFavourite ? '★' : '☆'}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
