import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MultipleChoiceContent } from '@/services/api/lessons';

interface Props {
  content: MultipleChoiceContent;
  onSubmit: (correct: boolean, userAnswer: string) => void;
}

export function MultipleChoiceExercise({ content, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    if (selected === null) return;
    setChecked(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    const correct = selected === content.correctIndex;
    onSubmit(correct, content.options[selected]);
  };

  const isCorrect = selected === content.correctIndex;

  return (
    <View className="flex-1 px-6">
      <View className="mt-4">
        <Text className="text-xl font-bold text-gray-900 mb-2">{content.question}</Text>
        {content.questionVi && (
          <Text className="text-sm text-gray-500 italic">{content.questionVi}</Text>
        )}
      </View>

      <View className="mt-6 flex-1">
        {content.options.map((option, idx) => {
          const isThis = selected === idx;
          const isThisCorrect = idx === content.correctIndex;

          let bgColor = 'bg-white border-gray-300';
          let textColor = 'text-gray-900';

          if (checked) {
            if (isThis && isCorrect) {
              bgColor = 'bg-green-100 border-green-500';
              textColor = 'text-green-700';
            } else if (isThis && !isCorrect) {
              bgColor = 'bg-red-100 border-red-500';
              textColor = 'text-red-700';
            } else if (isThisCorrect) {
              // Highlight correct nếu user chọn sai
              bgColor = 'bg-green-50 border-green-400';
              textColor = 'text-green-700';
            }
          } else if (isThis) {
            bgColor = 'bg-indigo-50 border-indigo-500';
            textColor = 'text-indigo-700';
          }

          return (
            <Pressable
              key={idx}
              disabled={checked}
              onPress={() => setSelected(idx)}
              className={`mb-3 rounded-2xl border-2 p-4 flex-row items-center ${bgColor}`}
            >
              <View className="w-8 h-8 rounded-full border-2 border-current items-center justify-center mr-3">
                <Text className={`font-bold ${textColor}`}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text className={`text-base flex-1 ${textColor}`}>{option}</Text>
              {checked && isThis && isCorrect && (
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              )}
              {checked && isThis && !isCorrect && (
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              )}
            </Pressable>
          );
        })}
      </View>

      {checked && content.explanation && (
        <View className={`p-4 rounded-2xl mb-4 ${isCorrect ? 'bg-green-50' : 'bg-amber-50'}`}>
          <Text className="font-semibold text-sm mb-1 text-gray-700">
            {isCorrect ? '✓ Đúng rồi!' : '💡 Giải thích'}
          </Text>
          <Text className="text-sm text-gray-700">{content.explanation}</Text>
        </View>
      )}

      <Pressable
        onPress={checked ? handleNext : handleCheck}
        disabled={selected === null}
        className={`rounded-2xl py-4 items-center ${
          selected === null ? 'bg-gray-300' : 'bg-indigo-600'
        }`}
      >
        <Text className="text-white font-bold text-base">
          {checked ? 'Tiếp tục →' : 'Kiểm tra'}
        </Text>
      </Pressable>
    </View>
  );
}
