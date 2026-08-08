import { z } from 'zod';

import { courseTermSchema } from '@/shared/api/schemas';

/** 03 §4-1 — `GET /semesters/display` 응답. 표시 학기는 적재 데이터와 무관한 라벨이다 (D10). */
export const displaySemesterSchema = z.object({
  academicYear: z.number(),
  term: courseTermSchema,
});
export type DisplaySemester = z.infer<typeof displaySemesterSchema>;
