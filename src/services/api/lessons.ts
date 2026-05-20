import { apiRequest } from './client';

// ============================================================
// TYPES (mirror với backend, có thể move sang shared package sau)
// ============================================================

export interface LessonTreeNode {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  estimatedMinutes: number;
  xpReward: number;
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
}

export interface UnitTreeNode {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  lessons: LessonTreeNode[];
  completedCount: number;
  totalCount: number;
}

export interface CourseTreeNode {
  id: string;
  level: string;
  title: string;
  description: string | null;
  sortOrder: number;
  units: UnitTreeNode[];
}

// Exercise content shapes
export interface VocabularyContent {
  word: string;
  meaning: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  imageEmoji?: string;
}

export interface MultipleChoiceContent {
  question: string;
  questionVi?: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface FillBlankContent {
  sentence: string;
  correctAnswers: string[];
  hint?: string;
  translation?: string;
  prefix?: string;
  suffix?: string;
}

export interface ExerciseDetail {
  id: string;
  type: 'vocabulary' | 'multiple_choice' | 'fill_blank';
  sortOrder: number;
  content: VocabularyContent | MultipleChoiceContent | FillBlankContent;
  pointsCorrect: number;
}

export interface LessonDetail {
  id: string;
  title: string;
  description: string | null;
  unitId: string;
  estimatedMinutes: number;
  xpReward: number;
  exercises: ExerciseDetail[];
}

export interface CompleteLessonResponse {
  score: number;
  passed: boolean;
  perfect: boolean;
  xpEarned: number;
  newBest: boolean;
  firstTime: boolean;
  totalXp: number;
  level: number;
  levelUp: boolean;
  newBadges: Array<{ id: string; name: string; icon: string; tier: string }>;
}

// ============================================================
// API CALLS
// ============================================================

export async function fetchLessonTree(): Promise<{ courses: CourseTreeNode[] }> {
  return apiRequest('/lessons/tree');
}

export async function fetchLessonDetail(lessonId: string): Promise<LessonDetail> {
  return apiRequest(`/lessons/${lessonId}`);
}

export async function completeLesson(
  lessonId: string,
  results: Array<{ exerciseId: string; correct: boolean; userAnswer?: string }>
): Promise<CompleteLessonResponse> {
  return apiRequest(`/lessons/${lessonId}/complete`, {
    method: 'POST',
    body: { results },
  });
}
