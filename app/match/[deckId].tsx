import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMatchPairs } from '@/hooks/useMatchPairs';
import { MatchPairs } from '@/components/quiz/MatchPairs';

export default function MatchSessionScreen() {
  const { deckId, count } = useLocalSearchParams<{
    deckId: string;
    count: string;
  }>();
  const router = useRouter();

  const match = useMatchPairs({
    deckId,
    pairCount: parseInt(count ?? '5', 10),
  });

  if (match.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ title: 'Đang tải' }} />
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (match.status === 'insufficient') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: 'Không đủ thẻ' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">📭</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Không đủ thẻ
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            Cần ít nhất 4 thẻ trong bộ này để ghép cặp.
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

  if (match.status === 'finished' && match.result) {
    const { totalPairs, wrongAttempts, totalTimeMs, accuracy } = match.result;
    const accuracyPercent = Math.round(accuracy * 100);
    const seconds = Math.round(totalTimeMs / 1000);

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: 'Hoàn thành' }} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="items-center mt-4 mb-6">
            <Text className="text-7xl mb-3">
              {wrongAttempts === 0
                ? '🏆'
                : accuracyPercent >= 70
                  ? '🎯'
                  : '💪'}
            </Text>
            <Text className="text-2xl font-bold text-gray-900">
              {wrongAttempts === 0 ? 'Hoàn hảo!' : 'Hoàn thành!'}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              {totalPairs} cặp đã ghép
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">
            <ResultRow
              label="Số cặp"
              value={String(totalPairs)}
              icon="git-compare"
              color="#8b5cf6"
            />
            <ResultRow
              label="Lần sai"
              value={String(wrongAttempts)}
              icon="close-circle"
              color={wrongAttempts === 0 ? '#10b981' : '#ef4444'}
            />
            <ResultRow
              label="Độ chính xác"
              value={`${accuracyPercent}%`}
              icon="trending-up"
              color="#6366f1"
            />
            <ResultRow
              label="Thời gian"
              value={`${seconds}s`}
              icon="time"
              color="#f59e0b"
              isLast
            />
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 bg-gray-200 py-3 rounded-2xl active:bg-gray-300"
            >
              <Text className="text-gray-900 font-semibold text-center">
                Xong
              </Text>
            </Pressable>
            <Pressable
              onPress={() => match.restart()}
              className="flex-1 bg-primary-600 py-3 rounded-2xl active:bg-primary-700"
            >
              <Text className="text-white font-semibold text-center">
                Chơi lại
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ACTIVE
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Ghép cặp' }} />
      <MatchPairs
        tiles={match.tiles}
        selectedLeftId={match.selectedLeftId}
        selectedRightId={match.selectedRightId}
        wrongPair={match.wrongPair}
        matchedCount={match.matchedCount}
        totalPairs={match.totalPairs}
        wrongAttempts={match.wrongAttempts}
        onSelectTile={match.selectTile}
      />
    </SafeAreaView>
  );
}

function ResultRow({
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
