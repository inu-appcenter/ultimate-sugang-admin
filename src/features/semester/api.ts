import { displaySemesterSchema, type DisplaySemester } from '@/features/semester/schemas';
import { apiClient } from '@/shared/api/client';

/** 03 §4-1. 행이 없으면 404/5100 이지만 Flyway 시드가 1행을 보장하므로 정상 운영 중엔 안 난다. */
export async function fetchDisplaySemester(): Promise<DisplaySemester> {
  const { data } = await apiClient.get('/semesters/display');
  return displaySemesterSchema.parse(data);
}
