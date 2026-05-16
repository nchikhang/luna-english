import { Link } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-6xl mb-4">🌙</Text>
        <Text className="text-3xl font-bold text-primary-900 mb-2">
          Luna English
        </Text>
        <Text className="text-base text-primary-700 mb-12 text-center">
          Học tiếng Anh mỗi ngày, từ vựng ghi nhớ lâu dài
        </Text>

        <Link href="/(tabs)/learn" asChild>
          <Pressable className="bg-primary-600 px-8 py-4 rounded-full active:bg-primary-700">
            <Text className="text-white font-semibold text-base">
              Bắt đầu học
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
