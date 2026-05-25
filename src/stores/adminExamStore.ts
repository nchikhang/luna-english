/**
 * Admin store - parsed exam đang review.
 */

import { create } from 'zustand';
import type { ParsedExamPreview } from '@/services/api/exam';

type AdminExamState = {
  parsed: ParsedExamPreview | null;
  setParsed: (parsed: ParsedExamPreview) => void;
  updateQuestion: (
    qNumber: number,
    patch: Partial<ParsedExamPreview['questions'][0]>
  ) => void;
  updateExamMeta: (
    patch: Partial<Pick<ParsedExamPreview, 'title' | 'subject' | 'grade' | 'instructions'>>
  ) => void;
  reset: () => void;
};

export const useAdminExamStore = create<AdminExamState>((set) => ({
  parsed: null,

  setParsed: (parsed) => set({ parsed }),

  updateQuestion: (qNumber, patch) =>
    set((state) => {
      if (!state.parsed) return state;
      return {
        parsed: {
          ...state.parsed,
          questions: state.parsed.questions.map((q) =>
            q.number === qNumber ? { ...q, ...patch } : q
          ),
        },
      };
    }),

  updateExamMeta: (patch) =>
    set((state) => {
      if (!state.parsed) return state;
      return {
        parsed: { ...state.parsed, ...patch },
      };
    }),

  reset: () => set({ parsed: null }),
}));
