/**
 * Tab "Đề thi" — list exams + admin upload button.
 * 
 * - User: see published exams + best score
 * - Admin: see "Upload đề" button on top + có thể tap exam để xem detail
 */

import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listExams, type ExamListItem } from '@/services/api/exam';
import { useAuthStore } from '@/stores/authStore';

export default function ExamsTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listExams();
      setExams(data);
    } catch (err: any) {
      setError(err.message || 'Không tải được danh sách');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-slate-200">
        <Text className="text-2xl font-bold text-slate-900">Đề thi</Text>
        <Text className="text-sm text-slate-500 mt-1">
          {exams.length} đề thi đã xuất bản
        </Text>
      </View>

      {/* Admin upload button */}
      {isAdmin && (
        <View className="px-4 pt-3">
          <View className="flex-row">
            <Pressable
              className="flex-1 bg-indigo-600 active:bg-indigo-700 rounded-xl px-3 py-3 mr-2 items-center"
              onPress={() => router.push('/admin/upload-exam')}
            >
              <Text className="text-white font-semibold text-sm">📤 Upload đề</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-slate-700 active:bg-slate-800 rounded-xl px-3 py-3 ml-2 items-center"
              onPress={() => router.push('/admin/exam-list')}
            >
              <Text className="text-white font-semibold text-sm">⚙️ Quản lý</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mx-4 mt-3 rounded">
          <Text className="text-red-700 text-sm">{error}</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-slate-400 text-base">
              Chưa có đề thi nào.
            </Text>
            {isAdmin && (
              <Text className="text-slate-400 text-sm mt-1">
                Tap nút "Upload đề thi mới" ở trên.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => <ExamCard exam={item} />}
      />
    </View>
  );
}

// ============================================================
// Exam card
// ============================================================
function ExamCard({ exam }: { exam: ExamListItem }) {
  const router = useRouter();

  const scoreColor = exam.bestScorePercentage == null
    ? 'text-slate-400'
    : exam.bestScorePercentage >= 80
      ? 'text-green-600'
      : exam.bestScorePercentage >= 50
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <Pressable
      className="bg-white rounded-xl p-4 mb-3 border border-slate-200 active:bg-slate-50"
      onPress={() => router.push(`/exam/${exam.id}`)}
    >
      <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
        {exam.title}
      </Text>

      <View className="flex-row items-center mt-2">
        {exam.subject && (
          <View className="bg-indigo-100 px-2 py-0.5 rounded mr-2">
            <Text className="text-indigo-700 text-xs font-medium">{exam.subject}</Text>
          </View>
        )}
        {exam.grade && (
          <View className="bg-slate-100 px-2 py-0.5 rounded mr-2">
            <Text className="text-slate-700 text-xs font-medium">{exam.grade}</Text>
          </View>
        )}
        <Text className="text-slate-500 text-xs">{exam.totalQuestions} câu</Text>
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <Text className="text-sm text-slate-500">
          {exam.attemptsCount > 0 ? `Đã làm ${exam.attemptsCount} lần` : 'Chưa làm'}
        </Text>
        {exam.bestScorePercentage !== null && (
          <Text className={`text-sm font-semibold ${scoreColor}`}>
            Cao nhất: {exam.bestScorePercentage}%
          </Text>
        )}
      </View>
    </Pressable>
  );
}
