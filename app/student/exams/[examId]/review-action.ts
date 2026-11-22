'use server';

import { getStudentAttemptReviewData, type AttemptReviewData } from '@/lib/student-exam-review';

export async function fetchAttemptReviewAction(
  attemptId: string
): Promise<{ status: 'success'; data: AttemptReviewData } | { status: 'error'; message: string }> {
  return getStudentAttemptReviewData(attemptId);
}
