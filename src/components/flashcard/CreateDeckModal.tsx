import {
  Modal,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

// Schema validate input — single source of truth cho cả type và validation
const deckSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên không được để trống')
    .max(50, 'Tên tối đa 50 ký tự'),
  description: z.string().max(200, 'Mô tả tối đa 200 ký tự').optional(),
});

type DeckFormData = z.infer<typeof deckSchema>;

interface CreateDeckModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DeckFormData) => Promise<void>;
}

export function CreateDeckModal({
  visible,
  onClose,
  onSubmit,
}: CreateDeckModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeckFormData>({
    resolver: zodResolver(deckSchema),
    defaultValues: { name: '', description: '' },
  });

  const handleFormSubmit = async (data: DeckFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      reset();
      onClose();
    } catch (err) {
      console.error('Create deck failed:', err);
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
          <Text className="text-lg font-semibold">Tạo bộ thẻ</Text>
          <View className="w-12" />
        </View>

        <View className="flex-1 px-4 pt-6">
          <View className="flex-row mb-2">
            <Text className="text-sm font-medium text-gray-700">Tên bộ thẻ </Text>
            <Text className="text-sm font-medium text-red-500">*</Text>
          </View>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base mb-1"
                placeholder="VD: Từ vựng IELTS Writing"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoFocus
              />
            )}
          />
          {errors.name && (
            <Text className="text-xs text-red-500 mb-2">
              {errors.name.message}
            </Text>
          )}

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
            Mô tả (tùy chọn)
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base h-24"
                placeholder="Mô tả ngắn về bộ thẻ này..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                textAlignVertical="top"
              />
            )}
          />
          {errors.description && (
            <Text className="text-xs text-red-500 mt-1">
              {errors.description.message}
            </Text>
          )}

          <View className="mt-8">
            <Button
              label="Tạo bộ thẻ"
              size="lg"
              isLoading={isSubmitting}
              onPress={handleSubmit(handleFormSubmit)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}