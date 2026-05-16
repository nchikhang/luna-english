import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '@/db/schema';
import '../global.css';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Database init failed:', err);
        setIsReady(true); // fail open để user vẫn vào được app
      });
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-primary-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Luna English' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="deck/[id]" options={{ title: 'Deck' }} />
      </Stack>
    </>
  );
}
