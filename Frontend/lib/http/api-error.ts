export type ApiErrorDetail = {
  field: string;
  message: string;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details ?? [];
  }

  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}
