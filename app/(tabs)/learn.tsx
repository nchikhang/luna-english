import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllDecks, getDueCountForDeck } from '@/db/queries';
import type { Deck } from '@/types';

interface DeckWithDueCount {
  deck: Deck;
  reviewDue: number;
  newCards: number;
  total: number;
}

export default function LearnScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DeckWithDueCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const decks = await getAllDecks();
      const withCounts = await Promise.all(
        decks.map(async (deck) => {
          const counts = await getDueCountForDeck(deck.id);
          return { deck, ...counts };
        })
      );
      setItems(withCounts);
    } catch (err) {
      console.error('Load learn data failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload mỗi khi tab được focus (sau khi học xong và quay lại)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const totalDue = items.reduce((sum, it) => sum + it.total, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
      >
        <View className="bg-primary-600 rounded-3xl p-6 mb-6">
          <Text className="text-white text-sm opacity-90 mb-1">
            Học từ vựng hôm nay
          </Text>
          <Text className="text-white text-4xl font-bold">{totalDue}</Text>
          <Text className="text-white text-sm opacity-90 mt-1">
            thẻ cần ôn tập
          </Text>
        </View>

        {items.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-5xl mb-4">📚</Text>
            <Text className="text-base text-gray-600 text-center">
              Chưa có bộ thẻ nào.{'\n'}Vào tab Flashcards tạo bộ đầu tiên.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <DeckLearnCard
              key={item.deck.id}
              item={item}
              onPress={() => router.push(`/study/${item.deck.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeckLearnCard({
  item,
  onPress,
}: {
  item: DeckWithDueCount;
  onPress: () => void;
}) {
  const { deck, reviewDue, newCards, total } = item;
  const hasCards = total > 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!hasCards}
      className={`bg-white rounded-2xl p-4 mb-3 border border-gray-200 ${
        hasCards ? 'active:bg-gray-50' : 'opacity-60'
      }`}
    >
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        {deck.name}
      </Text>

      <View className="flex-row gap-4 mb-3">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
          <Text className="text-sm text-gray-600">{newCards} mới</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          <Text className="text-sm text-gray-600">{reviewDue} ôn tập</Text>
        </View>
      </View>

      {hasCards ? (
        <View className="flex-row items-center justify-between bg-primary-50 px-4 py-2.5 rounded-xl">
          <Text className="text-sm font-semibold text-primary-700">
            Bắt đầu học ({total} thẻ)
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#6366f1" />
        </View>
      ) : (
        <Text className="text-sm text-gray-500 italic">
          Đã hoàn thành hôm nay
        </Text>
      )}
    </Pressable>
  );
}