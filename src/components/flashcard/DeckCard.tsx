import { Pressable, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Deck } from '@/types';

interface DeckCardProps {
  deck: Deck;
  onPress: () => void;
  onDelete: () => void;
}

/**
 * Card hiển thị thông tin 1 deck trong list.
 * Tap để mở chi tiết, nút xóa với confirm dialog.
 */
export function DeckCard({ deck, onPress, onDelete }: DeckCardProps) {
  const handleDelete = () => {
    Alert.alert(
      'Xóa bộ thẻ?',
      `"${deck.name}" và toàn bộ thẻ trong đó sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 active:bg-gray-50"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {deck.name}
          </Text>
          {deck.description && (
            <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
              {deck.description}
            </Text>
          )}
          <View className="flex-row items-center">
            <Ionicons name="albums-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {deck.cardCount} thẻ
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleDelete}
          hitSlop={10}
          className="p-2 active:opacity-50"
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>
    </Pressable>
  );
}