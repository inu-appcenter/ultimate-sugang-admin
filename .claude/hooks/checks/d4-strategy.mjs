/**
 * D4 가드의 정규식 — 클라이언트가 적재 전략 값을 스스로 **생산**하는 것을 막는다.
 *
 * 서버가 준 strategy 를 읽고 모달을 고르는 건 03 §6-1 "클라이언트 분기" 가 시키는 일이라 통과시킨다.
 * 막는 건 대입·반환·삼항 결과·호출 인자·객체 값으로 전략 리터럴이 나타나는 것뿐이다.
 *
 * 두 곳이 이 파일을 쓴다:
 *   - uss-contract-lint.mjs  → 실제 소스를 검사(fast 게이트)
 *   - harness/verify/step-2.mjs → 이 규칙이 잡아야 할 것과 통과시켜야 할 것을 고정
 */
const STRATEGY = '(?:INITIAL|UPSERT|REPLACE)';

export const D4_PRODUCES = [
  new RegExp(`(?<![=!<>])=\\s*['"]${STRATEGY}['"]`),
  new RegExp(`return\\s+['"]${STRATEGY}['"]`),
  new RegExp(`\\?\\s*['"]${STRATEGY}['"]`),
  new RegExp(`:\\s*['"]${STRATEGY}['"]`),
  new RegExp(`\\(\\s*['"]${STRATEGY}['"]`),
  /expectedStrategy:\s*['"]/,
];

/** 검사 대상 경로. mocks/ 는 서버 역할이라 전략을 만드는 게 정상이므로 뺀다. */
export const D4_SCOPE = ['src/features/', 'src/pages/', 'src/shared/'];

export const d4Produces = (text) => D4_PRODUCES.some((re) => re.test(text));
