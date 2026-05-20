import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { fetchBadges, type BadgeInfo } from '@/services/api/badges';

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#9333ea',
} as const;

const TIER_LABELS: Record<string, string> = {
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
  platinum: 'Platinum',
};

export default function BadgesScreen() {
  const [earned, setEarned] = useState<BadgeInfo[]>([]);
  const [locked, setLocked] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchBadges();
      setEarned(data.earned);
      setLocked(data.locked);
    } catch (err) {
      console.warn('[Badges] Load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Build flat data với sections
  const data: Array<{ type: 'header'; title: string } | BadgeInfo> = [];
  if (earned.length > 0) {
    data.push({ type: 'header', title: `Đã đạt được (${earned.length}/${earned.length + locked.length})` });
    data.push(...earned);
  }
  if (locked.length > 0) {
    data.push({ type: 'header', title: 'Chưa mở khóa' });
    data.push(...locked);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ title: 'Huy hiệu' }} />
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => ('type' in item ? `h_${idx}` : item.id)}
        renderItem={({ item }) => {
          if ('type' in item) {
            return (
              <Text className="text-xs font-semibold text-gray-500 uppercase px-4 pt-6 pb-2">
                {item.title}
              </Text>
            );
          }
          return <BadgeCard badge={item} />;
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-4xl mb-4">🏅</Text>
            <Text className="text-gray-500">Chưa có huy hiệu nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function BadgeCard({ badge }: { badge: BadgeInfo }) {
  const tierColor = TIER_COLORS[badge.tier as keyof typeof TIER_COLORS] ?? '#9ca3af';

  return (
    <View
      className={`mx-4 mb-2 rounded-2xl p-4 flex-row items-center ${
        badge.unlocked ? 'bg-white border border-gray-200' : 'bg-gray-100'
      }`}
    >
      <View
        className="w-14 h-14 rounded-full items-center justify-center mr-4"
        style={{
          backgroundColor: badge.unlocked ? tierColor + '20' : '#e5e7eb',
        }}
      >
        <Text
          className="text-3xl"
          style={{ opacity: badge.unlocked ? 1 : 0.3 }}
        >
          {badge.icon}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text
            className={`text-base font-bold ${badge.unlocked ? 'text-gray-900' : 'text-gray-400'}`}
          >
            {badge.name}
          </Text>
          <View
            className="ml-2 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: tierColor + '30' }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: tierColor }}
            >
              {TIER_LABELS[badge.tier]}
            </Text>
          </View>
        </View>
        <Text
          className={`text-sm ${badge.unlocked ? 'text-gray-600' : 'text-gray-400'}`}
        >
          {badge.description}
        </Text>
        {badge.unlocked && badge.unlockedAt && (
          <Text className="text-xs text-gray-400 mt-1">
            Đạt được: {new Date(badge.unlockedAt).toLocaleDateString('vi-VN')}
          </Text>
        )}
      </View>
    </View>
  );
}
