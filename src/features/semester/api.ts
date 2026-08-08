import { displaySemesterSchema, type DisplaySemester } from '@/features/semester/schemas';
import { apiClient } from '@/shared/api/client';

export async function fetchDisplaySemester(): Promise<DisplaySemester> {
  const { data } = await apiClient.get('/semesters/display');
  return displaySemesterSchema.parse(data);
}
