import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDecks } from '@/hooks/useDecks';
import { DeckCard } from '@/components/flashcard/DeckCard';
import { CreateDeckModal } from '@/components/flashcard/CreateDeckModal';

export default function DecksScreen() {
  const router = useRouter();
  const { decks, isLoading, error, refresh, create, remove } = useDecks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Loading state ban đầu
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-base text-gray-700 mt-4 text-center">
          Không thể tải bộ thẻ
        </Text>
        <Text className="text-xs text-gray-500 mt-2 text-center">
          {error.message}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      {decks.length === 0 ? (
        <EmptyState onCreatePress={() => setShowCreateModal(true)} />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-24"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              onPress={() => router.push(`/deck/${item.id}`)}
              onDelete={() => remove(item.id)}
            />
          )}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => setShowCreateModal(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg active:bg-primary-700"
        style={{
          elevation: 6, // Android shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <CreateDeckModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          await create(data);
        }}
      />
    </SafeAreaView>
  );
}

function EmptyState({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-6xl mb-4">📚</Text>
      <Text className="text-xl font-semibold text-gray-900 mb-2">
        Chưa có bộ thẻ nào
      </Text>
      <Text className="text-base text-gray-600 text-center mb-6">
        Tạo bộ thẻ đầu tiên để bắt đầu học từ vựng
      </Text>
      <Pressable
        onPress={onCreatePress}
        className="bg-primary-600 px-6 py-3 rounded-full active:bg-primary-700"
      >
        <Text className="text-white font-semibold">Tạo bộ thẻ mới</Text>
      </Pressable>
    </View>
  );
}