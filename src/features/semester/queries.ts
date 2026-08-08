import { useQuery } from '@tanstack/react-query';

import { fetchDisplaySemester } from '@/features/semester/api';

/** 04 §6-7 queryKey 팩토리. */
export const semesterKeys = {
  all: ['semester'] as const,
  display: () => [...semesterKeys.all, 'display'] as const,
};

export function useDisplaySemester() {
  return useQuery({
    queryKey: semesterKeys.display(),
    queryFn: fetchDisplaySemester,
  });
}
