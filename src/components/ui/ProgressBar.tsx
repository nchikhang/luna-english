import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = total > 0 ? (current / total) * 100 : 0;
    progress.value = withTiming(target, { duration: 400 });
  }, [current, total, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View className="w-full">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-gray-600">
          Tiến độ
        </Text>
        <Text className="text-sm font-medium text-primary-700">
          {current} / {total}
        </Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <Animated.View
          style={fillStyle}
          className="h-full bg-primary-600 rounded-full"
        />
      </View>
    </View>
  );
}