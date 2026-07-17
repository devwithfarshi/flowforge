/**
 * Error type for the real HTTP transport.
 *
 * The backend returns RFC 9457 `application/problem+json` on every non-2xx
 * response (blueprint §10.2). We surface those as `ApiError` so the existing UI
 * — which already does `err instanceof ApiError ? err.message : "…"` — keeps
 * working unchanged. The mock `api.ts` throws this same class, so a single
 * `instanceof` check covers both the mock and the real backend.
 */

/** RFC 9457 problem document (superset — includes ASP.NET's validation `errors`). */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Field → messages, from `ValidationProblemDetails` on a 400. */
  errors?: Record<string, string[]>;
  traceId?: string;
  /** Any additional members the API attaches. */
  [key: string]: unknown;
}

export interface ApiErrorInit {
  /** HTTP status code; `0` for network/transport failures. */
  status?: number;
  /** The parsed problem document, when the body was `problem+json`. */
  problem?: ProblemDetails;
  /** Flattened field validation errors, for binding to form fields. */
  errors?: Record<string, string[]>;
  /** Correlation id echoed by the API (`X-Correlation-Id` / problem `traceId`). */
  traceId?: string;
}

export class ApiError extends Error {
  /** HTTP status code; `0` means the request never reached the server. */
  readonly status: number;
  readonly problem?: ProblemDetails;
  /** Field → messages for validation failures (empty object when none). */
  readonly errors: Record<string, string[]>;
  readonly traceId?: string;

  constructor(message: string, init: ApiErrorInit = {}) {
    super(message);
    this.name = "ApiError";
    this.status = init.status ?? 0;
    this.problem = init.problem;
    this.errors = init.errors ?? {};
    this.traceId = init.traceId;
    // Restore prototype chain for `instanceof` across the ES5 transpile target.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** True when the request never reached the server (offline, DNS, CORS). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** First validation message for a field, if any — handy for form binding. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }

  /** Build an `ApiError` from a fetch `Response`, reading its problem body. */
  static async fromResponse(res: Response): Promise<ApiError> {
    const traceId = res.headers.get("X-Correlation-Id") ?? undefined;
    let problem: ProblemDetails | undefined;
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("json")) {
        problem = (await res.json()) as ProblemDetails;
        message = problem.detail || problem.title || message;
      } else {
        const text = (await res.text()).trim();
        if (text) message = text;
      }
    } catch {
      // Body already consumed or not JSON — keep the status-derived message.
    }
    return new ApiError(message, {
      status: res.status,
      problem,
      errors: problem?.errors,
      traceId: problem?.traceId ?? traceId,
    });
  }
}
