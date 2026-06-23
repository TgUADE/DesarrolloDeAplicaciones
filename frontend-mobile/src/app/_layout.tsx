import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

function useIncomingUrl() {
  const router = useRouter();

  useEffect(() => {
    function handle(url: string) {
      const parsed = Linking.parse(url);
      // exp://IP:PORT/--/register-credentials  →  path = '--/register-credentials'
      const path = (parsed.path ?? '').replace(/^-+\//, '');
      const token = parsed.queryParams?.token;
      if (path === 'register-credentials' && token) {
        router.push({ pathname: '/register-credentials', params: { token: String(token) } });
      }
    }

    // Captura URL cuando la app ya está corriendo (hot start)
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [router]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useIncomingUrl();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Brand.pageBg },
          }}
        />
        <StatusBar style="dark" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
