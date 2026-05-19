import { useEffect, useState } from 'react';
import { useStatsStore } from '@/stores/statsStore';
import { XpToast, LevelUpToast } from '@/components/XpToast';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStudySession } from '@/hooks/useStudySession';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { RatingButtons } from '@/components/flashcard/RatingButtons';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { speak, stopSpeaking } from '@/services/speech';
import { success } from '@/services/haptics';
import type { ReviewRating } from '@/types';

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useStudySession(deckId);
  const [isFlipped, setIsFlipped] = useState(false);
  const [xpToast, setXpToast] = useState<{ points: number; key: number } | null>(null);
  const bumpXp = useStatsStore((s) => s.bumpXp);

  useEffect(() => {
    if (session.currentCard && session.status === 'active') {
    const timer = setTimeout(() => {
      speak(session.currentCard!.word);
    }, 300);
    return () => {
      clearTimeout(timer);
      stopSpeaking();  // ← thêm dòng này
    };
  }
  }, [session.currentCard?.id, session.status]);

  // Haptic success khi hoàn thành session
  useEffect(() => {
    if (session.status === 'finished') {
      success();
    }
  }, [session.status]);

  const handleRate = async (rating: ReviewRating) => {
    await session.submitRating(rating);
    setIsFlipped(false);

    // Phase G1.A: optimistic XP feedback
    // (Server sẽ award đúng + chính xác qua sync push sau)
    const xpEarned = rating >= 3 ? 10 : 3;
    bumpXp(xpEarned);
    setXpToast({ points: xpEarned, key: Date.now() });
  };

  if (session.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ title: 'Đang tải' }} />
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (session.status === 'empty') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: 'Học' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Không có thẻ cần học
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            Bạn đã hoàn thành các thẻ hôm nay, hoặc bộ thẻ này chưa có thẻ nào.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-primary-600 px-6 py-3 rounded-full active:bg-primary-700"
          >
            <Text className="text-white font-semibold">Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (session.status === 'finished') {
    const accuracyPercent = Math.round(session.stats.accuracy * 100);
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: 'Hoàn thành' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-7xl mb-4">🏆</Text>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Hoàn thành!
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            Bạn đã học xong {session.stats.totalCards} thẻ
          </Text>

          <View className="bg-white rounded-2xl p-6 w-full max-w-sm mb-8 border border-gray-200">
            <StatRow
              label="Thẻ đã học"
              value={String(session.stats.completed)}
              icon="checkmark-circle"
              color="#10b981"
            />
            <StatRow
              label="Lần quên"
              value={String(session.stats.again)}
              icon="refresh-circle"
              color="#ef4444"
            />
            <StatRow
              label="Độ chính xác"
              value={`${accuracyPercent}%`}
              icon="trending-up"
              color="#6366f1"
              isLast
            />
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="bg-gray-200 px-6 py-3 rounded-full active:bg-gray-300"
            >
              <Text className="text-gray-900 font-semibold">Xong</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsFlipped(false);
                session.restart();
              }}
              className="bg-primary-600 px-6 py-3 rounded-full active:bg-primary-700"
            >
              <Text className="text-white font-semibold">Học tiếp</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Học từ vựng' }} />

      <View className="px-4 pt-4">
        <ProgressBar
          current={session.stats.completed}
          total={session.stats.totalCards}
        />
      </View>

      <View className="flex-1 px-4 py-6">
        {session.currentCard ? (
          <Flashcard
            card={session.currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((prev) => !prev)}
          />
        ) : null}
      </View>

      <View className="px-4" style={{ paddingBottom: 16 + insets.bottom }}>
        {isFlipped ? (
          <RatingButtons
            onRate={handleRate}
            disabled={session.isSubmitting}
          />
        ) : (
          <View className="py-3 items-center">
            <Text className="text-sm text-gray-500">
              Tap thẻ để xem nghĩa
            </Text>
          </View>
        )}
      </View>
      {xpToast && (
        <XpToast
          key={xpToast.key}
          points={xpToast.points}
          onDone={() => setXpToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

function StatRow({
  label,
  value,
  icon,
  color,
  isLast,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        isLast ? '' : 'border-b border-gray-100'
      }`}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color={color} />
        <Text className="text-base text-gray-700 ml-3">{label}</Text>
      </View>
      <Text className="text-lg font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}