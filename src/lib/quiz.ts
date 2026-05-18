import type { Card } from '@/types';

/**
 * Quiz types và logic generate câu hỏi.
 *
 * Tách riêng types và generators để mỗi dạng quiz tự xử lý logic riêng,
 * UI chỉ cần render dựa trên question.type (discriminated union).
 */

export type QuizMode =
  | 'multiple-choice'
  | 'type-answer'
  | 'listen-choose'
  | 'match-pairs';

// ============================================================
// Question types (discriminated union)
// ============================================================

interface BaseQuestion {
  id: string;
  cardId: string;
  correctAnswer: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  prompt: string; // "Nghĩa của 'ephemeral' là gì?"
  options: string[]; // 4 options (1 đúng + 3 sai)
}

export interface TypeAnswerQuestion extends BaseQuestion {
  type: 'type-answer';
  prompt: string; // "Từ tiếng Anh của 'phù du'?"
  acceptedAnswers: string[]; // [correctAnswer, ...synonyms]
}

export interface ListenChooseQuestion extends BaseQuestion {
  type: 'listen-choose';
  audioText: string; // text để TTS đọc
  options: string[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | TypeAnswerQuestion
  | ListenChooseQuestion;

// ============================================================
// Answer record (kết quả của user cho 1 câu)
// ============================================================

export interface QuizAnswer {
  questionId: string;
  cardId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeMs: number; // thời gian trả lời
}

// ============================================================
// Question generators
// ============================================================

/**
 * Generate questions cho session quiz.
 * @param cards Tất cả cards trong deck
 * @param mode Dạng quiz
 * @param count Số câu hỏi muốn tạo
 */
export function generateQuestions(
  cards: Card[],
  mode: QuizMode,
  count: number
): QuizQuestion[] {
  if (mode === 'match-pairs') {
    // Match-pairs có logic riêng, không qua function này
    throw new Error('match-pairs uses separate logic');
  }

  // Shuffle cards, lấy đủ count đầu
  const shuffled = shuffle(cards).slice(0, count);

  switch (mode) {
    case 'multiple-choice':
      return shuffled.map((card) =>
        generateMultipleChoice(card, cards)
      );
    case 'type-answer':
      return shuffled.map((card) => generateTypeAnswer(card));
    case 'listen-choose':
      return shuffled.map((card) =>
        generateListenChoose(card, cards)
      );
  }
}

function generateMultipleChoice(
  card: Card,
  allCards: Card[]
): MultipleChoiceQuestion {
  // Lấy 3 distractor (đáp án sai) từ các card khác
  const distractors = pickDistractors(card, allCards, 3, 'meaning');

  const options = shuffle([card.meaning, ...distractors]);

  return {
    id: `q_${card.id}_mc`,
    type: 'multiple-choice',
    cardId: card.id,
    prompt: `Nghĩa của "${card.word}" là gì?`,
    correctAnswer: card.meaning,
    options,
  };
}

function generateTypeAnswer(card: Card): TypeAnswerQuestion {
  return {
    id: `q_${card.id}_ta`,
    type: 'type-answer',
    cardId: card.id,
    prompt: `Từ tiếng Anh của "${card.meaning}"?`,
    correctAnswer: card.word,
    acceptedAnswers: [card.word], // có thể mở rộng synonym sau
  };
}

function generateListenChoose(
  card: Card,
  allCards: Card[]
): ListenChooseQuestion {
  // 3 distractor là các từ tiếng Anh khác
  const distractors = pickDistractors(card, allCards, 3, 'word');
  const options = shuffle([card.word, ...distractors]);

  return {
    id: `q_${card.id}_lc`,
    type: 'listen-choose',
    cardId: card.id,
    audioText: card.word,
    correctAnswer: card.word,
    options,
  };
}

// ============================================================
// Match pairs (logic riêng)
// ============================================================

export interface MatchPair {
  cardId: string;
  word: string;
  meaning: string;
}

/**
 * Generate match-pairs round: chọn N cards, trả về để UI render.
 * UI sẽ shuffle hai cột riêng biệt.
 */
export function generateMatchPairs(cards: Card[], count: number): MatchPair[] {
  return shuffle(cards)
    .slice(0, count)
    .map((c) => ({ cardId: c.id, word: c.word, meaning: c.meaning }));
}

// ============================================================
// Answer checking
// ============================================================

/**
 * Check câu trả lời cho type-answer (fuzzy match).
 * Lowercase, trim, bỏ dấu, bỏ space dư.
 */
export function checkTypeAnswer(
  userInput: string,
  question: TypeAnswerQuestion
): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // bỏ dấu Vietnamese/diacritics
      .replace(/\s+/g, ' '); // collapse spaces

  const normalizedInput = normalize(userInput);
  return question.acceptedAnswers.some(
    (ans) => normalize(ans) === normalizedInput
  );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Chọn N distractor (đáp án sai) từ allCards, loại trừ card đang hỏi.
 * Đảm bảo distractors không trùng giá trị (vd: 2 card cùng nghĩa).
 */
function pickDistractors(
  correctCard: Card,
  allCards: Card[],
  count: number,
  field: 'word' | 'meaning'
): string[] {
  const correctValue = correctCard[field];
  const candidates = allCards
    .filter((c) => c.id !== correctCard.id && c[field] !== correctValue)
    .map((c) => c[field]);

  const unique = Array.from(new Set(candidates));
  return shuffle(unique).slice(0, count);
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
