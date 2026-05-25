/**
 * Exam detail screen.
 * 
 * Show exam metadata + instructions + history + "Bắt đầu" button.
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  getExam,
  startAttempt,
  getExamHistory,
  type ExamDetail,
  type ExamHistoryItem,
} from '@/services/api/exam';
import { useExamStore } from '@/stores/examStore';

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const startExam = useExamStore((s) => s.startExam);

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [examData, historyData] = await Promise.all([
        getExam(id),
        getExamHistory(),
      ]);
      setExam(examData);
      setHistory(historyData.filter((h) => h.examId === id));
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onStart() {
    if (!exam) return;
    setStarting(true);
    try {
      const attempt = await startAttempt(exam.id);
      startExam(exam, attempt);
      router.push(`/exam/${exam.id}/play`);
    } catch (err: any) {
      Alert.alert('Không thể bắt đầu', err.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!exam) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-500">Đề thi không tồn tại</Text>
      </View>
    );
  }

  const bestScore = history.reduce((best, h) =>
    h.percentage != null && (best === null || h.percentage > best)
      ? h.percentage
      : best,
    null as number | null
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Chi tiết đề thi' }} />
      <ScrollView className="flex-1 bg-slate-50">
        {/* Header card */}
        <View className="bg-white px-4 py-6 border-b border-slate-200">
          <Text className="text-xl font-bold text-slate-900">{exam.title}</Text>
          <View className="flex-row flex-wrap mt-3">
            {exam.subject && (
              <View className="bg-indigo-100 px-3 py-1 rounded mr-2 mb-2">
                <Text className="text-indigo-700 text-sm font-medium">{exam.subject}</Text>
              </View>
            )}
            {exam.grade && (
              <View className="bg-slate-100 px-3 py-1 rounded mr-2 mb-2">
                <Text className="text-slate-700 text-sm font-medium">{exam.grade}</Text>
              </View>
            )}
          </View>

          {exam.instructions && (
            <View className="bg-amber-50 border-l-4 border-amber-500 p-3 mt-4 rounded">
              <Text className="text-amber-900 text-sm leading-5">{exam.instructions}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View className="bg-white mt-3 px-4 py-4 border-t border-b border-slate-200">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-slate-900">{exam.totalQuestions}</Text>
              <Text className="text-xs text-slate-500 mt-1">Câu hỏi</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-slate-900">{history.length}</Text>
              <Text className="text-xs text-slate-500 mt-1">Lần làm</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-indigo-600">
                {bestScore !== null ? `${bestScore}%` : '—'}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">Cao nhất</Text>
            </View>
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View className="mt-3 px-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">Lịch sử</Text>
            {history.slice(0, 5).map((h) => (
              <Pressable
                key={h.attemptId}
                className="bg-white rounded-lg p-3 mb-2 border border-slate-200"
                onPress={() => router.push(`/exam/${exam.id}/result/${h.attemptId}`)}
              >
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-slate-600">
                    {h.submittedAt
                      ? new Date(h.submittedAt).toLocaleString('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Đang làm dở'}
                  </Text>
                  <Text
                    className={`text-base font-bold ${
                      h.percentage == null
                        ? 'text-slate-400'
                        : h.percentage >= 80
                          ? 'text-green-600'
                          : h.percentage >= 50
                            ? 'text-amber-600'
                            : 'text-red-600'
                    }`}
                  >
                    {h.percentage !== null ? `${h.percentage}%` : '—'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Start button */}
        <View className="px-4 py-6">
          <Pressable
            className="bg-indigo-600 active:bg-indigo-700 rounded-xl py-4 items-center"
            onPress={onStart}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {history.length > 0 ? 'Làm lại bài kiểm tra' : 'Bắt đầu làm bài'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
