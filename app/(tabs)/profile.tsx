import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useStatsStore } from '@/stores/statsStore';
import { runFullSync } from '@/services/sync';
import { updateDailyGoal } from '@/services/api/stats';

/**
 * Profile screen V2 (Phase G1.A).
 *
 * New features:
 * - XP bar với level current/next
 * - Streak counter với flame icon
 * - Daily goal progress ring
 * - Total cards mastered / total reviews
 * - Settings: thay đổi daily goal
 */
export default function ProfileScreen() {
  const [syncing, setSyncing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const lastSyncAt = useAuthStore((s) => s.lastSyncAt);

  const stats = useStatsStore((s) => s.stats);
  const isLoadingStats = useStatsStore((s) => s.isLoading);
  const loadStats = useStatsStore((s) => s.load);
  const refreshStats = useStatsStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const result = await runFullSync();
      // Sau sync, refresh stats vì có thể có XP mới từ review_logs vừa push
      await refreshStats();
      const total = result.pulled.cards + result.pushed.cards + result.pushed.reviewLogs;
      Alert.alert(
        'Đồng bộ hoàn tất',
        total === 0
          ? 'Tất cả đã đồng bộ ✓'
          : `Tải về: ${result.pulled.decks} bộ, ${result.pulled.cards} thẻ\n` +
            `Đẩy lên: ${result.pushed.decks} bộ, ${result.pushed.cards} thẻ, ${result.pushed.reviewLogs} reviews`
      );
    } catch (err) {
      Alert.alert('Đồng bộ thất bại', err instanceof Error ? err.message : 'Lỗi');
    } finally {
      setSyncing(false);
    }
  };

  const handleChangeGoal = () => {
    Alert.alert('Mục tiêu hàng ngày', 'Bao nhiêu XP/ngày bạn muốn đạt?', [
      { text: 'Hủy', style: 'cancel' },
      { text: '25 XP (Nhẹ)', onPress: () => setGoal(25) },
      { text: '50 XP (Vừa)', onPress: () => setGoal(50) },
      { text: '100 XP (Cao)', onPress: () => setGoal(100) },
      { text: '200 XP (Cường độ)', onPress: () => setGoal(200) },
    ]);
  };

  const setGoal = async (xp: number) => {
    try {
      await updateDailyGoal(xp);
      await refreshStats();
    } catch (err) {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không cập nhật được');
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Dữ liệu local sẽ giữ. Đăng nhập lại để sync tiếp.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const xpProgress = stats
    ? (stats.totalXp - stats.xpForCurrentLevel) /
      (stats.xpForNextLevel - stats.xpForCurrentLevel)
    : 0;

  const dailyProgress = stats ? Math.min(1, stats.today.xpEarned / stats.today.goalXp) : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Avatar + Name */}
        <View className="items-center mt-4 mb-6">
          <View className="w-20 h-20 bg-indigo-600 rounded-full items-center justify-center mb-3 relative">
            <Text className="text-4xl">🌙</Text>
            {stats && (
              <View className="absolute -bottom-2 right-0 bg-amber-500 px-2 py-0.5 rounded-full border-2 border-white">
                <Text className="text-white text-xs font-bold">Lv.{stats.level}</Text>
              </View>
            )}
          </View>
          <Text className="text-xl font-bold text-gray-900">{user?.displayName ?? 'Người học'}</Text>
          <Text className="text-sm text-gray-500">{user?.email ?? ''}</Text>
        </View>

        {isLoadingStats && !stats && (
          <View className="py-8 items-center">
            <ActivityIndicator />
          </View>
        )}

        {stats && (
          <>
            {/* XP Progress to next level */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3">
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700">
                  Lv. {stats.level} → Lv. {stats.level + 1}
                </Text>
                <Text className="text-sm text-gray-500">
                  {stats.totalXp - stats.xpForCurrentLevel} /{' '}
                  {stats.xpForNextLevel - stats.xpForCurrentLevel} XP
                </Text>
              </View>
              <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.max(2, xpProgress * 100)}%` }}
                />
              </View>
              <Text className="text-xs text-gray-400 mt-2 text-center">
                Tổng cộng {stats.totalXp.toLocaleString()} XP
              </Text>
            </View>

            {/* Streak */}
            <View
              className="rounded-3xl p-5 mb-3"
              style={{ backgroundColor: stats.currentStreak > 0 ? '#f59e0b' : '#9ca3af' }}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-sm opacity-90 mb-1">Chuỗi học liên tiếp</Text>
                  <Text className="text-white text-4xl font-bold">{stats.currentStreak}</Text>
                  <Text className="text-white text-sm opacity-90 mt-1">
                    ngày {stats.longestStreak > stats.currentStreak ? `· kỷ lục ${stats.longestStreak}` : ''}
                  </Text>
                </View>
                <Text className="text-6xl">{stats.currentStreak > 0 ? '🔥' : '💤'}</Text>
              </View>
            </View>

            {/* Daily goal */}
            <TouchableOpacity
              onPress={handleChangeGoal}
              className="bg-white rounded-2xl p-4 border border-gray-200 mb-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Ionicons
                    name={stats.today.goalMet ? 'checkmark-circle' : 'flag'}
                    size={20}
                    color={stats.today.goalMet ? '#10b981' : '#6366f1'}
                  />
                  <Text className="ml-2 font-semibold text-gray-900">
                    Mục tiêu hôm nay
                  </Text>
                </View>
                <Text className="text-xs text-gray-400">Tap để đổi</Text>
              </View>
              <View className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <View
                  className={`h-full rounded-full ${stats.today.goalMet ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.max(2, dailyProgress * 100)}%` }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">
                  {stats.today.xpEarned} / {stats.today.goalXp} XP
                </Text>
                <Text className="text-sm text-gray-600">
                  {stats.today.reviewsCount} thẻ đã ôn
                </Text>
              </View>
            </TouchableOpacity>

            {/* Stats grid */}
            <View className="flex-row flex-wrap gap-3 mb-3" style={{ justifyContent: 'space-between' }}>
              <StatCard label="Tổng XP" value={stats.totalXp.toLocaleString()} icon="star" color="#f59e0b" />
              <StatCard label="Tổng review" value={stats.totalReviews.toLocaleString()} icon="repeat" color="#10b981" />
              <StatCard label="Đã thuộc" value={stats.cardsMastered.toLocaleString()} icon="trophy" color="#8b5cf6" />
              <StatCard label="Kỷ lục streak" value={`${stats.longestStreak} ngày`} icon="flame" color="#ef4444" />
            </View>
          </>
        )}

        {/* Sync */}
        <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="cloud-done" size={20} color="#10b981" />
              <Text className="ml-2 font-semibold text-gray-900">Đồng bộ</Text>
            </View>
            <Text className="text-xs text-gray-500">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('vi-VN') : 'Chưa từng sync'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSyncNow}
            disabled={syncing}
            className={`rounded-xl py-3 items-center ${syncing ? 'bg-gray-200' : 'bg-indigo-50'}`}
          >
            <Text className={`font-semibold ${syncing ? 'text-gray-500' : 'text-indigo-700'}`}>
              {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl p-4 border border-red-200 flex-row items-center justify-center"
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text className="ml-2 font-semibold text-red-600">Đăng xuất</Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 text-center mt-8">Luna English v0.3.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-200" style={{ width: '47%' }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text className="text-xl font-bold mt-2" style={{ color }}>
        {value}
      </Text>
      <Text className="text-xs text-gray-600 mt-1">{label}</Text>
    </View>
  );
}
