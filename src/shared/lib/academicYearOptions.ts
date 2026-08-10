const YEAR_SPAN = 2;

const kstYearFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
});

export const currentAcademicYear = (): number => Number(kstYearFormat.format(Date.now()));

export const academicYearOptions = (current: number): number[] => {
  const base = currentAcademicYear();
  const years = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, index) => base - YEAR_SPAN + index);
  return years.includes(current) ? years : [...years, current].sort((a, b) => a - b);
};
