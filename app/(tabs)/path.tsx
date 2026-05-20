import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchLessonTree,
  type CourseTreeNode,
  type LessonTreeNode,
} from '@/services/api/lessons';

/**
 * Course Path screen — tab Lộ trình.
 *
 * Pattern: hiển thị courses → units → lessons như Duolingo learning path.
 * Lessons có 3 states: locked (gray, không tap), unlocked (tap được), completed (check icon).
 */
export default function LearningPathScreen() {
  const [courses, setCourses] = useState<CourseTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await fetchLessonTree();
      setCourses(data.courses);
    } catch (err) {
      console.warn('[Lessons] Load tree failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['left', 'right']}>
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (courses.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6" edges={['left', 'right']}>
        <Text style={{ fontSize: 64 }}>📚</Text>
        <Text className="text-lg text-gray-600 mt-3 text-center">
          Chưa có khóa học nào. Hãy chạy seed lessons ở backend.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {courses.map((course) => (
          <CourseSection
            key={course.id}
            course={course}
            onLessonPress={(lesson) => {
              if (!lesson.unlocked) return;
              router.push(`/lesson/${lesson.id}` as never);
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseSection({
  course,
  onLessonPress,
}: {
  course: CourseTreeNode;
  onLessonPress: (lesson: LessonTreeNode) => void;
}) {
  return (
    <View className="mb-6">
      <View className="px-4 mb-3">
        <View className="flex-row items-center">
          <View className="bg-indigo-600 px-3 py-1 rounded-full">
            <Text className="text-white font-bold">{course.level}</Text>
          </View>
          <Text className="ml-2 text-lg font-bold text-gray-900">{course.title}</Text>
        </View>
        {course.description && (
          <Text className="text-sm text-gray-500 mt-1">{course.description}</Text>
        )}
      </View>

      {course.units.map((unit) => (
        <View
          key={unit.id}
          className="mx-4 mb-4 bg-white rounded-3xl p-4 border border-gray-200"
        >
          <View className="flex-row items-center mb-3">
            {unit.icon && <Text style={{ fontSize: 32 }}>{unit.icon}</Text>}
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-gray-900">{unit.title}</Text>
              <Text className="text-xs text-gray-500">
                {unit.completedCount} / {unit.totalCount} bài học hoàn thành
              </Text>
            </View>
          </View>

          {/* Unit progress bar */}
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-green-500 rounded-full"
              style={{
                width: `${
                  unit.totalCount === 0 ? 0 : (unit.completedCount / unit.totalCount) * 100
                }%`,
              }}
            />
          </View>

          {/* Lessons list */}
          {unit.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              onPress={() => onLessonPress(lesson)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function LessonRow({
  lesson,
  onPress,
}: {
  lesson: LessonTreeNode;
  onPress: () => void;
}) {
  const isLocked = !lesson.unlocked;
  const isCompleted = lesson.completed;

  return (
    <Pressable
      onPress={onPress}
      disabled={isLocked}
      className={`rounded-2xl p-3 mb-2 flex-row items-center ${
        isLocked
          ? 'bg-gray-100'
          : isCompleted
            ? 'bg-green-50 border border-green-200'
            : 'bg-indigo-50 border border-indigo-200'
      }`}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          isLocked
            ? 'bg-gray-300'
            : isCompleted
              ? 'bg-green-500'
              : 'bg-indigo-500'
        }`}
      >
        {isLocked ? (
          <Ionicons name="lock-closed" size={18} color="white" />
        ) : isCompleted ? (
          <Ionicons name="checkmark" size={20} color="white" />
        ) : (
          <Text className="text-white font-bold">{lesson.sortOrder}</Text>
        )}
      </View>

      <View className="flex-1">
        <Text
          className={`font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}
        >
          {lesson.title}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Ionicons
            name="time-outline"
            size={12}
            color={isLocked ? '#9ca3af' : '#6b7280'}
          />
          <Text className={`text-xs ml-1 ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
            {lesson.estimatedMinutes} phút
          </Text>
          {isCompleted && lesson.bestScore !== null && (
            <>
              <Text className="text-gray-400 mx-2">·</Text>
              <Text className="text-xs text-green-600 font-semibold">
                {lesson.bestScore}%
              </Text>
            </>
          )}
        </View>
      </View>

      {!isLocked && !isCompleted && (
        <Ionicons name="chevron-forward" size={20} color="#6366f1" />
      )}
    </Pressable>
  );
}
