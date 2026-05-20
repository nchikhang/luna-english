import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchLeaderboard, type LeaderboardResult } from '@/services/api/badges';

type Scope = 'alltime' | 'week';

export default function LeaderboardScreen() {
  const [scope, setScope] = useState<Scope>('alltime');
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (s: Scope) => {
    try {
      const result = await fetchLeaderboard(s);
      setData(result);
    } catch (err) {
      console.warn('[Leaderboard] Load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(scope);
    }, [load, scope])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(scope);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <Stack.Screen options={{ title: 'Bảng xếp hạng' }} />

      {/* Tab switcher */}
      <View className="flex-row mx-4 mt-4 mb-2 bg-gray-200 rounded-full p-1">
        <TabButton
          label="Tổng"
          active={scope === 'alltime'}
          onPress={() => setScope('alltime')}
        />
        <TabButton
          label="Tuần này"
          active={scope === 'week'}
          onPress={() => setScope('week')}
        />
      </View>

      {/* My rank card */}
      {data && (
        <View className="mx-4 mt-2 mb-2 bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex-row items-center">
          <View className="bg-indigo-600 w-12 h-12 rounded-full items-center justify-center mr-3">
            <Text className="text-white font-bold">
              {data.myRank !== null ? `#${data.myRank}` : '—'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-600">Vị trí của bạn</Text>
            <Text className="text-lg font-bold text-indigo-700">
              {data.myXp.toLocaleString()} XP
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={data?.entries ?? []}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => <LeaderRow entry={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center mt-12">
              <Text className="text-4xl mb-3">🏆</Text>
              <Text className="text-gray-500 text-center px-8">
                {scope === 'week'
                  ? 'Chưa ai học tuần này. Hãy là người đầu tiên!'
                  : 'Bảng xếp hạng đang trống.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2 rounded-full items-center ${active ? 'bg-white' : ''}`}
      style={
        active
          ? {
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }
          : {}
      }
    >
      <Text className={`font-semibold ${active ? 'text-indigo-700' : 'text-gray-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function LeaderRow({ entry }: { entry: { rank: number; displayName: string; level: number; xp: number; isMe?: boolean } }) {
  const isTop3 = entry.rank <= 3;
  const medalIcons = ['🥇', '🥈', '🥉'];
  const rankColor =
    entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#6b7280';

  return (
    <View
      className={`mx-4 mb-2 rounded-2xl p-3 flex-row items-center border ${
        entry.isMe ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'
      }`}
    >
      <View className="w-12 items-center mr-2">
        {isTop3 ? (
          <Text className="text-2xl">{medalIcons[entry.rank - 1]}</Text>
        ) : (
          <Text className="font-bold text-base" style={{ color: rankColor }}>
            #{entry.rank}
          </Text>
        )}
      </View>

      <View className="flex-1 ml-2">
        <View className="flex-row items-center">
          <Text className={`font-semibold ${entry.isMe ? 'text-indigo-700' : 'text-gray-900'}`}>
            {entry.displayName}
          </Text>
          {entry.isMe && (
            <View className="ml-2 bg-indigo-600 px-2 py-0.5 rounded-full">
              <Text className="text-white text-xs font-bold">Bạn</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-gray-500">Cấp {entry.level}</Text>
      </View>

      <View className="items-end">
        <Text className="font-bold text-amber-600">
          {entry.xp.toLocaleString()}
        </Text>
        <Text className="text-xs text-gray-500">XP</Text>
      </View>
    </View>
  );
}
