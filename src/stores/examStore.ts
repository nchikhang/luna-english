/**
 * Store cho exam attempt đang làm.
 * 
 * Lưu local: examId, attemptId, currentQuestionIndex, answers map.
 * KHÔNG persist to AsyncStorage — nếu app reload, user phải start lại.
 * (Tránh complexity sync state với backend; user nội bộ làm exam tại chỗ)
 */

import { create } from 'zustand';
import type { ExamDetail, ExamAttempt } from '@/services/api/exam';

export type AnswerLetter = 'A' | 'B' | 'C' | 'D';

type ExamState = {
  // Current attempt
  attemptId: string | null;
  exam: ExamDetail | null;
  
  // Progress
  currentIndex: number;       // 0-based index in exam.questions
  answers: Record<string, AnswerLetter | null>;  // questionId → selected letter
  
  // Actions
  startExam: (exam: ExamDetail, attempt: ExamAttempt) => void;
  setAnswer: (questionId: string, letter: AnswerLetter | null) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  resetExam: () => void;
  
  // Derived
  getAnsweredCount: () => number;
  getCurrentQuestion: () => ExamDetail['questions'][0] | null;
};

export const useExamStore = create<ExamState>((set, get) => ({
  attemptId: null,
  exam: null,
  currentIndex: 0,
  answers: {},

  startExam: (exam, attempt) => set({
    attemptId: attempt.id,
    exam,
    currentIndex: 0,
    answers: {},
  }),

  setAnswer: (questionId, letter) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: letter },
    })),

  goToQuestion: (index) =>
    set((state) => {
      const max = state.exam?.questions.length ?? 0;
      const clamped = Math.max(0, Math.min(index, max - 1));
      return { currentIndex: clamped };
    }),

  nextQuestion: () =>
    set((state) => {
      const max = state.exam?.questions.length ?? 0;
      return { currentIndex: Math.min(state.currentIndex + 1, max - 1) };
    }),

  prevQuestion: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  resetExam: () =>
    set({
      attemptId: null,
      exam: null,
      currentIndex: 0,
      answers: {},
    }),

  getAnsweredCount: () => {
    const { answers } = get();
    return Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  },

  getCurrentQuestion: () => {
    const { exam, currentIndex } = get();
    return exam?.questions[currentIndex] ?? null;
  },
}));
