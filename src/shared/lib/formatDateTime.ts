/**
 * 04 §9-3. 시각은 오프셋 없는 KST 로컬 문자열("2026-08-05T14:22:00")이다.
 * ⚠️ new Date() 로 파싱하지 않는다 — 파싱하는 순간 브라우저 타임존이 끼어들어 계약이 깨진다.
 * 문자열을 자르기만 한다.
 */

/** "2026-08-05T14:22:00" → "2026-08-05 14:22" */
export const formatDateTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

/** "2026-08-05T14:22:00" → "08-05 14:22" (이력 테이블) */
export const formatShortDateTime = (iso: string) => `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
