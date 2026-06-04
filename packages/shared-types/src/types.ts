export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
  total?: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface JobResponse {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  message?: string;
}

// JWT claims embedded in Auth0 token
export interface JWTPayload {
  sub: string;
  email: string;
  workspace_id: string;
  role: "workspace_admin" | "scrum_master" | "viewer";
  iat: number;
  exp: number;
}
