import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// SDK 57: استيراد Tabs من 'expo-router' مهجور صراحةً — نقطة الدخول
// الصحيحة الآن هي 'expo-router/js-tabs' (نفس المكوّن ونفس الواجهة).
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation } from '@/src/design-system';
import { radius, spacing } from '@/src/design-system/spacing';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Ionicons name={name} size={24} color={focused ? colors.primary : colors.textSecondary} />;
}

/** زر "+" الأوسط — لا يفتح تبويبًا، بل يفتح شاشة الإضافة السريعة كـ Modal. */
function QuickAddButton() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.quickAddSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quickAdd.title')}
        style={({ pressed }) => [styles.quickAddButton, pressed && styles.quickAddPressed]}
        onPress={() => router.push('/quick-add')}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  // ارتفاع ثابت يقصّ شريط التبويبات فوق مؤشر الهوم على أجهزة iPhone الحديثة —
  // نضيف المنطقة الآمنة السفلية بدل قيمة صلبة واحدة لكل الأجهزة.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom + spacing.xxs }],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.today'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sunny' : 'sunny-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('nav.nutrition'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'restaurant' : 'restaurant-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => <QuickAddButton />,
        }}
        listeners={{
          tabPress: (e) => e.preventDefault(),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('nav.progress'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'trending-up' : 'trending-up-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    paddingTop: spacing.xs,
    ...elevation.bar,
  },
  tabBarLabel: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 11,
  },
  quickAddSlot: {
    flex: 1,
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddButton: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  quickAddPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
