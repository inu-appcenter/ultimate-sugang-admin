/** 03 §2-4. `page` 는 1부터 센다. 페이지 크기는 서버가 10 으로 고정하며 `size` 파라미터가 없다. */
export interface PaginatedResponse<T> {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  content: T[];
}

/** 03 §2-5. `code` 는 정수다 — 문자열 도메인 코드가 아니다. */
export interface ErrorResponse {
  code: number;
  message: string;
}
