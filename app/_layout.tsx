import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal';
import { colors } from '@/src/design-system';
import { ErrorBoundary } from '@/src/lib/ErrorBoundary';
import { bootstrapI18n } from '@/src/lib/i18n';
import { useAuthGate } from '@/src/features/auth/useAuthGate';

SplashScreen.preventAutoHideAsync().catch(() => {
  // لا شيء نفعله لو فشل — بعض بيئات التشغيل (Web) لا تدعمه.
});

export default function RootLayout() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    // يحدّد اللغة (محفوظة أو لغة الجهاز) ويتأكد أن اتجاه النظام يطابقها —
    // لو تطلّب الأمر إعادة تشغيل (تغيّر الاتجاه) لا نعرض شيئًا بعدها.
    bootstrapI18n().then((didRestart) => {
      if (didRestart) {
        setIsRestarting(true);
      } else {
        setIsI18nReady(true);
      }
    });
  }, []);

  const { isReady: isAuthReady } = useAuthGate();

  useEffect(() => {
    if ((fontsLoaded || fontsError) && !isRestarting && isI18nReady && isAuthReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, isRestarting, isI18nReady, isAuthReady]);

  if (isRestarting || !isI18nReady || (!fontsLoaded && !fontsError) || !isAuthReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="quick-add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log/water" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log/weight" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log/steps" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log/nutrition" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log/workout" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log/sleep" options={{ presentation: 'modal' }} />
            <Stack.Screen name="teams/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="teams/join" options={{ presentation: 'modal' }} />
            <Stack.Screen name="teams/new-challenge" options={{ presentation: 'modal' }} />
            <Stack.Screen name="accountability/index" />
            <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
