import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * DS-01 에서 새로 만든 토큰들은 tailwind-merge 기본 목록에 없다.
 * 알려주지 않으면 **엉뚱한 그룹으로 분류돼 멀쩡한 클래스를 지운다.**
 *
 * 실제로 났던 사고: `text-body`(글자 크기)를 색으로 오인해서
 * `text-primary-foreground text-body` → `text-body` 가 되고, Primary 버튼 글자가
 * 흰색 대신 상속된 본문색으로 떨어졌다. 파란 배경에 어두운 글자.
 *
 * 새 토큰을 tailwind.config.ts 에 추가하면 여기도 같이 등록한다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // DS-01 §2
      'font-size': [{ text: ['metric', 'h1', 'h2', 'h3', 'body', 'caption'] }],
      // DS-01 §4-1 · §4-2
      rounded: [{ rounded: ['card', 'btn', 'modal'] }],
      shadow: [{ shadow: ['card', 'modal'] }],
      // DS-01 §3
      'max-w': [{ 'max-w': ['content', 'login-card', 'modal', 'modal-wide'] }],
      'min-w': [{ 'min-w': ['viewport'] }],
      h: [{ h: ['header'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
