export const APP_CONFIG = {
  name: 'Luna English',
  version: '0.1.0',
  defaultLanguage: 'vi',
  defaultTargetLanguage: 'en',
} as const;

export const SRS_CONFIG = {
  newCardsPerDay: 10,
  maxReviewsPerDay: 100,
  defaultEaseFactor: 2.5,
  minEaseFactor: 1.3,
} as const;

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
