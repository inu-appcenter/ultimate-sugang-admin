/** 04 §9-5 · DS-01 §6-2. 교체(REPLACE)는 색이 아니라 명도로 강조한다 — DS-00 §4-1 원칙 4. */

export const jobStatusVariant = {
  SUCCESS: 'success',
  FAILED: 'danger',
  RUNNING: 'warning',
} as const;

export const strategyVariant = {
  UPSERT: 'muted',
  REPLACE: 'neutral-strong',
  INITIAL: 'muted',
} as const;
