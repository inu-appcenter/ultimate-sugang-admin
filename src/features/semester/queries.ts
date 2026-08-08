import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDisplaySemester, updateDisplaySemester } from '@/features/semester/api';

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

export function useUpdateDisplaySemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDisplaySemester,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterKeys.display() }),
  });
}
