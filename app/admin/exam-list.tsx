/**
 * Admin exam management screen.
 *
 * - List tất cả exams (mọi status: draft/published/archived)
 * - Status badge với màu
 * - Actions: Publish/Unpublish, Delete
 * - Tap card → exam detail
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listAdminExams,
  publishExam,
  unpublishExam,
  deleteExam,
  type AdminExamListItem,
} from '@/services/api/exam';

export default function AdminExamListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [exams, setExams] = useState<AdminExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listAdminExams();
      setExams(data);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
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

  async function onTogglePublish(exam: AdminExamListItem) {
    const isPublishing = exam.status !== 'published';
    const action = isPublishing ? 'Xuất bản' : 'Gỡ xuất bản';
    
    Alert.alert(
      `${action} đề thi?`,
      isPublishing
        ? 'Đề thi sẽ hiển thị cho tất cả user.'
        : 'Đề thi sẽ không còn hiển thị cho user (nhưng lịch sử làm bài vẫn giữ).',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            setActionInProgress(exam.id);
            try {
              if (isPublishing) {
                await publishExam(exam.id);
              } else {
                await unpublishExam(exam.id);
              }
              await load();
            } catch (err: any) {
              Alert.alert(`${action} thất bại`, err.message);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  }

  async function onDelete(exam: AdminExamListItem) {
    Alert.alert(
      'Xóa đề thi?',
      `"${exam.title}"\n\nThao tác này không thể hoàn tác. Tất cả attempts và answers sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setActionInProgress(exam.id);
            try {
              await deleteExam(exam.id);
              await load();
            } catch (err: any) {
              Alert.alert('Xóa thất bại', err.message);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Quản lý đề thi' }} />
      <View className="flex-1 bg-slate-50">
        {/* Header stats */}
        <View className="bg-white px-4 py-3 border-b border-slate-200 flex-row">
          <StatBox
            label="Tổng"
            value={exams.length}
            color="text-slate-900"
          />
          <StatBox
            label="Đã xuất bản"
            value={exams.filter((e) => e.status === 'published').length}
            color="text-green-600"
          />
          <StatBox
            label="Bản nháp"
            value={exams.filter((e) => e.status === 'draft').length}
            color="text-amber-600"
          />
        </View>

        {/* List */}
        <FlatList
          data={exams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 16 + insets.bottom,
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-slate-400 text-base">Chưa có đề thi nào.</Text>
              <Pressable
                className="bg-indigo-600 px-6 py-3 rounded-lg mt-4"
                onPress={() => router.push('/admin/upload-exam')}
              >
                <Text className="text-white font-semibold">Upload đề mới</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <ExamCard
              exam={item}
              busy={actionInProgress === item.id}
              onPress={() => router.push(`/exam/${item.id}`)}
              onTogglePublish={() => onTogglePublish(item)}
              onDelete={() => onDelete(item)}
            />
          )}
        />
      </View>
    </>
  );
}

// ============================================================
// Stat box
// ============================================================
function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className={`text-2xl font-bold ${color}`}>{value}</Text>
      <Text className="text-xs text-slate-500 mt-0.5">{label}</Text>
    </View>
  );
}

// ============================================================
// Exam card
// ============================================================
function ExamCard({
  exam,
  busy,
  onPress,
  onTogglePublish,
  onDelete,
}: {
  exam: AdminExamListItem;
  busy: boolean;
  onPress: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    draft: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Bản nháp' },
    published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã xuất bản' },
    archived: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Đã gỡ' },
  }[exam.status];

  const isPublished = exam.status === 'published';

  return (
    <Pressable
      className="bg-white rounded-xl p-4 mb-3 border border-slate-200 active:bg-slate-50"
      onPress={onPress}
      disabled={busy}
    >
      {/* Header: title + status */}
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 text-base font-bold text-slate-900 mr-2" numberOfLines={2}>
          {exam.title}
        </Text>
        <View className={`${statusConfig.bg} px-2 py-1 rounded`}>
          <Text className={`${statusConfig.text} text-xs font-bold`}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Meta */}
      <View className="flex-row items-center mt-2 flex-wrap">
        {exam.subject && (
          <View className="bg-indigo-50 px-2 py-0.5 rounded mr-2 mb-1">
            <Text className="text-indigo-700 text-xs">{exam.subject}</Text>
          </View>
        )}
        {exam.grade && (
          <View className="bg-slate-100 px-2 py-0.5 rounded mr-2 mb-1">
            <Text className="text-slate-600 text-xs">{exam.grade}</Text>
          </View>
        )}
        <Text className="text-slate-500 text-xs">
          {exam.totalQuestions} câu · {exam._count.attempts} lượt làm
        </Text>
      </View>

      {/* Created info */}
      <Text className="text-xs text-slate-400 mt-1">
        {exam.uploader.displayName} ·{' '}
        {new Date(exam.createdAt).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </Text>

      {/* Actions */}
      <View className="flex-row mt-3 pt-3 border-t border-slate-100">
        <Pressable
          className={`flex-1 mr-2 py-2 rounded-lg items-center ${
            isPublished
              ? 'bg-amber-50 active:bg-amber-100'
              : 'bg-green-50 active:bg-green-100'
          }`}
          onPress={onTogglePublish}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={isPublished ? '#92400e' : '#065f46'} />
          ) : (
            <Text
              className={`text-sm font-semibold ${
                isPublished ? 'text-amber-700' : 'text-green-700'
              }`}
            >
              {isPublished ? '👁️ Gỡ xuất bản' : '🚀 Xuất bản'}
            </Text>
          )}
        </Pressable>

        <Pressable
          className="px-4 py-2 rounded-lg items-center bg-red-50 active:bg-red-100"
          onPress={onDelete}
          disabled={busy}
        >
          <Text className="text-sm font-semibold text-red-700">🗑️ Xóa</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}