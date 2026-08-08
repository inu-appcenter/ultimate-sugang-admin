import { setupWorker } from 'msw/browser';

import { mockDb } from '@/mocks/db';
import { handlers } from '@/mocks/handlers';

export const worker = setupWorker(...handlers);

declare global {
  interface Window {
    /** MSW 가 켜진 개발 빌드에만 붙는 QA 훅. 콘솔에서 401·재발급 실패를 만들 때 쓴다. */
    __ussMockDb?: typeof mockDb;
  }
}

window.__ussMockDb = mockDb;
