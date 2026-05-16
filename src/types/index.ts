/**
 * Domain types for Luna English
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  level: CEFRLevel;
  createdAt: string;
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Deck {
  id: string;
  userId: string;
  name: string;
  description?: string;
  language: 'en';
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  word: string;
  meaning: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  imageUrl?: string;
  // SRS fields (SM-2 algorithm)
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
  createdAt: string;
}

export type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = blackout, 5 = perfect recall

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  intervalBefore: number;
  intervalAfter: number;
}

export type QuizType =
  | 'multiple-choice'
  | 'type-answer'
  | 'listen-choose'
  | 'match-pairs';

export interface QuizQuestion {
  type: QuizType;
  cardId: string;
  question: string;
  correctAnswer: string;
  options?: string[]; // for multiple-choice
}
