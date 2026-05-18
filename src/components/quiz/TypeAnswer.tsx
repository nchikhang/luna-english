import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TypeAnswerQuestion } from '@/lib/quiz';
import { checkTypeAnswer } from '@/lib/quiz';
import { speak } from '@/services/speech';

interface TypeAnswerProps {
  question: TypeAnswerQuestion;
  onAnswered: (answer: string, isCorrect: boolean) => void;
  onNext: () => void;
}

type AnswerState = 'idle' | 'answered';

/**
 * Type Answer UI:
 * 1. User gõ đáp án vào TextInput
 * 2. Nhấn "Kiểm tra" hoặc Enter → check fuzzy match
 * 3. Hiện feedback đúng/sai, đáp án đúng nếu sai
 * 4. Phát âm đáp án đúng cho user học
 * 5. Nút "Tiếp theo"
 */
export function TypeAnswer({
  question,
  onAnswered,
  onNext,
}: TypeAnswerProps) {
  const [input, setInput] = useState('');
  const [state, setState] = useState<AnswerState>('idle');
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reset state khi question đổi + focus
  useEffect(() => {
    setInput('');
    setState('idle');
    setIsCorrect(false);
    // Focus với delay nhẹ để keyboard hiện đúng lúc
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [question.id]);

  const handleSubmit = () => {
    if (state !== 'idle' || !input.trim()) return;

    const correct = checkTypeAnswer(input, question);
    setIsCorrect(correct);
    setState('answered');
    onAnswered(input, correct);

    // Tự phát âm đáp án đúng (để học)
    setTimeout(() => speak(question.correctAnswer), 200);
  };

  const handleSpeak = () => {
    speak(question.correctAnswer);
  };

  return (
    <View className="flex-1 px-4 py-6">
      <Text className="text-xs font-semibold text-primary-600 uppercase mb-3">
        Gõ đáp án
      </Text>
      <Text className="text-xl font-bold text-gray-900 mb-6">
        {question.prompt}
      </Text>

      {/* Input field */}
      <View
        className={`border-2 rounded-2xl bg-white px-4 py-3 mb-3 ${
          state === 'idle'
            ? 'border-gray-300'
            : isCorrect
              ? 'border-green-500'
              : 'border-red-500'
        }`}
      >
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          editable={state === 'idle'}
          placeholder="Gõ từ tiếng Anh..."
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="done"
          className="text-base text-gray-900"
        />
      </View>

      {/* Feedback sau khi submit */}
      {state === 'answered' ? (
        <View
          className={`rounded-2xl p-4 mb-3 ${
            isCorrect ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <View className="flex-row items-center mb-2">
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={isCorrect ? '#10b981' : '#ef4444'}
            />
            <Text
              className={`ml-2 font-semibold ${
                isCorrect ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
            </Text>
          </View>

          {!isCorrect ? (
            <View className="flex-row items-center mt-1">
              <Text className="text-sm text-gray-700">Đáp án đúng: </Text>
              <Text className="text-base font-bold text-gray-900 ml-1">
                {question.correctAnswer}
              </Text>
              <Pressable
                onPress={handleSpeak}
                hitSlop={10}
                className="ml-2 p-1.5 bg-white rounded-full active:bg-gray-100"
              >
                <Ionicons name="volume-high" size={16} color="#6366f1" />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center mt-1">
              <Text className="text-sm text-gray-700">{question.correctAnswer}</Text>
              <Pressable
                onPress={handleSpeak}
                hitSlop={10}
                className="ml-2 p-1.5 bg-white rounded-full active:bg-gray-100"
              >
                <Ionicons name="volume-high" size={16} color="#6366f1" />
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {/* Action button */}
      {state === 'idle' ? (
        <Pressable
          onPress={handleSubmit}
          disabled={!input.trim()}
          className={`py-4 rounded-2xl ${
            input.trim()
              ? 'bg-primary-600 active:bg-primary-700'
              : 'bg-gray-300'
          }`}
        >
          <Text className="text-white font-semibold text-center text-base">
            Kiểm tra
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onNext}
          className="py-4 bg-primary-600 rounded-2xl active:bg-primary-700"
        >
          <Text className="text-white font-semibold text-center text-base">
            Tiếp theo
          </Text>
        </Pressable>
      )}
    </View>
  );
}
