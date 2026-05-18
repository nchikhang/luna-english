import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MultipleChoiceQuestion as MCQuestion } from '@/lib/quiz';

interface MultipleChoiceProps {
  question: MCQuestion;
  onAnswered: (answer: string, isCorrect: boolean) => void;
  onNext: () => void;
}

type AnswerState = 'idle' | 'answered';

/**
 * Multiple Choice UI:
 * 1. Hiện 4 options
 * 2. User tap → highlight đúng/sai → disable other options
 * 3. Hiện nút "Tiếp theo"
 */
export function MultipleChoice({
  question,
  onAnswered,
  onNext,
}: MultipleChoiceProps) {
  const [state, setState] = useState<AnswerState>('idle');
  const [selected, setSelected] = useState<string | null>(null);

  // Reset state khi question đổi
  useEffect(() => {
    setState('idle');
    setSelected(null);
  }, [question.id]);

  const handleSelect = (option: string) => {
    if (state !== 'idle') return;
    const isCorrect = option === question.correctAnswer;
    setSelected(option);
    setState('answered');
    onAnswered(option, isCorrect);
  };

  return (
    <View className="flex-1 px-4 py-6">
      <Text className="text-xs font-semibold text-primary-600 uppercase mb-3">
        Trắc nghiệm
      </Text>
      <Text className="text-xl font-bold text-gray-900 mb-6">
        {question.prompt}
      </Text>

      <View className="gap-3">
        {question.options.map((option, idx) => (
          <OptionButton
            key={`${question.id}-${idx}`}
            label={option}
            index={idx}
            state={getOptionState(option, selected, question.correctAnswer, state)}
            onPress={() => handleSelect(option)}
          />
        ))}
      </View>

      {state === 'answered' ? (
        <Pressable
          onPress={onNext}
          className="mt-6 bg-primary-600 py-4 rounded-2xl active:bg-primary-700"
        >
          <Text className="text-white font-semibold text-center text-base">
            Tiếp theo
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type OptionState = 'idle' | 'correct' | 'incorrect' | 'disabled';

function getOptionState(
  option: string,
  selected: string | null,
  correctAnswer: string,
  state: AnswerState
): OptionState {
  if (state === 'idle') return 'idle';
  if (option === correctAnswer) return 'correct';
  if (option === selected) return 'incorrect';
  return 'disabled';
}

function OptionButton({
  label,
  index,
  state,
  onPress,
}: {
  label: string;
  index: number;
  state: OptionState;
  onPress: () => void;
}) {
  const letter = String.fromCharCode(65 + index); // A, B, C, D

  const classes = {
    idle: 'bg-white border-gray-200 active:bg-gray-50',
    correct: 'bg-green-50 border-green-500',
    incorrect: 'bg-red-50 border-red-500',
    disabled: 'bg-gray-100 border-gray-200 opacity-50',
  }[state];

  const textColor = {
    idle: 'text-gray-900',
    correct: 'text-green-900',
    incorrect: 'text-red-900',
    disabled: 'text-gray-500',
  }[state];

  const letterBg = {
    idle: 'bg-gray-100',
    correct: 'bg-green-500',
    incorrect: 'bg-red-500',
    disabled: 'bg-gray-200',
  }[state];

  const letterColor = {
    idle: 'text-gray-700',
    correct: 'text-white',
    incorrect: 'text-white',
    disabled: 'text-gray-500',
  }[state];

  return (
    <Pressable
      onPress={onPress}
      disabled={state !== 'idle'}
      className={`flex-row items-center p-4 rounded-2xl border-2 ${classes}`}
    >
      <View
        className={`w-8 h-8 rounded-full ${letterBg} items-center justify-center mr-3`}
      >
        <Text className={`font-bold ${letterColor}`}>{letter}</Text>
      </View>
      <Text className={`flex-1 text-base ${textColor}`}>{label}</Text>
      {state === 'correct' ? (
        <Ionicons name="checkmark-circle" size={22} color="#10b981" />
      ) : null}
      {state === 'incorrect' ? (
        <Ionicons name="close-circle" size={22} color="#ef4444" />
      ) : null}
    </Pressable>
  );
}
