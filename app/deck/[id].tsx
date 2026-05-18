import { useEffect, useState } from 'react';
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
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCards } from '@/hooks/useCards';
import { getDeckById } from '@/db/queries';
import type { Deck } from '@/types';
import { CardListItem } from '@/components/flashcard/CardListItem';
import { AddCardModal } from '@/components/flashcard/AddCardModal';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { cards, isLoading, error, refresh, create, remove } = useCards(id);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    getDeckById(id).then(setDeck);
  }, [id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
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

  // Padding bottom cho FlatList = chiều cao FAB (56) + khoảng cách trên FAB (24)
  // + safe area inset (system navigation bar)
  const fabSize = 56;
  const fabBottomMargin = 16;
  const listBottomPadding = fabSize + fabBottomMargin * 2 + insets.bottom;

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: deck?.name ?? 'Bộ thẻ' }} />

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
            <CardListItem card={item} onDelete={() => remove(item.id)} />
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