import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCards } from '@/hooks/useCards';
import { getDeckById, getDueCountForDeck } from '@/db/queries';
import type { Deck } from '@/types';
import { CardListItem } from '@/components/flashcard/CardListItem';
import { AddCardModal } from '@/components/flashcard/AddCardModal';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cards, isLoading, error, refresh, create, remove } = useCards(id);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh deck info + due count.
  // Phải tách thành function riêng để gọi được sau mỗi mutation
  // (vì useFocusEffect KHÔNG fire khi mutation trong cùng screen).
  const refreshMeta = useCallback(async () => {
    const [deckData, counts] = await Promise.all([
      getDeckById(id),
      getDueCountForDeck(id),
    ]);
    setDeck(deckData);
    setDueCount(counts.total);
  }, [id]);

  // Load mỗi khi screen focus (vào lần đầu hoặc quay lại từ screen khác)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          await refreshMeta();
        } catch {
          // ignore
        }
      })();
      return () => {
        cancelled = true;
        void cancelled; // suppress unused
      };
    }, [refreshMeta])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    await refreshMeta();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-base text-gray-700 mt-4 text-center">
          Không thể tải thẻ
        </Text>
        <Text className="text-xs text-gray-500 mt-2 text-center">
          {error.message}
        </Text>
      </SafeAreaView>
    );
  }

  const fabSize = 56;
  const fabBottomMargin = 16;
  const listBottomPadding = fabSize + fabBottomMargin * 2 + insets.bottom;
  const canStudy = dueCount > 0;

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: deck?.name ?? 'Bộ thẻ' }} />

      {/* Study CTA bar */}
      {cards.length > 0 ? (
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <Pressable
            onPress={() => router.push(`/study/${id}`)}
            disabled={!canStudy}
            className={`flex-row items-center justify-center py-3 rounded-2xl ${
              canStudy
                ? 'bg-primary-600 active:bg-primary-700'
                : 'bg-gray-200'
            }`}
          >
            <Ionicons
              name="school"
              size={20}
              color={canStudy ? '#fff' : '#9ca3af'}
            />
            <Text
              className={`ml-2 font-semibold text-base ${
                canStudy ? 'text-white' : 'text-gray-500'
              }`}
            >
              {canStudy
                ? `Học ngay (${dueCount} thẻ)`
                : 'Đã hoàn thành hôm nay'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState onAddPress={() => setShowAddModal(true)} />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: listBottomPadding,
          }}
          ListHeaderComponent={
            <View className="mb-4">
              <Text className="text-sm text-gray-600">
                {cards.length} thẻ trong bộ này
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <CardListItem
              card={item}
              onDelete={async () => {
                await remove(item.id);
                await refreshMeta();
              }}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => setShowAddModal(true)}
        style={{
          position: 'absolute',
          right: 16,
          bottom: fabBottomMargin + insets.bottom,
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          backgroundColor: '#6366f1',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <AddCardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (data) => {
          await create(data);
          await refreshMeta();
        }}
      />
    </View>
  );
}

function EmptyState({ onAddPress }: { onAddPress: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-6xl mb-4">📝</Text>
      <Text className="text-xl font-semibold text-gray-900 mb-2">
        Chưa có thẻ nào
      </Text>
      <Text className="text-base text-gray-600 text-center mb-6">
        Thêm từ vựng đầu tiên vào bộ thẻ này
      </Text>
      <Pressable
        onPress={onAddPress}
        className="bg-primary-600 px-6 py-3 rounded-full active:bg-primary-700"
      >
        <Text className="text-white font-semibold">Thêm thẻ mới</Text>
      </Pressable>
    </View>
  );
}