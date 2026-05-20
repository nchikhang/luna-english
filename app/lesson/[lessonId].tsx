import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchLessonDetail,
  completeLesson,
  type LessonDetail,
  type ExerciseDetail,
} from '@/services/api/lessons';
import { VocabularyCard } from '@/components/lesson/VocabularyCard';
import { MultipleChoiceExercise } from '@/components/lesson/MultipleChoiceExercise';
import { FillBlankExercise } from '@/components/lesson/FillBlankExercise';
import { useStatsStore } from '@/stores/statsStore';
import { XpToast, LevelUpToast } from '@/components/XpToast';

/**
 * Lesson Player — main screen cho user làm 1 lesson.
 *
 * Flow:
 * 1. Load lesson + exercises từ server
 * 2. Hiển thị exercise theo sortOrder, 1 at a time
 * 3. User submit từng exercise → tích lũy results[]
 * 4. Sau exercise cuối → POST /lessons/:id/complete với results
 * 5. Hiển thị result screen (score, XP earned, perfect badge)
 *
 * State machine:
 *   'loading' → 'playing' → 'completing' → 'result'
 *                 ↑                ↓
 *                 └─── (retry) ────┘
 */
type PlayerState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'playing'; lesson: LessonDetail; currentIdx: number; results: Result[] }
  | { kind: 'completing' }
  | {
      kind: 'result';
      lesson: LessonDetail;
      score: number;
      passed: boolean;
      perfect: boolean;
      xpEarned: number;
      firstTime: boolean;
      levelUp: boolean;
      newLevel: number;
      newBadges: Array<{ id: string; name: string; icon: string; tier: string }>;
    };

interface Result {
  exerciseId: string;
  correct: boolean;
  userAnswer?: string;
}

