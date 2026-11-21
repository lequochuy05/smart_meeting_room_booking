import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureAuthTransport, useAuth } from '@/features/auth/hooks/useAuth';
import { queryClient } from '@/shared/api/queryClient';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Wire SecureStore-backed credentials into the transport before any request is made.
configureAuthTransport();

export default function RootLayout() {
  const status = useAuth((state) => state.status);
  const hydrate = useAuth((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [status]);

  const authenticated = status === 'authenticated';

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Protected guard={!authenticated}>
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={authenticated}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="room/[roomId]" options={{ title: 'Room' }} />
            <Stack.Screen name="booking/[roomId]" options={{ title: 'Book a room', presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
