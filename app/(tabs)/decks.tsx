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
import { useFocusEffect, useRouter } from 'expo-router';
import { useDecks } from '@/hooks/useDecks';
import { DeckCard } from '@/components/flashcard/DeckCard';
import { CreateDeckModal } from '@/components/flashcard/CreateDeckModal';

export default function DecksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { decks, isLoading, error, refresh, create, remove } = useDecks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Re-fetch decks mỗi khi user quay lại tab (từ deck detail, etc.)
  // Để cardCount của các decks luôn fresh sau khi user thêm/xóa cards.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  
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
          Không thể tải bộ thẻ
        </Text>
        <Text className="text-xs text-gray-500 mt-2 text-center">
          {error.message}
        </Text>
      </SafeAreaView>
    );
  }

  // Trong tab navigator, tab bar đã được tính sẵn safe area inset
  // nhưng FAB position absolute không biết về tab bar
  // → cần padding để FAB không đè lên tab bar
  const fabSize = 56;
  const fabBottomMargin = 16;
  const listBottomPadding = fabSize + fabBottomMargin * 2;

  return (
    <View className="flex-1 bg-gray-50">
      {decks.length === 0 ? (
        <EmptyState onCreatePress={() => setShowCreateModal(true)} />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: listBottomPadding,
          }}
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

      <Pressable
        onPress={() => setShowCreateModal(true)}
        style={{
          position: 'absolute',
          right: 16,
          bottom: fabBottomMargin,
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

      <CreateDeckModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          await create(data);
        }}
      />
    </View>
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