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
 *
 * ⚠️ **이 함수는 주인이 둘이다.** 표기용(01 §6-4)이면서 동시에 M4 Strict Match 의
 * 기대 입력값(04 §10-3 `${academicYear}-${termLabels[term]}`)이다. 지금은 두 형식이 같아서
 * 한 곳으로 모았지만, 표기 쪽 요구가 바뀌면 **비가역 작업의 확인 문구가 조용히 따라 움직인다.**
 * 둘이 갈라지는 순간 즉시 분리한다.
 */
export const formatSemesterCompact = (academicYear: number, term: CourseTerm) =>
  `${academicYear}-${termLabels[term]}`;
