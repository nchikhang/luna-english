import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuiz } from '@/hooks/useQuiz';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MultipleChoice } from '@/components/quiz/MultipleChoice';
import type { QuizMode } from '@/lib/quiz';

export default function QuizSessionScreen() {
  const { deckId, mode, count } = useLocalSearchParams<{
    deckId: string;
    mode: QuizMode;
    count: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const quiz = useQuiz({
    deckId,
    mode,
    count: parseInt(count ?? '10', 10),
  });

  if (quiz.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ title: 'Đang tải' }} />
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (quiz.status === 'insufficient') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: 'Không đủ thẻ' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">📭</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Không đủ thẻ
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            Cần ít nhất 4 thẻ trong bộ này để làm quiz. Hãy thêm thẻ trước.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-primary-600 px-6 py-3 rounded-full active:bg-primary-700"
          >
            <Text className="text-white font-semibold">Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (quiz.status === 'finished' && quiz.result) {
    const { total, correct, incorrect, accuracy, totalTimeMs } = quiz.result;
    const accuracyPercent = Math.round(accuracy * 100);
    const avgSeconds = Math.round(totalTimeMs / total / 1000);

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: 'Kết quả' }} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="items-center mt-4 mb-6">
            <Text className="text-7xl mb-3">
              {accuracyPercent >= 80
                ? '🎯'
                : accuracyPercent >= 60
                  ? '👍'
                  : '💪'}
            </Text>
            <Text className="text-2xl font-bold text-gray-900">
              {accuracyPercent}%
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              {correct} / {total} câu đúng
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">
            <ResultRow
              label="Đúng"
              value={String(correct)}
              icon="checkmark-circle"
              color="#10b981"
            />
            <ResultRow
              label="Sai"
              value={String(incorrect)}
              icon="close-circle"
              color="#ef4444"
            />
            <ResultRow
              label="Trung bình mỗi câu"
              value={`${avgSeconds}s`}
              icon="time"
              color="#6366f1"
              isLast
            />
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 bg-gray-200 py-3 rounded-2xl active:bg-gray-300"
            >
              <Text className="text-gray-900 font-semibold text-center">
                Xong
              </Text>
            </Pressable>
            <Pressable
              onPress={() => quiz.restart()}
              className="flex-1 bg-primary-600 py-3 rounded-2xl active:bg-primary-700"
            >
              <Text className="text-white font-semibold text-center">
                Làm lại
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === ACTIVE ===
  const question = quiz.currentQuestion;
  if (!question) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Kiểm tra' }} />

      <View className="px-4 pt-4">
        <ProgressBar
          current={quiz.currentIndex}
          total={quiz.questions.length}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {question.type === 'multiple-choice' ? (
          <MultipleChoice
            question={question}
            onAnswered={(_answer, _isCorrect) => {
              // submitAnswer được gọi bởi sub-component
              quiz.submitAnswer(_answer);
            }}
            onNext={quiz.next}
          />
        ) : null}

        {/* TODO: type-answer, listen-choose handled in Bước 2-3 */}
        {question.type === 'type-answer' ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-500">Type answer — Bước 2</Text>
          </View>
        ) : null}

        {question.type === 'listen-choose' ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-500">Listen & choose — Bước 3</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultRow({
  label,
  value,
  icon,
  color,
  isLast,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        isLast ? '' : 'border-b border-gray-100'
      }`}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color={color} />
        <Text className="text-base text-gray-700 ml-3">{label}</Text>
      </View>
      <Text className="text-lg font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
