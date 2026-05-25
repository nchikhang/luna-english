/**
 * Admin upload exam screen.
 *
 * Flow:
 * 1. Tap "Chọn file" → DocumentPicker
 * 2. Upload file → backend parse → preview JSON
 * 3. Navigate to /admin/review-exam với parsed JSON trong store
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { parseExamDocx, type ParsedExamPreview } from '@/services/api/exam';
import { useAdminExamStore } from '@/stores/adminExamStore';

export default function UploadExamScreen() {
  const router = useRouter();
  const setParsed = useAdminExamStore((s) => s.setParsed);

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.docx',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      setSelectedFile(asset);
    } catch (err: any) {
      Alert.alert('Lỗi chọn file', err.message);
    }
  }

  async function onUpload() {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const parsed = await parseExamDocx(selectedFile.uri, selectedFile.name);
      setParsed(parsed);
      router.push('/admin/review-exam');
    } catch (err: any) {
      Alert.alert(
        'Parse thất bại',
        err.message || 'Không thể đọc file DOCX. Kiểm tra format file.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Upload đề thi' }} />
      <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
        {/* Instructions */}
        <View className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
          <Text className="text-blue-900 font-semibold mb-2">📌 Hướng dẫn</Text>
          <Text className="text-blue-800 text-sm leading-5">
            1. Đề thi phải có định dạng .docx{'\n'}
            2. Câu hỏi bắt đầu với "Question N."{'\n'}
            3. Đáp án A/B/C/D cho từng câu{'\n'}
            4. Phần "ĐÁP ÁN" ở cuối: chữ cái đáp án đúng phải có{' '}
            <Text className="font-bold">màu chữ ĐỎ</Text>{'\n'}
            5. Sau khi upload, bạn có thể review/edit trước khi lưu
          </Text>
        </View>

        {/* File picker */}
        <Pressable
          className="bg-white border-2 border-dashed border-slate-300 active:border-indigo-400 rounded-xl p-6 items-center"
          onPress={onPick}
        >
          {selectedFile ? (
            <>
              <Text className="text-2xl mb-2">📄</Text>
              <Text className="text-base font-medium text-slate-900" numberOfLines={2}>
                {selectedFile.name}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">
                {(selectedFile.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB
              </Text>
              <Text className="text-xs text-indigo-600 mt-2">Tap để chọn file khác</Text>
            </>
          ) : (
            <>
              <Text className="text-4xl mb-2">📤</Text>
              <Text className="text-base font-semibold text-slate-700">
                Tap để chọn file
              </Text>
              <Text className="text-xs text-slate-500 mt-1">.docx, tối đa 10MB</Text>
            </>
          )}
        </Pressable>

        {/* Upload button */}
        {selectedFile && (
          <Pressable
            className="bg-indigo-600 active:bg-indigo-700 rounded-xl py-4 mt-4 items-center"
            onPress={onUpload}
            disabled={uploading}
          >
            {uploading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white font-semibold ml-2">Đang phân tích...</Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-base">Upload & Phân tích</Text>
            )}
          </Pressable>
        )}

        {uploading && (
          <Text className="text-xs text-slate-500 text-center mt-3 italic">
            Quá trình có thể mất 10-30 giây tùy kích thước file
          </Text>
        )}
      </ScrollView>
    </>
  );
}
