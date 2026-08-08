import type { CourseTerm } from '@/shared/api/schemas';
import { termLabels } from '@/shared/constants/labels';

/**
 * 학기 표기. semester·sync 두 도메인이 함께 쓰므로 shared 에 둔다 (04 §4-1 — features 끼리 직접 참조 금지).
 * ⚠️ TERM_CODE(10/20/30/40)로 정렬하지 않는다. 순서가 필요하면 TERM_ORDER 를 쓴다.
 */

/** 카드 표기 — "2026학년도 1학기" (01 §6-2, §6-3) */
export const formatSemesterLong = (academicYear: number, term: CourseTerm) =>
  `${academicYear}학년도 ${termLabels[term]}`;

/**
 * 이력 테이블의 대상 학기 — "2026-1학기" (01 §6-4).
 * M4 Strict Match 가 요구하는 입력값과 **같은 형식**이다 (04 §10-3). 문자열 생성을 한 곳으로 모은다.
 */
export const formatSemesterCompact = (academicYear: number, term: CourseTerm) =>
  `${academicYear}-${termLabels[term]}`;
