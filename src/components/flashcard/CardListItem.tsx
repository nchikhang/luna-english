import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Card } from '@/types';
import { speak } from '@/services/speech';

interface CardListItemProps {
  card: Card;
  onDelete: () => void;
}

/**
 * Hiển thị 1 card trong list cards.
 * Tap loa để phát âm. Tap thùng rác để xóa.
 */
export function CardListItem({ card, onDelete }: CardListItemProps) {
  const handleSpeak = () => {
    speak(card.word);
  };

  const handleDelete = () => {
    Alert.alert('Xóa thẻ?', `"${card.word}" sẽ bị xóa khỏi bộ thẻ.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <Text className="text-lg font-semibold text-gray-900">
              {card.word}
            </Text>
            {card.pronunciation ? (
              <Text className="text-sm text-gray-500 ml-2">
                {card.pronunciation}
              </Text>
            ) : null}
          </View>
          <Text className="text-base text-gray-700" numberOfLines={2}>
            {card.meaning}
          </Text>
          {card.exampleSentence ? (
            <Text
              className="text-sm text-gray-500 italic mt-2"
              numberOfLines={2}
            >
              {card.exampleSentence}
            </Text>
          ) : null}
        </View>

        <View className="flex-col gap-2">
          <Pressable
            onPress={handleSpeak}
            hitSlop={10}
            className="p-2 bg-primary-50 rounded-full active:bg-primary-100"
          >
            <Ionicons name="volume-high" size={18} color="#6366f1" />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            hitSlop={10}
            className="p-2 active:opacity-50"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}