export default function LessonPlayer() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const refreshStats = useStatsStore((s) => s.refresh);

  const [state, setState] = useState<PlayerState>({ kind: 'loading' });
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    fetchLessonDetail(lessonId)
      .then((lesson) => {
        if (lesson.exercises.length === 0) {
          setState({ kind: 'error', message: 'Lesson không có bài tập nào.' });
          return;
        }
        setState({ kind: 'playing', lesson, currentIdx: 0, results: [] });
      })
      .catch((err: Error) => {
        setState({ kind: 'error', message: err.message ?? 'Không tải được lesson' });
      });
  }, [lessonId]);

  const handleExerciseSubmit = async (correct: boolean, userAnswer?: string) => {
    if (state.kind !== 'playing') return;

    const exercise = state.lesson.exercises[state.currentIdx];
    const newResults = [
      ...state.results,
      { exerciseId: exercise.id, correct, userAnswer },
    ];

    const nextIdx = state.currentIdx + 1;
    if (nextIdx < state.lesson.exercises.length) {
      // Next exercise
      setState({ ...state, currentIdx: nextIdx, results: newResults });
    } else {
      // Lesson complete → submit
      setState({ kind: 'completing' });
      try {
        const response = await completeLesson(state.lesson.id, newResults);
        await refreshStats();

        if (response.levelUp) {
          setShowLevelUp(response.level);
        }

        setState({
          kind: 'result',
          lesson: state.lesson,
          score: response.score,
          passed: response.passed,
          perfect: response.perfect,
          xpEarned: response.xpEarned,
          firstTime: response.firstTime,
          levelUp: response.levelUp,
          newLevel: response.level,
          newBadges: response.newBadges,
        });
      } catch (err) {
        Alert.alert(
          'Lỗi',
          err instanceof Error ? err.message : 'Không gửi được kết quả'
        );
        // Cho user retry — quay về playing với results đã có
        setState({ ...state, results: newResults });
      }
    }
  };

  const handleExit = () => {
    if (state.kind === 'playing' && state.results.length > 0) {
      Alert.alert(
        'Thoát bài học?',
        'Tiến độ của bạn sẽ không được lưu.',
        [
          { text: 'Tiếp tục học', style: 'cancel' },
          { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // ---- Render ----

  if (state.kind === 'loading' || state.kind === 'completing') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-3 text-gray-500">
          {state.kind === 'loading' ? 'Đang tải bài học...' : 'Đang lưu kết quả...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (state.kind === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Stack.Screen options={{ title: 'Lỗi' }} />
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text className="mt-4 text-lg text-gray-700 text-center">{state.message}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl"
        >
          <Text className="text-white font-semibold">Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (state.kind === 'result') {
    return (
      <ResultScreen
        state={state}
        onContinue={() => router.back()}
        onRetry={() => {
          setState({
            kind: 'playing',
            lesson: state.lesson,
            currentIdx: 0,
            results: [],
          });
        }}
      />
    );
  }

  // PLAYING
  const exercise = state.lesson.exercises[state.currentIdx];
  const progress = state.currentIdx / state.lesson.exercises.length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header với progress bar */}
      <View className="px-4 pt-2 pb-3 flex-row items-center bg-white border-b border-gray-200">
        <Pressable onPress={handleExit} className="p-2 mr-2">
          <Ionicons name="close" size={24} color="#6b7280" />
        </Pressable>
        <View className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
        </View>
        <Text className="ml-3 text-sm text-gray-600 font-semibold">
          {state.currentIdx + 1}/{state.lesson.exercises.length}
        </Text>
      </View>

      {/* Exercise content - re-mount khi đổi exercise để reset internal state */}
      <ExerciseRenderer
        key={exercise.id}
        exercise={exercise}
        onSubmit={handleExerciseSubmit}
      />

      {showLevelUp && (
        <LevelUpToast newLevel={showLevelUp} onDone={() => setShowLevelUp(null)} />
      )}
    </SafeAreaView>
  );
}

function ExerciseRenderer({
  exercise,
  onSubmit,
}: {
  exercise: ExerciseDetail;
  onSubmit: (correct: boolean, userAnswer?: string) => void;
}) {
  switch (exercise.type) {
    case 'vocabulary':
      return (
        <VocabularyCard
          content={exercise.content as never}
          onNext={() => onSubmit(true)} // vocabulary luôn correct
        />
      );
    case 'multiple_choice':
      return (
        <MultipleChoiceExercise
          content={exercise.content as never}
          onSubmit={onSubmit}
        />
      );
    case 'fill_blank':
      return (
        <FillBlankExercise content={exercise.content as never} onSubmit={onSubmit} />
      );
    default:
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loại bài tập chưa hỗ trợ: {exercise.type}</Text>
        </View>
      );
  }
}

function ResultScreen({
  state,
  onContinue,
  onRetry,
}: {
  state: Extract<PlayerState, { kind: 'result' }>;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const { score, passed, perfect, xpEarned, firstTime, newBadges } = state;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 items-center justify-center px-6">
        <Text style={{ fontSize: 96 }}>
          {perfect ? '🏆' : passed ? '🎉' : '😅'}
        </Text>

        <Text className="text-3xl font-bold text-gray-900 mt-4 text-center">
          {perfect
            ? 'Hoàn hảo!'
            : passed
              ? 'Đã hoàn thành!'
              : 'Chưa đạt yêu cầu'}
        </Text>

        <Text className="text-base text-gray-500 mt-2 text-center">
          {passed
            ? firstTime
              ? 'Lần đầu hoàn thành lesson này.'
              : 'Học lại lessons giúp ghi nhớ tốt hơn.'
            : 'Bạn cần đạt ít nhất 80% để hoàn thành.'}
        </Text>

        {/* Score circle */}
        <View
          className={`mt-8 w-32 h-32 rounded-full items-center justify-center ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <Text
            className={`text-5xl font-bold ${
              passed ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {score}%
          </Text>
        </View>

        {/* XP earned */}
        {xpEarned > 0 && (
          <View className="mt-6 bg-amber-100 px-5 py-3 rounded-full flex-row items-center">
            <Ionicons name="star" size={20} color="#f59e0b" />
            <Text className="ml-2 font-bold text-amber-700 text-lg">
              +{xpEarned} XP
            </Text>
          </View>
        )}

        {/* New badges */}
        {newBadges.length > 0 && (
          <View className="mt-6 w-full">
            <Text className="text-center text-sm text-gray-600 font-semibold mb-2">
              🎖️ HUY HIỆU MỚI
            </Text>
            <View className="flex-row justify-center flex-wrap">
              {newBadges.map((b) => (
                <View
                  key={b.id}
                  className="bg-white rounded-2xl p-3 m-1 items-center border border-amber-300"
                >
                  <Text style={{ fontSize: 36 }}>{b.icon}</Text>
                  <Text className="text-xs font-semibold mt-1">{b.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View className="px-6 pb-6">
        {!passed && (
          <Pressable
            onPress={onRetry}
            className="bg-indigo-600 rounded-2xl py-4 items-center mb-3"
          >
            <Text className="text-white font-bold text-base">Thử lại</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onContinue}
          className={`rounded-2xl py-4 items-center ${
            passed ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <Text
            className={`font-bold text-base ${passed ? 'text-white' : 'text-gray-700'}`}
          >
            {passed ? 'Tiếp tục →' : 'Quay lại'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
