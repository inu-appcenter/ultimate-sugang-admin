/** 04 §9-4. enum 의 한글 이름은 서버가 주지 않는다 — 클라이언트 책임이다. */

export const termLabels = {
  FIRST: '1학기',
  SUMMER: '여름계절학기',
  SECOND: '2학기',
  WINTER: '겨울계절학기',
} as const;

/** ⚠️ 표시 순서. TERM_CODE(10/20/30/40)로 정렬하면 틀린다 — 여름(30)이 2학기(20)보다 크다. */
export const TERM_ORDER = ['FIRST', 'SUMMER', 'SECOND', 'WINTER'] as const;

export const strategyLabels = {
  INITIAL: '최초',
  UPSERT: '갱신',
  REPLACE: '교체',
} as const;

export const jobStatusLabels = {
  RUNNING: '진행 중',
  SUCCESS: '성공',
  FAILED: '실패',
} as const;

export const phaseLabels = {
  COURSE_FETCH: '강의 수집',
  TIMETABLE_FETCH: '시간표 수집',
  PERSIST: '적재',
} as const;

export const changeTypeLabels = {
  CREATED: '신규',
  UPDATED: '수정',
  CLOSED: '폐강',
  WARNING: '경고',
} as const;

/**
 * changedFields[].field → 한글 (03 §8-4).
 * ⚠️ maxCapacity·currentEnrollment 를 넣지 않는다 — 서비스 소유 필드라 절대 오지 않는다 (D2).
 */
export const fieldLabels: Record<string, string> = {
  titleKr: '과목명(국문)',
  titleEn: '과목명(영문)',
  courseCode: '과목코드',
  college: '단과대학',
  department: '학과',
  classification: '이수구분',
  area: '이수영역',
  type: '수업유형',
  grade: '학년',
  credits: '학점',
  isEnglishCourse: '원어강의',
  schedule: '강의실·시간',
};
