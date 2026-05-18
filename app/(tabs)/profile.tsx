import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserStats, type UserStats } from '@/db/stats';

export default function ProfileScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center mt-4 mb-6">
          <View className="w-20 h-20 bg-primary-600 rounded-full items-center justify-center mb-3">
            <Text className="text-4xl">🌙</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">Người học</Text>
          <Text className="text-sm text-gray-500">Luna English</Text>
        </View>

        {/* Streak card */}
        <View className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-5 mb-6"
              style={{ backgroundColor: '#f59e0b' }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-sm opacity-90 mb-1">
                Chuỗi học liên tiếp
              </Text>
              <Text className="text-white text-4xl font-bold">
                {stats?.currentStreak ?? 0}
              </Text>
              <Text className="text-white text-sm opacity-90 mt-1">
                ngày
              </Text>
            </View>
            <Text className="text-6xl">🔥</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <StatCard
            label="Thẻ đã học"
            value={stats?.cardsLearned ?? 0}
            total={stats?.totalCards}
            icon="library"
            color="#6366f1"
          />
          <StatCard
            label="Tổng review"
            value={stats?.totalReviews ?? 0}
            icon="repeat"
            color="#10b981"
          />
          <StatCard
            label="Hôm nay"
            value={stats?.reviewsToday ?? 0}
            icon="today"
            color="#f59e0b"
          />
          <StatCard
            label="Tổng thẻ"
            value={stats?.totalCards ?? 0}
            icon="albums"
            color="#8b5cf6"
          />
        </View>

        <Text className="text-xs text-gray-400 text-center mt-8">
          Luna English v0.1.0
        </Text>
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
    <View className="bg-white rounded-2xl p-4 border border-gray-200"
          style={{ width: '47%' }}>
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