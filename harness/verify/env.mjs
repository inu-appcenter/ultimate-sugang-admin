/**
 * 검증 하네스 공통 부트스트랩.
 *
 * 브라우저 없이 **실제 소스**를 태우기 위한 장치다. Vite 로 src 를 그대로 로드하고
 * (`@/` alias · import.meta.env 해석 포함) MSW 를 Node 쪽에 물려 9개 엔드포인트를 응답시킨다.
 * DOM 은 jsdom 을 쓴다 — sonner·react-router·react-dom 이 각자 다른 DOM API 를 찾기 때문에
 * 부분 stub 으로는 감당이 안 된다.
 *
 * Playwright 스모크(Step 7)를 대체하지 않는다. 실제 브라우저·CSS 렌더는 그쪽 몫이다.
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import { setupServer } from 'msw/node';
import { createServer } from 'vite';

export function installDom() {
  // forceLogout 은 window.location.href 로 하드 이동한다. jsdom 은 실제로 이동하지 않고
  // "Not implemented: navigation" 을 jsdomError 로 뱉으므로 그걸로 이동 여부를 잡는다.
  const state = { hardNavigated: false };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (e.message.includes('navigation')) state.hardNavigated = true;
  });

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    virtualConsole,
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.history = dom.window.history;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  // sonner 가 3초 뒤 자동 dismiss 할 때 쓴다. 폴링처럼 오래 도는 케이스에서만 도달한다.
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);

  /**
   * Radix 는 전역 생성자를 그냥 참조한다 — Dialog 의 FocusScope 는 MutationObserver,
   * Select 는 HTMLFormElement 를 찾는다. 하나라도 비면 컴포넌트가 통째로 throw 한다.
   */
  for (const name of [
    'Element',
    'HTMLElement',
    'HTMLButtonElement',
    'HTMLFormElement',
    'HTMLInputElement',
    'Node',
    'NodeFilter',
    'NodeList',
    'DocumentFragment',
    'DOMRect',
    'MutationObserver',
    'Event',
    'CustomEvent',
    'KeyboardEvent',
    'MouseEvent',
    'PointerEvent',
  ]) {
    globalThis[name] = dom.window[name];
  }
  // jsdom 이 구현하지 않은 것들. Radix Select 목록을 열면 셋 다 호출된다.
  dom.window.HTMLElement.prototype.hasPointerCapture = () => false;
  dom.window.HTMLElement.prototype.setPointerCapture = () => {};
  dom.window.HTMLElement.prototype.releasePointerCapture = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};

  // jsdom 에 ResizeObserver 가 없다. Radix Popper(Select 목록)가 열릴 때만 쓴다.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  dom.window.ResizeObserver = globalThis.ResizeObserver;

  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  dom.window.matchMedia = globalThis.matchMedia;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return state;
}

export async function createRuntime() {
  process.env.VITE_API_HOST = 'http://localhost:8080';
  process.env.VITE_USE_MSW = 'true';
  // 폴링 간격을 실시간으로 기다리면 폴링 검사만 50초다. 프로덕션 기본값은 2000ms 그대로.
  process.env.VITE_POLL_INTERVAL_MS = '40';

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  const load = (path) => vite.ssrLoadModule(path);

  const { handlers } = await load('/src/mocks/handlers.ts');
  const server = setupServer(...handlers);
  const calls = { refresh: 0 };
  server.events.on('request:start', ({ request }) => {
    if (request.url.endsWith('/auth/refresh')) calls.refresh += 1;
  });
  server.listen({ onUnhandledRequest: 'error' });

  return {
    load,
    calls,
    /** 한 케이스만 다른 응답을 내고 싶을 때 `server.use(...)` 로 덮는다. */
    server,
    close: async () => {
      server.close();
      await vite.close();
    },
  };
}

/** 아주 작은 어서션 러너. 실패해도 계속 돌려서 한 번에 전부 본다. */
export function createChecker() {
  const result = { total: 0, failures: 0 };
  const check = (label, ok, detail = '') => {
    result.total += 1;
    if (!ok) result.failures += 1;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  };
  return {
    result,
    check,
    eq: (label, actual, expected) =>
      check(label, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}`),
    section: (title) => console.log(`\n── ${title}`),
  };
}
