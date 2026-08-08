import { setupWorker } from 'msw/browser';

import { mockDb } from '@/mocks/db';
import { handlers } from '@/mocks/handlers';

export const worker = setupWorker(...handlers);

declare global {
  interface Window {
    __ussMockDb?: typeof mockDb;
  }
}

window.__ussMockDb = mockDb;
