export interface PaginatedResponse<T> {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  content: T[];
}

export interface ErrorResponse {
  code: number;
  message: string;
}
