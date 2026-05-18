import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllDecks } from '@/db/queries';
import type { Deck } from '@/types';
import type { QuizMode } from '@/lib/quiz';

interface ModeOption {
  mode: QuizMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  available: boolean;
}

const MODES: ModeOption[] = [
  {
    mode: 'multiple-choice',
    label: 'Trắc nghiệm',
    description: '4 đáp án, chọn 1',
    icon: 'list',
    color: '#6366f1',
    available: true,
  },
  {
    mode: 'type-answer',
    label: 'Gõ đáp án',
    description: 'Nhập từ tiếng Anh',
    icon: 'create',
    color: '#10b981',
    available: true,
  },
  {
    mode: 'listen-choose',
    label: 'Nghe và chọn',
    description: 'Nghe phát âm, chọn từ',
    icon: 'headset',
    color: '#f59e0b',
    available: true,
  },
  {
    mode: 'match-pairs',
    label: 'Ghép cặp',
    description: 'Nối từ với nghĩa',
    icon: 'git-compare',
    color: '#8b5cf6',
    available: false,
  },
];

const COUNT_OPTIONS = [5, 10, 20];

export default function QuizScreen() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizMode>('multiple-choice');
  const [selectedCount, setSelectedCount] = useState<number>(10);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllDecks().then((data) => {
        if (cancelled) return;
        setDecks(data);
        if (data.length > 0 && !selectedDeck) {
          const firstWithCards = data.find((d) => d.cardCount >= 4);
          if (firstWithCards) setSelectedDeck(firstWithCards.id);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [selectedDeck])
  );

  const handleStart = () => {
    if (!selectedDeck) return;
    router.push(
      `/quiz/${selectedDeck}?mode=${selectedMode}&count=${selectedCount}`
    );
  };

  const canStart =
    selectedDeck !== null &&
    MODES.find((m) => m.mode === selectedMode)?.available === true;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Kiểm tra kiến thức
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          Test nhanh từ vựng, không ảnh hưởng lịch học
        </Text>

        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Bộ thẻ
        </Text>
        {decks.length === 0 ? (
          <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
            <Text className="text-base text-gray-500 text-center">
              Chưa có bộ thẻ nào
            </Text>
          </View>
        ) : (
          <View className="gap-2 mb-6">
            {decks.map((deck) => {
              const isSelected = deck.id === selectedDeck;
              const hasEnough = deck.cardCount >= 4;
              return (
                <Pressable
                  key={deck.id}
                  onPress={() => hasEnough && setSelectedDeck(deck.id)}
                  disabled={!hasEnough}
                  className={`flex-row items-center p-4 rounded-2xl border-2 ${
                    isSelected
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-white border-gray-200'
                  } ${!hasEnough ? 'opacity-50' : ''}`}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-base font-medium ${
                        isSelected ? 'text-primary-900' : 'text-gray-900'
                      }`}
                    >
                      {deck.name}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {deck.cardCount} thẻ
                      {!hasEnough ? ' (cần ít nhất 4)' : ''}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color="#6366f1" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Dạng kiểm tra
        </Text>
        <View className="gap-2 mb-6">
          {MODES.map((opt) => {
            const isSelected = opt.mode === selectedMode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => opt.available && setSelectedMode(opt.mode)}
                disabled={!opt.available}
                className={`flex-row items-center p-4 rounded-2xl border-2 ${
                  isSelected && opt.available
                    ? 'border-primary-500 bg-primary-50'
                    : 'bg-white border-gray-200'
                } ${!opt.available ? 'opacity-40' : ''}`}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${opt.color}20` }}
                >
                  <Ionicons name={opt.icon} size={20} color={opt.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {opt.label}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {opt.available ? opt.description : 'Sắp ra mắt'}
                  </Text>
                </View>
                {isSelected && opt.available ? (
                  <Ionicons name="checkmark-circle" size={22} color="#6366f1" />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Số câu
        </Text>
        <View className="flex-row gap-2 mb-8">
          {COUNT_OPTIONS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setSelectedCount(c)}
              className={`flex-1 py-3 rounded-2xl border-2 ${
                selectedCount === c
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  selectedCount === c ? 'text-primary-700' : 'text-gray-700'
                }`}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleStart}
          disabled={!canStart}
          className={`py-4 rounded-2xl ${
            canStart
              ? 'bg-primary-600 active:bg-primary-700'
              : 'bg-gray-300'
          }`}
        >
          <Text className="text-white font-semibold text-center text-base">
            Bắt đầu kiểm tra
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}