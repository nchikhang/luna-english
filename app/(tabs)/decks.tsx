import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DecksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold mb-2">Bộ thẻ của bạn</Text>
        <Text className="text-base text-gray-600">
          Coming soon...
        </Text>
      </View>
    </SafeAreaView>
  );
}
