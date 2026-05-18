import { useCallback, useEffect, useState } from 'react';
import type { Card } from '@/types';
import { getCardsByDeckId } from '@/db/queries';
import {
  type QuizAnswer,
  type QuizMode,
  type QuizQuestion,
  checkTypeAnswer,
  generateQuestions,
} from '@/lib/quiz';

export type QuizStatus = 'loading' | 'active' | 'finished' | 'insufficient';

export interface QuizResult {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  totalTimeMs: number;
  answers: QuizAnswer[];
}

interface UseQuizParams {
  deckId: string;
  mode: QuizMode;
  count: number;
}

interface UseQuizResult {
  status: QuizStatus;
  questions: QuizQuestion[];
  currentIndex: number;
  currentQuestion: QuizQuestion | null;
  submitAnswer: (userAnswer: string) => boolean; // returns isCorrect
  next: () => void;
  result: QuizResult | null;
  restart: () => Promise<void>;
}

const MIN_CARDS_FOR_QUIZ = 4;

export function useQuiz({
  deckId,
  mode,
  count,
}: UseQuizParams): UseQuizResult {
  const [status, setStatus] = useState<QuizStatus>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const loadQuiz = useCallback(async () => {
    setStatus('loading');
    setCurrentIndex(0);
    setAnswers([]);

    try {
      const cards: Card[] = await getCardsByDeckId(deckId);

      // Cần đủ cards: ít nhất 4 cho multiple-choice/listen-choose (1 đúng + 3 distractor)
      if (cards.length < MIN_CARDS_FOR_QUIZ) {
        setStatus('insufficient');
        return;
      }

      const actualCount = Math.min(count, cards.length);
      const qs = generateQuestions(cards, mode, actualCount);
      setQuestions(qs);
      setStatus('active');
      setQuestionStartTime(Date.now());
    } catch (err) {
      console.error('[Quiz] Failed to load:', err);
      setStatus('insufficient');
    }
  }, [deckId, mode, count]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const submitAnswer = useCallback(
    (userAnswer: string): boolean => {
      const question = questions[currentIndex];
      if (!question) return false;

      let isCorrect = false;
      if (question.type === 'type-answer') {
        isCorrect = checkTypeAnswer(userAnswer, question);
      } else {
        // multiple-choice và listen-choose: so sánh trực tiếp
        isCorrect = userAnswer === question.correctAnswer;
      }

      const answer: QuizAnswer = {
        questionId: question.id,
        cardId: question.cardId,
        userAnswer,
        isCorrect,
        timeMs: Date.now() - questionStartTime,
      };

      setAnswers((prev) => [...prev, answer]);
      return isCorrect;
    },
    [questions, currentIndex, questionStartTime]
  );

  const next = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setStatus('finished');
    } else {
      setCurrentIndex(nextIndex);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, questions.length]);

  const result: QuizResult | null =
    status === 'finished'
      ? {
          total: answers.length,
          correct: answers.filter((a) => a.isCorrect).length,
          incorrect: answers.filter((a) => !a.isCorrect).length,
          accuracy:
            answers.length > 0
              ? answers.filter((a) => a.isCorrect).length / answers.length
              : 0,
          totalTimeMs: answers.reduce((sum, a) => sum + a.timeMs, 0),
          answers,
        }
      : null;

  return {
    status,
    questions,
    currentIndex,
    currentQuestion: questions[currentIndex] ?? null,
    submitAnswer,
    next,
    result,
    restart: loadQuiz,
  };
}
