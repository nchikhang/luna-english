/**
 * Exam player screen.
 * Fixed:
 * - Hooks order: TẤT CẢ hooks (incl useMemo) gọi top level trước early return
 * - Safe area bottom
 * - Conditional question render
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExamStore, type AnswerLetter } from '@/stores/examStore';
import Markdown from 'react-native-markdown-display';
import { submitAttempt } from '@/services/api/exam';

export default function ExamPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const exam = useExamStore((s) => s.exam);
  const attemptId = useExamStore((s) => s.attemptId);
  const currentIndex = useExamStore((s) => s.currentIndex);
  const answers = useExamStore((s) => s.answers);
  const setAnswer = useExamStore((s) => s.setAnswer);
  const goToQuestion = useExamStore((s) => s.goToQuestion);
  const nextQuestion = useExamStore((s) => s.nextQuestion);
  const prevQuestion = useExamStore((s) => s.prevQuestion);
  const resetExam = useExamStore((s) => s.resetExam);

  const [submitting, setSubmitting] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // ⚠️ useMemo PHẢI gọi trước early return để đảm bảo Rules of Hooks
  // Safe: dùng optional chaining để xử lý null
  const currentQuestion = exam?.questions[currentIndex];
  const currentSection = useMemo(() => {
    if (!exam || !currentQuestion) return null;
    return exam.sections.find(
      (s) =>
        currentQuestion.number >= s.startQNum &&
        currentQuestion.number <= s.endQNum
    );
  }, [exam, currentQuestion]);

  // Early return SAU khi all hooks đã gọi
  if (!exam || !attemptId || !currentQuestion) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-slate-700 text-center mb-4">
          Phiên làm bài không tồn tại. Vui lòng bắt đầu lại.
        </Text>
        <Pressable
          className="bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => router.replace(`/exam/${id}`)}
        >
          <Text className="text-white font-semibold">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const totalQuestions = exam.questions.length;
  const currentAnswer = answers[currentQuestion.id] ?? null;
  const answeredCount = Object.values(answers).filter((v) => v).length;

  async function onSubmit() {
    if (answeredCount < totalQuestions) {
      const skipped = totalQuestions - answeredCount;
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Còn câu chưa trả lời',
          `Bạn còn ${skipped} câu chưa làm. Vẫn nộp bài?`,
          [
            { text: 'Tiếp tục làm', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Nộp bài', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const payload = exam!.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] ?? null,
      }));
      const result = await submitAttempt(attemptId!, payload);

      const attemptIdLocal = result.attemptId;
      const examIdLocal = exam!.id;
      resetExam();
      // Navigate trước khi store reset propagate
      router.replace(`/exam/${examIdLocal}/result/${attemptIdLocal}`);
    } catch (err: any) {
      Alert.alert('Không thể nộp bài', err.message);
      setSubmitting(false);
    }
  }

  function onCancel() {
    Alert.alert(
      'Hủy bài làm?',
      'Tiến độ sẽ không được lưu. Bạn chắc chắn?',
      [
        { text: 'Tiếp tục làm', style: 'cancel' },
        {
          text: 'Hủy bài',
          style: 'destructive',
          onPress: () => {
            resetExam();
            router.back();
          },
        },
      ]
    );
  }

  const hasRealText =
    currentQuestion.text &&
    !currentQuestion.text.match(/^Câu\s+\d+$/);

  return (
    <>
      <Stack.Screen
        options={{
          title: `Câu ${currentIndex + 1}/${totalQuestions}`,
          headerLeft: () => (
            <Pressable onPress={onCancel} className="px-2">
              <Text className="text-red-600 font-medium">Hủy</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => setShowGrid(true)} className="px-2">
              <Text className="text-indigo-600 font-medium">
                {answeredCount}/{totalQuestions}
              </Text>
            </Pressable>
          ),
        }}
      />

      <View className="bg-white border-b border-slate-200 px-4 py-2">
        <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <View
            className="h-full bg-indigo-500"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
        {currentSection?.context && (
          <View className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-3 mb-4">
            <Text className="text-xs font-semibold text-amber-800 mb-1">
              📖 Đoạn văn
            </Text>
            {currentSection.title && (
              <Text className="text-sm italic text-amber-700 mb-2 leading-4">
                {currentSection.title}
              </Text>
            )}
            <Markdown
              style={{
                body: { color: '#78350f', fontSize: 14, lineHeight: 20 },
                paragraph: { color: '#78350f', marginTop: 0, marginBottom: 8 },
                strong: { color: '#451a03', fontWeight: '700' },
              }}
            >
              {currentSection.context}
            </Markdown>
          </View>
        )}
        {/* Section có title nhưng KHÔNG có context (vd Q hỏi trực tiếp, không có passage) */}
        {!currentSection?.context && currentSection?.title && (
          <View className="bg-indigo-50 border-l-4 border-indigo-400 rounded-lg p-3 mb-4">
            <Text className="text-sm italic text-indigo-700 leading-4">
              {currentSection.title}
            </Text>
          </View>
        )}

        {hasRealText ? (
          <View className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
            <Markdown
              style={{
                body: { color: '#0f172a', fontSize: 15, lineHeight: 22 },
                paragraph: { color: '#0f172a', marginTop: 0, marginBottom: 6 },
                strong: { fontWeight: '700' },
              }}
            >
              {currentQuestion.text}
            </Markdown>
          </View>
        ) : (
          <View className="bg-indigo-50 rounded-lg p-3 mb-4">
            <Text className="text-sm text-indigo-800 italic">
              Chọn đáp án phù hợp với chỗ trống ({currentQuestion.number}) trong đoạn văn:
            </Text>
          </View>
        )}

        <View>
          {currentQuestion.options.map((opt) => {
            const selected = currentAnswer === opt.letter;
            return (
              <Pressable
                key={opt.id}
                className={`mb-3 p-4 rounded-xl border-2 ${
                  selected
                    ? 'bg-indigo-50 border-indigo-500'
                    : 'bg-white border-slate-200 active:bg-slate-50'
                }`}
                onPress={() => setAnswer(currentQuestion.id, opt.letter as AnswerLetter)}
              >
                <View className="flex-row items-start">
                  <View
                    className={`w-8 h-8 rounded-full mr-3 items-center justify-center ${
                      selected ? 'bg-indigo-500' : 'bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        selected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {opt.letter}
                    </Text>
                  </View>
                  <Text
                    className={`flex-1 text-base leading-6 pt-1 ${
                      selected ? 'text-indigo-900 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        className="bg-white border-t border-slate-200 px-4 flex-row items-center"
        style={{
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
        }}
      >
        <Pressable
          className={`flex-1 py-3 rounded-xl mr-2 items-center border ${
            currentIndex === 0
              ? 'border-slate-200 bg-slate-100'
              : 'border-slate-300 bg-white active:bg-slate-50'
          }`}
          onPress={prevQuestion}
          disabled={currentIndex === 0}
        >
          <Text
            className={`font-medium ${
              currentIndex === 0 ? 'text-slate-400' : 'text-slate-700'
            }`}
          >
            ← Trước
          </Text>
        </Pressable>

        {currentIndex < totalQuestions - 1 ? (
          <Pressable
            className="flex-1 py-3 rounded-xl ml-2 items-center bg-indigo-600 active:bg-indigo-700"
            onPress={nextQuestion}
          >
            <Text className="text-white font-medium">Tiếp →</Text>
          </Pressable>
        ) : (
          <Pressable
            className="flex-1 py-3 rounded-xl ml-2 items-center bg-green-600 active:bg-green-700"
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold">📝 Nộp bài</Text>
            )}
          </Pressable>
        )}
      </View>

      <Modal visible={showGrid} transparent animationType="slide" onRequestClose={() => setShowGrid(false)}>
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowGrid(false)}
        >
          <Pressable
            className="bg-white rounded-t-3xl p-4 max-h-[70%]"
            style={{ paddingBottom: 16 + insets.bottom }}
          >
            <Text className="text-lg font-bold text-slate-900 mb-3 text-center">
              Chọn câu ({answeredCount}/{totalQuestions} đã làm)
            </Text>
            <ScrollView>
              <View className="flex-row flex-wrap">
                {exam.questions.map((q, i) => {
                  const answered = !!answers[q.id];
                  const isCurrent = i === currentIndex;
                  return (
                    <Pressable
                      key={q.id}
                      className={`w-12 h-12 m-1 items-center justify-center rounded-lg ${
                        isCurrent
                          ? 'bg-indigo-600'
                          : answered
                            ? 'bg-green-500'
                            : 'bg-slate-200'
                      }`}
                      onPress={() => {
                        goToQuestion(i);
                        setShowGrid(false);
                      }}
                    >
                      <Text
                        className={`font-bold text-sm ${
                          isCurrent || answered ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {q.number}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              className="bg-green-600 active:bg-green-700 rounded-xl py-3 mt-4 items-center"
              onPress={() => {
                setShowGrid(false);
                onSubmit();
              }}
            >
              <Text className="text-white font-bold">📝 Nộp bài ngay</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}