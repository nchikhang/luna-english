import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ListenChooseQuestion } from '@/lib/quiz';
import { speak, stopSpeaking } from '@/services/speech';

interface ListenChooseProps {
  question: ListenChooseQuestion;
  onAnswered: (answer: string, isCorrect: boolean) => void;
  onNext: () => void;
}

type AnswerState = 'idle' | 'answered';

export function ListenChoose({
  question,
  onAnswered,
  onNext,
}: ListenChooseProps) {
  const [state, setState] = useState<AnswerState>('idle');
  const [selected, setSelected] = useState<string | null>(null);

  // Reset + auto-play khi question đổi.
  // Cleanup: stop TTS khi unmount hoặc trước khi question đổi
  useEffect(() => {
    setState('idle');
    setSelected(null);

    const timer = setTimeout(() => speak(question.audioText), 300);

    return () => {
      clearTimeout(timer);
      stopSpeaking(); // dừng phát nếu user sang câu tiếp khi đang phát
    };
  }, [question.id]);

  const handleReplay = () => {
    speak(question.audioText); // speak() đã tự stop lệnh trước
  };

  const handleSelect = (option: string) => {
    if (state !== 'idle') return;
    const isCorrect = option === question.correctAnswer;
    setSelected(option);
    setState('answered');
    onAnswered(option, isCorrect);

    setTimeout(() => speak(question.correctAnswer), 400);
  };

  return (
    <View className="flex-1 px-4 py-6">
      <Text className="text-xs font-semibold text-primary-600 uppercase mb-3">
        Nghe và chọn
      </Text>
      <Text className="text-xl font-bold text-gray-900 mb-6">
        Bạn nghe được từ nào?
      </Text>

      <View className="items-center mb-8">
        <Pressable
          onPress={handleReplay}
          className="w-24 h-24 bg-primary-600 rounded-full items-center justify-center active:bg-primary-700"
          style={{
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }}
        >
          <Ionicons name="volume-high" size={44} color="#fff" />
        </Pressable>
        <Text className="text-sm text-gray-500 mt-3">
          Tap để nghe lại
        </Text>
      </View>

      <View className="gap-3">
        {question.options.map((option, idx) => (
          <OptionButton
            key={`${question.id}-${idx}`}
            label={option}
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
  state,
  onPress,
}: {
  label: string;
  state: OptionState;
  onPress: () => void;
}) {
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

  return (
    <Pressable
      onPress={onPress}
      disabled={state !== 'idle'}
      className={`flex-row items-center justify-between p-4 rounded-2xl border-2 ${classes}`}
    >
      <Text className={`flex-1 text-base font-medium ${textColor}`}>
        {label}
      </Text>
      {state === 'correct' ? (
        <Ionicons name="checkmark-circle" size={22} color="#10b981" />
      ) : null}
      {state === 'incorrect' ? (
        <Ionicons name="close-circle" size={22} color="#ef4444" />
      ) : null}
    </Pressable>
  );
}