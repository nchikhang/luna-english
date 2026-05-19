import { apiRequest } from './client';

// Wire format types — match với backend src/types/schemas.ts
// (Sau Phase E nên extract thành package shared, nhưng cứ duplicate trước để đi nhanh)

export interface SyncDeckWire {
  id: string;
  name: string;
  description: string | null;
  language: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncCardWire {
  id: string;
  deckId: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  imageUrl: string | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncReviewLogWire {
  id: string;
  cardId: string;
  rating: number;
  reviewedAt: string;
  intervalBefore: number;
  intervalAfter: number;
}

export interface PushRequest {
  decks: SyncDeckWire[];
  cards: SyncCardWire[];
  reviewLogs: SyncReviewLogWire[];
}

export interface PushResponse {
  syncedAt: string;
  conflicts: {
    decks: SyncDeckWire[];
    cards: SyncCardWire[];
  };
}

export interface PullResponse {
  syncedAt: string;
  decks: SyncDeckWire[];
  cards: SyncCardWire[];
}

export async function pushSync(payload: PushRequest): Promise<PushResponse> {
  return apiRequest<PushResponse>('/sync/push', {
    method: 'POST',
    body: payload,
  });
}

export async function pullSync(since?: string): Promise<PullResponse> {
  return apiRequest<PullResponse>('/sync/pull', {
    query: { since },
  });
}
