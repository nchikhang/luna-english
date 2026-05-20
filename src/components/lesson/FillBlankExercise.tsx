import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FillBlankContent } from '@/services/api/lessons';

interface Props {
  content: FillBlankContent;
  onSubmit: (correct: boolean, userAnswer: string) => void;
}

/**
 * Fill blank logic:
 * - Sentence chứa "_____" → hiển thị 2 phần (prefix, suffix) với TextInput ở giữa
 * - Accept-list: nếu user input match BẤT KỲ string nào trong correctAnswers (case-insensitive,
 *   trim space) → correct
 * - Sau khi check, hiển thị correct answer chính (correctAnswers[0]) nếu sai
 */
export function FillBlankExercise({ content, onSubmit }: Props) {
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);

  // Split sentence by ___ marker
  const parts = content.sentence.split(/_{3,}/);
  const prefix = content.prefix ?? parts[0] ?? '';
  const suffix = content.suffix ?? parts[1] ?? '';

  const isCorrect =
    checked &&
    content.correctAnswers.some(
      (correct) => correct.toLowerCase().trim() === answer.toLowerCase().trim()
    );

  const handleCheck = () => {
    if (!answer.trim()) return;
    setChecked(true);
  };

  const handleNext = () => {
    onSubmit(isCorrect, answer.trim());
  };

  return (
    <View className="flex-1 px-6">
      <View className="mt-4">
        <Text className="text-sm text-gray-500 uppercase font-semibold mb-2">
          Điền từ vào chỗ trống
        </Text>
        {content.hint && (
          <View className="bg-amber-50 rounded-xl p-3 mb-4 flex-row items-center">
            <Ionicons name="bulb" size={18} color="#f59e0b" />
            <Text className="ml-2 text-sm text-amber-800">Gợi ý: {content.hint}</Text>
          </View>
        )}
      </View>

      {/* Sentence with input */}
      <View className="bg-white rounded-2xl p-5 mt-2">
        <View className="flex-row flex-wrap items-baseline">
          {prefix.length > 0 && (
            <Text className="text-lg text-gray-900">{prefix}</Text>
          )}
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            editable={!checked}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="..."
            placeholderTextColor="#9ca3af"
            className={`text-lg font-bold mx-1 px-3 py-1 rounded-lg ${
              checked
                ? isCorrect
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
                : 'bg-indigo-50 text-indigo-700'
            }`}
            style={{ minWidth: 100, borderBottomWidth: 2, borderColor: '#6366f1' }}
          />
          {suffix.length > 0 && (
            <Text className="text-lg text-gray-900">{suffix}</Text>
          )}
        </View>

        {content.translation && (
          <Text className="text-sm text-gray-500 italic mt-3">{content.translation}</Text>
        )}
      </View>

      {/* Feedback */}
      {checked && (
        <View className={`p-4 rounded-2xl mt-4 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
          <View className="flex-row items-center mb-1">
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={isCorrect ? '#10b981' : '#ef4444'}
            />
            <Text
              className={`ml-2 font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}
            >
              {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
            </Text>
          </View>
          {!isCorrect && (
            <Text className="text-sm text-gray-700 mt-1">
              Đáp án đúng: <Text className="font-bold">{content.correctAnswers[0]}</Text>
              {content.correctAnswers.length > 1 && (
                <Text className="text-gray-500">
                  {' '}
                  (hoặc: {content.correctAnswers.slice(1).join(', ')})
                </Text>
              )}
            </Text>
          )}
        </View>
      )}

      <View className="flex-1" />

      <Pressable
        onPress={checked ? handleNext : handleCheck}
        disabled={!answer.trim()}
        className={`rounded-2xl py-4 items-center ${
          !answer.trim() ? 'bg-gray-300' : 'bg-indigo-600'
        }`}
      >
        <Text className="text-white font-bold text-base">
          {checked ? 'Tiếp tục →' : 'Kiểm tra'}
        </Text>
      </Pressable>
    </View>
  );
}
