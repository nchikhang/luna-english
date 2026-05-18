import { Pressable, Text, View } from 'react-native';
import type { ReviewRating } from '@/types';
import { ratingFeedback } from '@/services/haptics';

interface RatingButtonsProps {
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

interface RatingOption {
  label: string;
  rating: ReviewRating;
  bgClass: string;
  activeClass: string;
  description: string;
}

const OPTIONS: RatingOption[] = [
  { label: 'Again', rating: 1, bgClass: 'bg-red-500', activeClass: 'active:bg-red-600', description: 'Quên' },
  { label: 'Hard', rating: 3, bgClass: 'bg-amber-500', activeClass: 'active:bg-amber-600', description: 'Khó' },
  { label: 'Good', rating: 4, bgClass: 'bg-green-500', activeClass: 'active:bg-green-600', description: 'OK' },
  { label: 'Easy', rating: 5, bgClass: 'bg-blue-500', activeClass: 'active:bg-blue-600', description: 'Dễ' },
];

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  const handlePress = (rating: ReviewRating) => {
    ratingFeedback(rating);
    onRate(rating);
  };

  return (
    <View className="flex-row gap-2">
      {OPTIONS.map((opt) => (
        <Pressable
          key={opt.label}
          onPress={() => handlePress(opt.rating)}
          disabled={disabled}
          className={`flex-1 py-3 rounded-2xl ${opt.bgClass} ${opt.activeClass} ${disabled ? 'opacity-50' : ''}`}
        >
          <Text className="text-white font-semibold text-base text-center">
            {opt.label}
          </Text>
          <Text className="text-white text-xs text-center opacity-80 mt-0.5">
            {opt.description}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}