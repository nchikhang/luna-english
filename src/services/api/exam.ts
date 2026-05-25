/**
 * API client cho Exam endpoints.
 * Match với pattern apiRequest<T>() từ client.ts.
 */

import Constants from 'expo-constants';
import { apiRequest, ApiError } from './client';
import { useAuthStore } from '@/stores/authStore';

// ============================================================
// TYPES
// ============================================================
export type ExamListItem = {
  id: string;
  title: string;
  subject: string | null;
  grade: string | null;
  totalQuestions: number;
  publishedAt: string | null;
  attemptsCount: number;
  bestScore: number | null;
  bestScorePercentage: number | null;
};

export type ExamOption = {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
};

export type ExamQuestion = {
  id: string;
  number: number;
  text: string;
  sectionId: string | null;
  options: ExamOption[];
};

export type ExamSection = {
  id: string;
  title: string;
  context: string | null;
  startQNum: number;
  endQNum: number;
};

export type ExamDetail = {
  id: string;
  title: string;
  subject: string | null;
  grade: string | null;
  instructions: string | null;
  totalQuestions: number;
  showAnswersAfterSubmit: boolean;
  sections: ExamSection[];
  questions: ExamQuestion[];
};

export type ExamAttempt = {
  id: string;
  examId: string;
  status: 'in_progress' | 'submitted' | 'abandoned';
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  totalQuestions: number;
};

export type AttemptAnswerDetail = {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: { letter: string; text: string }[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean | null;
};

export type AttemptDetail = {
  id: string;
  examId: string;
  examTitle: string;
  status: 'in_progress' | 'submitted' | 'abandoned';
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  percentage: number | null;
  startedAt: string;
  submittedAt: string | null;
  answers: AttemptAnswerDetail[];
};

export type ExamHistoryItem = {
  attemptId: string;
  examId: string;
  examTitle: string;
  examSubject: string | null;
  examGrade: string | null;
  status: 'in_progress' | 'submitted' | 'abandoned';
  score: number | null;
  totalQuestions: number;
  percentage: number | null;
  startedAt: string;
  submittedAt: string | null;
};

export type ParsedExamPreview = {
  title: string;
  subject: string;
  grade: string;
  examCode: string;
  instructions: string;
  totalQuestions: number;
  sections: {
    title: string;
    context: string;
    questionRange: [number, number];
  }[];
  questions: {
    number: number;
    text: string;
    options: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[];
    correctAnswer: 'A' | 'B' | 'C' | 'D' | null;
    confidence?: number;
  }[];
  warnings: string[];
  sourceFileName?: string;
};

export type AdminExamListItem = {
  id: string;
  title: string;
  subject: string | null;
  grade: string | null;
  status: 'draft' | 'published' | 'archived';
  totalQuestions: number;
  createdAt: string;
  uploader: { id: string; displayName: string };
  _count: { attempts: number };
};

// ============================================================
// USER ENDPOINTS
// ============================================================
export async function listExams(): Promise<ExamListItem[]> {
  const res = await apiRequest<{ exams: ExamListItem[] }>('/exams');
  return res.exams;
}

export async function getExam(examId: string): Promise<ExamDetail> {
  const res = await apiRequest<{ exam: ExamDetail }>(`/exams/${examId}`);
  return res.exam;
}

export async function startAttempt(examId: string): Promise<ExamAttempt> {
  const res = await apiRequest<{ attempt: ExamAttempt }>(
    `/exams/${examId}/attempts`,
    { method: 'POST' }
  );
  return res.attempt;
}

export async function submitAttempt(
  attemptId: string,
  answers: { questionId: string; selectedAnswer: 'A' | 'B' | 'C' | 'D' | null }[]
) {
  const res = await apiRequest<{
    result: {
      attemptId: string;
      score: number;
      totalQuestions: number;
      percentage: number;
      submittedAt: string;
    };
  }>(`/attempts/${attemptId}/submit`, {
    method: 'POST',
    body: { answers },
  });
  return res.result;
}

export async function getAttempt(attemptId: string): Promise<AttemptDetail> {
  const res = await apiRequest<{ attempt: AttemptDetail }>(`/attempts/${attemptId}`);
  return res.attempt;
}

export async function getExamHistory(): Promise<ExamHistoryItem[]> {
  const res = await apiRequest<{ history: ExamHistoryItem[] }>('/me/exam-history');
  return res.history;
}

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// Helper: lấy API URL (giống client.ts logic)
function getApiUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'http://localhost:3000'
  );
}

/**
 * Upload DOCX file để parse.
 * KHÔNG dùng apiRequest vì cần multipart/form-data với file binary.
 */
export async function parseExamDocx(
  fileUri: string,
  fileName: string
): Promise<ParsedExamPreview> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  } as any);

  const token = useAuthStore.getState().token;
  const apiUrl = getApiUrl();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/admin/exams/parse`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // KHÔNG set Content-Type — fetch tự set với boundary
      },
      body: formData,
    });
  } catch (err) {
    throw new ApiError('Không thể kết nối tới server', 0, 'NETWORK');
  }

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError('Phiên đăng nhập đã hết hạn', 401, 'UNAUTHORIZED');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.message ?? data.error ?? `Parse thất bại: ${response.status}`,
      response.status,
      data.error
    );
  }
  return data as ParsedExamPreview;
}

export async function saveExam(parsed: ParsedExamPreview): Promise<{ id: string }> {
  // Filter chỉ giữ câu có correctAnswer
  const validQuestions = parsed.questions.filter((q) => q.correctAnswer !== null);

  const payload = {
    title: parsed.title,
    subject: parsed.subject,
    grade: parsed.grade,
    examCode: parsed.examCode,
    instructions: parsed.instructions,
    sourceFileName: parsed.sourceFileName,
    sections: parsed.sections,
    questions: validQuestions.map((q) => ({
      number: q.number,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
    })),
  };

  const res = await apiRequest<{ exam: { id: string } }>('/admin/exams', {
    method: 'POST',
    body: payload,
  });
  return res.exam;
}

export async function listAdminExams(): Promise<AdminExamListItem[]> {
  const res = await apiRequest<{ exams: AdminExamListItem[] }>('/admin/exams');
  return res.exams;
}

export async function publishExam(examId: string) {
  return apiRequest(`/admin/exams/${examId}/publish`, { method: 'POST' });
}

export async function unpublishExam(examId: string) {
  return apiRequest(`/admin/exams/${examId}/unpublish`, { method: 'POST' });
}

export async function deleteExam(examId: string) {
  return apiRequest(`/admin/exams/${examId}`, { method: 'DELETE' });
}

export async function updateExam(
  examId: string,
  input: {
    title?: string;
    subject?: string;
    grade?: string;
    instructions?: string;
    showAnswersAfterSubmit?: boolean;
  }
) {
  return apiRequest(`/admin/exams/${examId}`, {
    method: 'PUT',
    body: input,
  });
}

export async function updateQuestion(
  questionId: string,
  input: {
    text?: string;
    correctAnswer?: 'A' | 'B' | 'C' | 'D';
    options?: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[];
  }
) {
  return apiRequest(`/admin/questions/${questionId}`, {
    method: 'PUT',
    body: input,
  });
}