/**
 * Result screen — hiển thị điểm + đáp án (nếu config cho phép).
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getAttempt, type AttemptDetail } from '@/services/api/exam';

export default function ResultScreen() {
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false); // toggle xem tất cả vs chỉ sai

  useEffect(() => {
    load();
  }, [attemptId]);

  async function load() {
    try {
      const data = await getAttempt(attemptId);
      setAttempt(data);
    } catch (err) {
      console.error('Load attempt error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!attempt) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-500">Không tìm thấy kết quả</Text>
      </View>
    );
  }

  const percentage = attempt.percentage ?? 0;
  const showAnswers = attempt.answers.some((a) => a.correctAnswer !== null);

  const wrongAnswers = attempt.answers.filter((a) => a.isCorrect === false);
  const visibleAnswers = showAll ? attempt.answers : wrongAnswers;

  const scoreBg =
    percentage >= 80 ? 'bg-green-500' :
    percentage >= 50 ? 'bg-amber-500' :
    'bg-red-500';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Kết quả',
          headerLeft: () => null,
          headerBackVisible: false,
        }}
      />
      <ScrollView className="flex-1 bg-slate-50">
        {/* Score card */}
        <View className={`${scoreBg} px-6 py-8 items-center`}>
          <Text className="text-white text-base font-medium opacity-90">
            {attempt.examTitle}
          </Text>
          <Text className="text-white text-6xl font-bold mt-4">{percentage}%</Text>
          <Text className="text-white text-lg mt-2 opacity-90">
            {attempt.correctCount}/{attempt.totalQuestions} câu đúng
          </Text>
          <Text className="text-white text-sm mt-1 opacity-75">
            {percentage >= 80
              ? '🎉 Xuất sắc!'
              : percentage >= 50
                ? '👍 Tốt, cần luyện tập thêm'
                : '📚 Cần ôn lại'}
          </Text>
        </View>

        {/* Actions */}
        <View className="px-4 py-4 bg-white border-b border-slate-200 flex-row">
          <Pressable
            className="flex-1 mr-2 bg-indigo-600 active:bg-indigo-700 rounded-xl py-3 items-center"
            onPress={() => router.replace(`/exam/${id}`)}
          >
            <Text className="text-white font-semibold">Làm lại</Text>
          </Pressable>
          <Pressable
            className="flex-1 ml-2 bg-white border border-slate-300 active:bg-slate-50 rounded-xl py-3 items-center"
            onPress={() => router.replace('/(tabs)/exams')}
          >
            <Text className="text-slate-700 font-semibold">Về danh sách</Text>
          </Pressable>
        </View>

        {/* Answers review */}
        {showAnswers ? (
          <>
            <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-900">
                {showAll ? 'Tất cả' : `Câu sai (${wrongAnswers.length})`}
              </Text>
              <Pressable onPress={() => setShowAll((s) => !s)}>
                <Text className="text-indigo-600 font-medium text-sm">
                  {showAll ? 'Chỉ câu sai' : 'Xem tất cả'}
                </Text>
              </Pressable>
            </View>

            <View className="px-4 py-3">
              {visibleAnswers.length === 0 ? (
                <View className="items-center py-12">
                  <Text className="text-slate-500">
                    Tuyệt vời! Bạn không sai câu nào.
                  </Text>
                </View>
              ) : (
                visibleAnswers.map((ans) => (
                  <AnswerCard key={ans.questionId} answer={ans} />
                ))
              )}
            </View>
          </>
        ) : (
          <View className="px-6 py-8 items-center">
            <Text className="text-slate-500 text-center">
              Bài kiểm tra này không cho phép xem đáp án sau khi nộp.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ============================================================
// Answer card
// ============================================================
function AnswerCard({
  answer,
}: {
  answer: AttemptDetail['answers'][0];
}) {
  const isCorrect = answer.isCorrect === true;
  const isWrong = answer.isCorrect === false;
  const skipped = !answer.selectedAnswer;

  return (
    <View
      className={`bg-white rounded-xl p-4 mb-3 border-l-4 ${
        isCorrect
          ? 'border-green-500'
          : isWrong
            ? 'border-red-500'
            : 'border-slate-300'
      } border-t border-r border-b border-slate-200`}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-xs font-bold text-slate-500">
          Câu {answer.questionNumber}
        </Text>
        <Text
          className={`ml-2 text-xs font-semibold ${
            isCorrect ? 'text-green-600' : isWrong ? 'text-red-600' : 'text-slate-400'
          }`}
        >
          {isCorrect ? '✓ Đúng' : isWrong ? '✗ Sai' : '— Bỏ qua'}
        </Text>
      </View>

      <Text className="text-base text-slate-900 mb-3 leading-5">
        {answer.questionText || `Câu ${answer.questionNumber}`}
      </Text>

      {answer.options.map((opt) => {
        const isSelected = answer.selectedAnswer === opt.letter;
        const isAnswer = answer.correctAnswer === opt.letter;
        let bg = 'bg-slate-50';
        let textColor = 'text-slate-700';
        let circleBg = 'bg-slate-200';
        let circleText = 'text-slate-600';

        if (isAnswer) {
          bg = 'bg-green-50';
          textColor = 'text-green-900 font-medium';
          circleBg = 'bg-green-500';
          circleText = 'text-white';
        } else if (isSelected && !isCorrect) {
          bg = 'bg-red-50';
          textColor = 'text-red-900';
          circleBg = 'bg-red-500';
          circleText = 'text-white';
        }

        return (
          <View key={opt.letter} className={`${bg} flex-row items-start p-2 rounded-lg mb-1`}>
            <View className={`w-6 h-6 ${circleBg} rounded-full items-center justify-center mr-2`}>
              <Text className={`${circleText} text-xs font-bold`}>{opt.letter}</Text>
            </View>
            <Text className={`flex-1 text-sm leading-5 ${textColor}`}>{opt.text}</Text>
            {isSelected && (
              <Text className="text-xs text-slate-500 italic ml-2">(đã chọn)</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
