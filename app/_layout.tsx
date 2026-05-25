import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { initDatabase } from '@/db/schema';
import { runFullSync } from '@/services/sync';
import '../global.css';
import { useStatsStore } from '@/stores/statsStore';

/**
 * Root layout với auth gate.
 *
 * Architecture:
 * - RootLayout chỉ render <Slot/> ban đầu — đây là navigator outlet.
 *   Slot mount xong navigator NGAY ở render đầu tiên (khác với Stack
 *   được nested trong wrapper component, mount sau).
 * - Khi navigator đã mount, ta render Stack thật để declare các routes.
 * - Auth gate (redirect login/tabs) chỉ chạy SAU khi navigator mount.
 *
 * Tại sao không bọc <Stack> trong <Bootstrapper>?
 *   Vì useEffect trong Bootstrapper chạy TRƯỚC khi Stack mount xong
 *   → router.replace() fail với "Attempted to navigate before mounting".
 *   Pattern này tách auth gate ra component riêng, chỉ render khi
 *   navigator đã ready.
 */
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  // Init DB ngay khi root mount (chỉ 1 lần)
  useEffect(() => {
    initDatabase()
      .catch((err) => console.error('[DB] Init failed:', err))
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="deck/[id]"
          options={{ presentation: 'card', headerShown: true, title: 'Deck' }}
        />
        <Stack.Screen name="study/[deckId]" options={{ headerShown: true, title: 'Học bài' }} />
        <Stack.Screen name="quiz/[deckId]" options={{ headerShown: true, title: 'Quiz' }} />
        <Stack.Screen name="match/[deckId]" options={{ headerShown: true, title: 'Ghép cặp' }} />
        <Stack.Screen name="lesson/[lessonId]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="exam/[id]/index" options={{ headerShown: true, title: 'Chi tiết đề thi' }} />
        <Stack.Screen name="exam/[id]/play" options={{ headerShown: true, title: 'Làm bài' }} />
        <Stack.Screen name="exam/[id]/result/[attemptId]" options={{ headerShown: true, title: 'Kết quả' }} />
        <Stack.Screen name="admin/upload-exam" options={{ headerShown: true, title: 'Upload đề thi' }} />
        <Stack.Screen name="admin/review-exam" options={{ headerShown: true, title: 'Review đề' }} />
        <Stack.Screen name="admin/exam-list" options={{ headerShown: true, title: 'Quản lý đề thi' }} />
      </Stack>
      <AuthGate />
    </SafeAreaProvider>
  );
}

/**
 * AuthGate render null (không có UI) — chỉ chạy logic redirect.
 * Vì nó là sibling của Stack (không phải parent), useEffect của nó
 * chạy SAU khi Stack đã mount xong.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadStats = useStatsStore((s) => s.load);
  const resetStats = useStatsStore((s) => s.reset);

  // Auth redirect
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const firstSegment = segments[0] as string | undefined;
    const inAppGroup =
      firstSegment === '(tabs)' ||
      ['deck', 'study', 'quiz', 'match'].includes(firstSegment ?? '');

    if (!isAuthenticated && inAppGroup) {
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && (inAuthGroup || (segments as string[]).length === 0)) {
      router.replace('/(tabs)/learn' as any);
    }
  }, [isHydrated, isAuthenticated, segments, router]);

  // Auto sync khi foreground (sau 30s background mới trigger)
  useEffect(() => {
    if (!isAuthenticated || !isHydrated) return;

    let lastBackground = Date.now();

    const handleChange = (state: AppStateStatus) => {
      if (state === 'background') {
        lastBackground = Date.now();
      } else if (state === 'active') {
        const elapsed = Date.now() - lastBackground;
        if (elapsed > 30_000) {
          runFullSync().catch((err) => {
            console.warn('[Sync] Foreground sync failed:', err.message);
          });
        }
      }
    };

    const sub = AppState.addEventListener('change', handleChange);

    // Initial sync khi vừa auth
    runFullSync().catch((err) => {
      console.warn('[Sync] Initial sync failed:', err.message);
    });

    return () => sub.remove();
  }, [isAuthenticated, isHydrated]);

  // === useEffect 3: load/reset stats khi auth changes (PHASE G1.A) ===
  useEffect(() => {
    if (!isAuthenticated) {
      resetStats();
      return;
    }
    loadStats();
  }, [isAuthenticated, loadStats, resetStats]);

  return null;
}