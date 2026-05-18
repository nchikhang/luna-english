import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Card } from '@/types';
import { speak } from '@/services/speech';

interface FlashcardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
}

/**
 * Flashcard với hiệu ứng 3D flip qua trục Y.
 *
 * Cách hoạt động:
 * - Shared value `flip` chạy từ 0 → 1 khi flip
 * - Mặt trước (front) xoay từ 0deg → 180deg
 * - Mặt sau (back) xoay từ 180deg → 360deg (luôn lệch 180deg)
 * - Khi rotateY ở 90deg, mặt đang đối diện camera "biến mất"
 *   → cảm giác như đang lật thật
 * - backfaceVisibility: 'hidden' ẩn mặt sau của Text khi xoay qua
 */
export function Flashcard({ card, isFlipped, onFlip }: FlashcardProps) {
  const flip = useSharedValue(0);

  // Animate khi isFlipped thay đổi
  useEffect(() => {
    flip.value = withTiming(isFlipped ? 1 : 0, {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isFlipped, flip]);

  // Reset khi card đổi (sang card mới)
  useEffect(() => {
    flip.value = 0;
  }, [card.id, flip]);

  // Animated style cho mặt trước
  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  // Animated style cho mặt sau (lệch 180deg)
  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const handleSpeak = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    speak(card.word);
  };

  return (
    <Pressable
      onPress={onFlip}
      className="flex-1 items-center justify-center"
    >
      <View className="w-full aspect-[3/4] max-w-sm">
        {/* Mặt trước: từ tiếng Anh */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
            },
            frontStyle,
          ]}
          className="bg-white rounded-3xl border border-gray-200 items-center justify-center p-8"
        >
          <Text className="text-xs font-semibold text-primary-600 uppercase mb-4">
            Mặt trước
          </Text>
          <Text className="text-4xl font-bold text-gray-900 text-center mb-3">
            {card.word}
          </Text>
          {card.pronunciation ? (
            <Text className="text-base text-gray-500 mb-6">
              {card.pronunciation}
            </Text>
          ) : null}
          <Pressable
            onPress={handleSpeak}
            hitSlop={12}
            className="p-3 bg-primary-50 rounded-full active:bg-primary-100"
          >
            <Ionicons name="volume-high" size={28} color="#6366f1" />
          </Pressable>
          <Text className="text-xs text-gray-400 mt-8">
            Tap để xem nghĩa
          </Text>
        </Animated.View>

        {/* Mặt sau: nghĩa + ví dụ */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
            },
            backStyle,
          ]}
          className="bg-primary-50 rounded-3xl border border-primary-200 p-8 justify-center"
        >
          <Text className="text-xs font-semibold text-primary-700 uppercase mb-3">
            Mặt sau
          </Text>
          <Text className="text-2xl font-semibold text-gray-900 mb-4">
            {card.word}
          </Text>
          <View className="border-t border-primary-200 pt-4 mb-4">
            <Text className="text-xs font-semibold text-primary-700 uppercase mb-2">
              Nghĩa
            </Text>
            <Text className="text-base text-gray-800">{card.meaning}</Text>
          </View>
          {card.exampleSentence ? (
            <View className="border-t border-primary-200 pt-4">
              <Text className="text-xs font-semibold text-primary-700 uppercase mb-2">
                Ví dụ
              </Text>
              <Text className="text-sm text-gray-700 italic">
                "{card.exampleSentence}"
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}