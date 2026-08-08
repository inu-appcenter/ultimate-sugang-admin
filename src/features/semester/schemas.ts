import { z } from 'zod';

import { courseTermSchema } from '@/shared/api/schemas';

export const displaySemesterSchema = z.object({
  academicYear: z.number(),
  term: courseTermSchema,
});
export type DisplaySemester = z.infer<typeof displaySemesterSchema>;
