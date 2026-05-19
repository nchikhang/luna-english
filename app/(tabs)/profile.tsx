import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserStats, type UserStats } from '@/db/stats';
import { useAuthStore } from '@/stores/authStore';
import { runFullSync } from '@/services/sync';

export default function ProfileScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const lastSyncAt = useAuthStore((s) => s.lastSyncAt);
  const logout = useAuthStore((s) => s.logout);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getUserStats().then((data) => {
        if (!cancelled) setStats(data);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const result = await runFullSync();
      Alert.alert(
        'Đồng bộ hoàn tất',
        `Tải về: ${result.pulled.decks} bộ, ${result.pulled.cards} thẻ\n` +
          `Đẩy lên: ${result.pushed.decks} bộ, ${result.pushed.cards} thẻ, ${result.pushed.reviewLogs} reviews`
      );
    } catch (err) {
      Alert.alert('Đồng bộ thất bại', err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Dữ liệu local sẽ vẫn còn nhưng sẽ không sync. Đăng nhập lại để tiếp tục sync.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center mt-4 mb-6">
          <View className="w-20 h-20 bg-indigo-600 rounded-full items-center justify-center mb-3">
            <Text className="text-4xl">🌙</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">
            {user?.displayName ?? 'Người học'}
          </Text>
          <Text className="text-sm text-gray-500">{user?.email ?? 'Luna English'}</Text>
          {user?.level && (
            <View className="mt-2 px-3 py-1 bg-indigo-100 rounded-full">
              <Text className="text-xs font-semibold text-indigo-700">Trình độ {user.level}</Text>
            </View>
          )}
        </View>

        {/* Streak card */}
        <View
          className="rounded-3xl p-5 mb-6"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-sm opacity-90 mb-1">Chuỗi học liên tiếp</Text>
              <Text className="text-white text-4xl font-bold">{stats?.currentStreak ?? 0}</Text>
              <Text className="text-white text-sm opacity-90 mt-1">ngày</Text>
            </View>
            <Text className="text-6xl">🔥</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <StatCard label="Thẻ đã học" value={stats?.cardsLearned ?? 0} total={stats?.totalCards} icon="library" color="#6366f1" />
          <StatCard label="Tổng review" value={stats?.totalReviews ?? 0} icon="repeat" color="#10b981" />
          <StatCard label="Hôm nay" value={stats?.reviewsToday ?? 0} icon="today" color="#f59e0b" />
          <StatCard label="Tổng thẻ" value={stats?.totalCards ?? 0} icon="albums" color="#8b5cf6" />
        </View>

        {/* Sync section */}
        <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="cloud-done" size={20} color="#10b981" />
              <Text className="ml-2 font-semibold text-gray-900">Đồng bộ</Text>
            </View>
            <Text className="text-xs text-gray-500">
              {lastSyncAt
                ? `Lần cuối: ${new Date(lastSyncAt).toLocaleString('vi-VN')}`
                : 'Chưa từng sync'}
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

        <Text className="text-xs text-gray-400 text-center mt-8">Luna English v0.2.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
}: {
  label: string;
  value: number;
  total?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-200" style={{ width: '47%' }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text className="text-2xl font-bold mt-2" style={{ color }}>
        {value}
        {total !== undefined ? (
          <Text className="text-sm text-gray-400 font-normal"> / {total}</Text>
        ) : null}
      </Text>
      <Text className="text-xs text-gray-600 mt-1">{label}</Text>
    </View>
  );
}
