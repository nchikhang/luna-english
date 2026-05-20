import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import type { VocabularyContent } from '@/services/api/lessons';

/**
 * VocabularyCard — exercise type 'vocabulary'.
 * Không có "đúng/sai" — đây chỉ là intro từ mới. User đọc + tap Next.
 * `correct` luôn = true khi submit.
 */
interface Props {
  content: VocabularyContent;
  onNext: () => void;
}

export function VocabularyCard({ content, onNext }: Props) {
  const speak = () => {
    Speech.stop();
    Speech.speak(content.word, { language: 'en-US' });
  };

  return (
    <View className="flex-1 px-6">
      <View className="bg-white rounded-3xl p-6 items-center" style={{ marginTop: 20 }}>
        {content.imageEmoji && (
          <Text style={{ fontSize: 80, marginBottom: 12 }}>{content.imageEmoji}</Text>
        )}

        <View className="flex-row items-center mb-2">
          <Text className="text-4xl font-bold text-gray-900">{content.word}</Text>
          <Pressable onPress={speak} className="ml-3 p-2">
            <Ionicons name="volume-high" size={28} color="#6366f1" />
          </Pressable>
        </View>

        {content.pronunciation && (
          <Text className="text-base text-gray-500 mb-4">{content.pronunciation}</Text>
        )}

        <View className="w-full h-px bg-gray-200 my-4" />

        <Text className="text-2xl text-indigo-600 font-semibold mb-3">{content.meaning}</Text>

        {content.exampleSentence && (
          <View className="w-full mt-4 bg-indigo-50 rounded-2xl p-4">
            <Text className="text-base text-gray-800 italic">"{content.exampleSentence}"</Text>
            {content.exampleTranslation && (
              <Text className="text-sm text-gray-600 mt-1">{content.exampleTranslation}</Text>
            )}
          </View>
        )}
      </View>

      <Pressable
        onPress={onNext}
        className="bg-indigo-600 rounded-2xl py-4 mt-6 items-center"
      >
        <Text className="text-white font-bold text-base">Tôi đã hiểu →</Text>
      </Pressable>
    </View>
  );
}
