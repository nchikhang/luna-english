import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useDictionary } from '@/hooks/useDictionary';
import { speak } from '@/services/speech';

const cardSchema = z.object({
  word: z.string().min(1, 'Vui lòng nhập từ').max(50),
  meaning: z.string().min(1, 'Vui lòng nhập nghĩa').max(200),
  pronunciation: z.string().max(50).optional(),
  exampleSentence: z.string().max(200).optional(),
});

type CardFormData = z.infer<typeof cardSchema>;

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CardFormData) => Promise<void>;
}

export function AddCardModal({ visible, onClose, onSubmit }: AddCardModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      word: '',
      meaning: '',
      pronunciation: '',
      exampleSentence: '',
    },
  });

  // Watch field word để fetch dictionary
  const wordInput = watch('word');
  const debouncedWord = useDebounce(wordInput, 500);
  const { data: dictData, isLoading: isLooking, error: dictError } =
    useDictionary(debouncedWord);

  // Auto-fill pronunciation và example khi có data từ API
  // (chỉ fill nếu user chưa nhập)
  useEffect(() => {
    if (!dictData) return;

    const currentPronunciation = watch('pronunciation');
    if (!currentPronunciation && dictData.pronunciation) {
      setValue('pronunciation', dictData.pronunciation);
    }

    const currentExample = watch('exampleSentence');
    if (!currentExample && dictData.examples[0]) {
      setValue('exampleSentence', dictData.examples[0]);
    }
  }, [dictData, setValue, watch]);

  const handleApplyDefinition = (definition: string) => {
    setValue('meaning', definition);
  };

  const handleApplyExample = (example: string) => {
    setValue('exampleSentence', example);
  };

  const handleSpeak = () => {
    const word = watch('word');
    if (word) speak(word);
  };

  const handleFormSubmit = async (data: CardFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      reset();
      onClose();
    } catch (err) {
      console.error('Create card failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <Pressable onPress={handleClose} hitSlop={10}>
            <Text className="text-base text-gray-600">Hủy</Text>
          </Pressable>
          <Text className="text-lg font-semibold">Thêm thẻ mới</Text>
          <View className="w-12" />
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          <View className="flex-row mb-2">
            <Text className="text-sm font-medium text-gray-700">Từ tiếng Anh </Text>
            <Text className="text-sm font-medium text-red-500">*</Text>
          </View>
          <View className="flex-row items-center">
            <Controller
              control={control}
              name="word"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base"
                  placeholder="VD: ephemeral"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              )}
            />
            <Pressable
              onPress={handleSpeak}
              hitSlop={10}
              className="ml-2 p-3 bg-primary-50 rounded-full active:bg-primary-100"
            >
              <Ionicons name="volume-high" size={20} color="#6366f1" />
            </Pressable>
          </View>
          {errors.word ? (
            <Text className="text-xs text-red-500 mt-1">{errors.word.message}</Text>
          ) : null}

          {isLooking ? (
            <View className="flex-row items-center mt-3">
              <ActivityIndicator size="small" color="#6366f1" />
              <Text className="text-sm text-gray-500 ml-2">Đang tra từ điển...</Text>
            </View>
          ) : null}

          {dictError ? (
            <View className="flex-row items-start mt-2">
              <Ionicons
                name={dictError.code === 'NETWORK' ? 'cloud-offline-outline' : 'information-circle-outline'}
                size={16}
                color={dictError.code === 'NETWORK' ? '#dc2626' : '#d97706'}
                style={{ marginTop: 2 }}
              />
              <Text
                className={`text-xs ml-1 flex-1 ${
                  dictError.code === 'NETWORK' ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                {dictError.code === 'NETWORK'
                  ? 'Không có kết nối mạng. Bạn vẫn có thể nhập nghĩa thủ công.'
                  : dictError.code === 'NOT_FOUND'
                    ? 'Không tìm thấy trong từ điển. Bạn có thể nhập nghĩa thủ công.'
                    : 'Lỗi tra từ điển. Bạn có thể nhập nghĩa thủ công.'}
              </Text>
            </View>
          ) : null}

          {dictData ? (
            <View className="mt-3 p-3 bg-primary-50 rounded-xl">
              <Text className="text-xs font-semibold text-primary-700 mb-2 uppercase">
                Gợi ý từ Dictionary ({dictData.partOfSpeech})
              </Text>
              {dictData.definitions.slice(0, 3).map((def, idx) => (
                <Pressable
                  key={`def-${idx}`}
                  onPress={() => handleApplyDefinition(def)}
                  className="py-2 active:opacity-50"
                >
                  <Text className="text-sm text-gray-800">
                    {idx + 1}. {def}
                  </Text>
                  <Text className="text-xs text-primary-600 mt-1">
                    Tap để dùng làm nghĩa
                  </Text>
                </Pressable>
              ))}
              {dictData.examples.length > 0 ? (
                <View className="mt-2 pt-2 border-t border-primary-100">
                  <Text className="text-xs font-semibold text-primary-700 mb-1 uppercase">
                    Ví dụ
                  </Text>
                  {dictData.examples.slice(0, 2).map((ex, idx) => (
                    <Pressable
                      key={`ex-${idx}`}
                      onPress={() => handleApplyExample(ex)}
                      className="py-1 active:opacity-50"
                    >
                      <Text className="text-sm text-gray-700 italic">"{ex}"</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="flex-row mt-4 mb-2">
            <Text className="text-sm font-medium text-gray-700">Nghĩa </Text>
            <Text className="text-sm font-medium text-red-500">*</Text>
          </View>
          <Controller
            control={control}
            name="meaning"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base h-20"
                placeholder="Nghĩa tiếng Việt hoặc giải thích"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                textAlignVertical="top"
              />
            )}
          />
          {errors.meaning ? (
            <Text className="text-xs text-red-500 mt-1">{errors.meaning.message}</Text>
          ) : null}

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
            Phiên âm
          </Text>
          <Controller
            control={control}
            name="pronunciation"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="VD: /ɪˈfem.ər.əl/"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
              />
            )}
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
            Câu ví dụ
          </Text>
          <Controller
            control={control}
            name="exampleSentence"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base h-20"
                placeholder="VD: The beauty of cherry blossoms is ephemeral."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                textAlignVertical="top"
              />
            )}
          />

          <View className="my-6">
            <Button
              label="Thêm thẻ"
              size="lg"
              isLoading={isSubmitting}
              onPress={handleSubmit(handleFormSubmit)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}