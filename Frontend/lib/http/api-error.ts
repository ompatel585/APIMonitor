export type ApiErrorPayload = {
  code: string;
  message: string | string[];
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, payload: ApiErrorPayload) {
    super(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.requestId = payload.requestId;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}
