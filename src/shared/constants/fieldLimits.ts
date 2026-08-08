/** 03 §3-1 로그인 입력 길이 제한. 빈 값이면 요청을 보내지 않고 인라인 문구를 띄운다 (04 §12 Step 3). */
export const fieldLimits = {
  loginId: 50,
  password: 100,
} as const;
