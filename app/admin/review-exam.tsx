/**
 * Admin review parsed exam screen.
 * Fixed:
 * - Safe area bottom cho nút "Lưu đề thi" (không bị navigation bar che)
 * - Lọc warnings: chỉ hiện ERROR + WARNING (ẩn INFO mặc định)
 *   + Toggle "Hiện tất cả" để xem INFO khi cần
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminExamStore } from '@/stores/adminExamStore';
import { saveExam, type ParsedExamPreview } from '@/services/api/exam';

export default function ReviewExamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const parsed = useAdminExamStore((s) => s.parsed);
  const updateExamMeta = useAdminExamStore((s) => s.updateExamMeta);
  const updateQuestion = useAdminExamStore((s) => s.updateQuestion);
  const reset = useAdminExamStore((s) => s.reset);

  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  // Filter warnings — ẩn INFO mặc định, chỉ hiển thị nếu user toggle
  const { errorWarnings, infoWarnings, displayedWarnings } = useMemo(() => {
    const all = parsed?.warnings ?? [];
    const errors = all.filter(
      (w) => w.startsWith('ERROR:') || w.startsWith('WARNING:')
    );
    const infos = all.filter((w) => w.startsWith('INFO:'));
    return {
      errorWarnings: errors,
      infoWarnings: infos,
      displayedWarnings: showAllWarnings ? all : errors,
    };
  }, [parsed?.warnings, showAllWarnings]);

  if (!parsed) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-slate-700 text-center mb-4">
          Không có dữ liệu. Upload file mới.
        </Text>
        <Pressable
          className="bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => router.replace('/admin/upload-exam')}
        >
          <Text className="text-white font-semibold">Upload file</Text>
        </Pressable>
      </View>
    );
  }

  const parsedData = parsed;

  const validCount = parsedData.questions.filter((q) => q.correctAnswer !== null).length;
  const missingAnswerCount = parsedData.questions.length - validCount;

  async function onSave() {
    if (validCount === 0) {
      Alert.alert(
        'Không thể lưu',
        'Không có câu hỏi nào có đáp án. Vui lòng bổ sung đáp án trước.'
      );
      return;
    }

    if (missingAnswerCount > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Có câu thiếu đáp án',
          `${missingAnswerCount} câu chưa có đáp án sẽ bị BỎ QUA. Vẫn lưu?`,
          [
            { text: 'Quay lại', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Lưu', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const result = await saveExam(parsedData);
      Alert.alert(
        'Đã lưu thành công',
        `Đề thi đã lưu ở trạng thái "Bản nháp". Bạn có muốn xuất bản ngay?`,
        [
          {
            text: 'Để sau',
            onPress: () => {
              reset();
              router.replace('/(tabs)/exams');
            },
          },
          {
            text: 'Xuất bản',
            onPress: async () => {
              try {
                const { publishExam } = await import('@/services/api/exam');
                await publishExam(result.id);
                reset();
                router.replace('/(tabs)/exams');
              } catch (err: any) {
                Alert.alert('Xuất bản thất bại', err.message);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lưu thất bại', err.message);
    } finally {
      setSaving(false);
    }
  }

  const editingQuestionData =
    editingQuestion !== null
      ? parsedData.questions.find((q) => q.number === editingQuestion)
      : null;

  return (
    <>
      <Stack.Screen options={{ title: 'Review đề thi' }} />
      <ScrollView className="flex-1 bg-slate-50">
        {/* Summary */}
        <View className="bg-white px-4 py-4 border-b border-slate-200">
          <Text className="text-xs text-slate-500 mb-1">Đã phân tích</Text>
          <Text className="text-lg font-bold text-slate-900">{parsedData.title}</Text>
          <Text className="text-sm text-slate-600 mt-1">
            {parsedData.subject} {parsedData.grade && `· ${parsedData.grade}`}
          </Text>

          <View className="flex-row mt-4">
            <View className="flex-1 items-center bg-slate-50 rounded-lg py-2 mr-1">
              <Text className="text-xl font-bold text-slate-900">{parsedData.totalQuestions}</Text>
              <Text className="text-xs text-slate-500">Câu hỏi</Text>
            </View>
            <View
              className={`flex-1 items-center rounded-lg py-2 mx-1 ${
                validCount === parsedData.totalQuestions ? 'bg-green-50' : 'bg-amber-50'
              }`}
            >
              <Text
                className={`text-xl font-bold ${
                  validCount === parsedData.totalQuestions ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                {validCount}
              </Text>
              <Text
                className={`text-xs ${
                  validCount === parsedData.totalQuestions ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                Có đáp án
              </Text>
            </View>
            <View
              className={`flex-1 items-center rounded-lg py-2 ml-1 ${
                missingAnswerCount > 0 ? 'bg-red-50' : 'bg-slate-50'
              }`}
            >
              <Text
                className={`text-xl font-bold ${
                  missingAnswerCount > 0 ? 'text-red-700' : 'text-slate-400'
                }`}
              >
                {missingAnswerCount}
              </Text>
              <Text className={`text-xs ${missingAnswerCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                Thiếu
              </Text>
            </View>
          </View>
        </View>

        {/* Warnings - chỉ hiển thị nếu có ERROR/WARNING (ẩn INFO mặc định) */}
        {displayedWarnings.length > 0 && (
          <View className="bg-amber-50 border-l-4 border-amber-500 m-4 rounded-lg p-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-amber-900 font-semibold">
                ⚠️ Cảnh báo ({errorWarnings.length})
              </Text>
              {infoWarnings.length > 0 && (
                <Pressable onPress={() => setShowAllWarnings((s) => !s)}>
                  <Text className="text-amber-700 text-xs font-medium">
                    {showAllWarnings
                      ? 'Ẩn INFO'
                      : `Xem +${infoWarnings.length} INFO`}
                  </Text>
                </Pressable>
              )}
            </View>
            {displayedWarnings.slice(0, 5).map((w, i) => (
              <Text key={i} className="text-amber-700 text-xs mt-1">
                • {w}
              </Text>
            ))}
            {displayedWarnings.length > 5 && (
              <Text className="text-amber-600 text-xs mt-1 italic">
                ...và {displayedWarnings.length - 5} cảnh báo khác
              </Text>
            )}
          </View>
        )}

        {/* Khi không có ERROR/WARNING + có INFO → show 1 banner xanh */}
        {errorWarnings.length === 0 && infoWarnings.length > 0 && (
          <View className="bg-green-50 border-l-4 border-green-500 m-4 rounded-lg p-3">
            <Text className="text-green-900 font-semibold">
              ✓ Không có lỗi nghiêm trọng
            </Text>
            <Pressable onPress={() => setShowAllWarnings((s) => !s)} className="mt-1">
              <Text className="text-green-700 text-xs">
                {showAllWarnings
                  ? 'Ẩn thông tin chi tiết'
                  : `${infoWarnings.length} thông tin (câu fill-in-blank trong đoạn văn) — Xem`}
              </Text>
            </Pressable>
            {showAllWarnings &&
              infoWarnings.slice(0, 5).map((w, i) => (
                <Text key={i} className="text-green-700 text-xs mt-1">
                  • {w}
                </Text>
              ))}
            {showAllWarnings && infoWarnings.length > 5 && (
              <Text className="text-green-600 text-xs mt-1 italic">
                ...và {infoWarnings.length - 5} thông tin khác
              </Text>
            )}
          </View>
        )}

        {/* Sections */}
        {parsedData.sections.length > 0 && (
          <View className="px-4 py-2">
            <Text className="text-xs font-semibold text-slate-500 mb-2">
              CÁC PHẦN ({parsedData.sections.length})
            </Text>
            {parsedData.sections.map((s, i) => (
              <View key={i} className="bg-white rounded-lg p-3 mb-2 border border-slate-200">
                <Text className="text-sm font-medium text-slate-700" numberOfLines={2}>
                  {s.title}
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Câu {s.questionRange[0]} - {s.questionRange[1]}
                </Text>
                {s.context && (
                  <Text className="text-xs text-slate-600 mt-2" numberOfLines={3}>
                    {s.context.substring(0, 200)}...
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Questions list */}
        <View className="px-4 py-2">
          <Text className="text-xs font-semibold text-slate-500 mb-2">
            CÂU HỎI ({parsedData.questions.length})
          </Text>
          {parsedData.questions.map((q) => (
            <Pressable
              key={q.number}
              className="bg-white rounded-lg p-3 mb-2 border border-slate-200 active:bg-slate-50"
              onPress={() => setEditingQuestion(q.number)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-xs font-bold text-slate-500 mr-2">
                      Câu {q.number}
                    </Text>
                    {q.correctAnswer ? (
                      <View className="bg-green-100 px-2 py-0.5 rounded">
                        <Text className="text-green-700 text-xs font-bold">
                          {q.correctAnswer}
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-red-100 px-2 py-0.5 rounded">
                        <Text className="text-red-700 text-xs font-bold">Thiếu đáp án</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-slate-700" numberOfLines={2}>
                    {q.text || '(Câu fill-in-blank trong passage)'}
                  </Text>
                </View>
                <Text className="text-slate-400">›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View className="h-20" />
      </ScrollView>

      {/* Save button với safe area bottom */}
      <View
        className="bg-white border-t border-slate-200 px-4"
        style={{ paddingTop: 12, paddingBottom: 12 + insets.bottom }}
      >
        <Pressable
          className="bg-indigo-600 active:bg-indigo-700 rounded-xl py-4 items-center"
          onPress={onSave}
          disabled={saving || validCount === 0}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">
              💾 Lưu đề thi ({validCount} câu)
            </Text>
          )}
        </Pressable>
      </View>

      {/* Edit modal */}
      {editingQuestion !== null && editingQuestionData && (
        <EditQuestionModal
          question={editingQuestionData}
          onClose={() => setEditingQuestion(null)}
          onSave={(patch) => {
            updateQuestion(editingQuestion, patch);
            setEditingQuestion(null);
          }}
        />
      )}
    </>
  );
}

// ============================================================
// Edit question modal
// ============================================================
function EditQuestionModal({
  question,
  onClose,
  onSave,
}: {
  question: ParsedExamPreview['questions'][0];
  onClose: () => void;
  onSave: (patch: Partial<ParsedExamPreview['questions'][0]>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(question.text || '');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(
    question.correctAnswer
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
        <View className="bg-white px-4 py-3 border-b border-slate-200 flex-row items-center justify-between">
          <Pressable onPress={onClose}>
            <Text className="text-slate-600 text-base">Hủy</Text>
          </Pressable>
          <Text className="text-base font-bold">Câu {question.number}</Text>
          <Pressable
            onPress={() => onSave({ text, correctAnswer })}
            disabled={!correctAnswer}
          >
            <Text
              className={`text-base font-semibold ${
                correctAnswer ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              Lưu
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          <Text className="text-xs font-semibold text-slate-500 mb-2">
            NỘI DUNG CÂU HỎI
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhập nội dung câu hỏi..."
            multiline
            className="bg-white border border-slate-300 rounded-lg p-3 text-base text-slate-900 min-h-[80px]"
          />

          <Text className="text-xs font-semibold text-slate-500 mb-2 mt-4">
            CÁC LỰA CHỌN (chỉ xem)
          </Text>
          {question.options.map((opt) => (
            <View
              key={opt.letter}
              className="bg-slate-100 rounded-lg p-3 mb-2 flex-row items-start"
            >
              <Text className="font-bold text-slate-700 mr-2 w-6">{opt.letter}.</Text>
              <Text className="flex-1 text-slate-700">{opt.text}</Text>
            </View>
          ))}

          <Text className="text-xs font-semibold text-slate-500 mb-2 mt-4">
            ĐÁP ÁN ĐÚNG
          </Text>
          <View className="flex-row">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <Pressable
                key={letter}
                className={`flex-1 rounded-lg py-3 mx-1 items-center ${
                  correctAnswer === letter
                    ? 'bg-indigo-600'
                    : 'bg-white border border-slate-300'
                }`}
                onPress={() => setCorrectAnswer(letter)}
              >
                <Text
                  className={`font-bold ${
                    correctAnswer === letter ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {letter}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 20 + insets.bottom }} />
        </ScrollView>
      </View>
    </Modal>
  );
}