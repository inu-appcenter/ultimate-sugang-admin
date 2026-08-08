import type { CourseTerm } from '@/shared/api/schemas';
import { termLabels } from '@/shared/constants/labels';

export const formatSemesterLong = (academicYear: number, term: CourseTerm) =>
  `${academicYear}학년도 ${termLabels[term]}`;

export const formatSemesterCompact = (academicYear: number, term: CourseTerm) =>
  `${academicYear}-${termLabels[term]}`;
