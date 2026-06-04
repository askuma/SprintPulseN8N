import axios from "axios";
import type {
  Report,
  GenerateReportRequest,
  UpdateReportRequest,
  SendReportRequest,
  Integration,
  ConnectIntegrationRequest,
  DeliveryLog,
} from "@sprintpulse/shared-types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sp_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh on 401
api.interceptors.response.use(
  r => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refreshToken = localStorage.getItem("sp_refresh_token");
        const { data } = await axios.post("/api/auth/refresh", { refresh_token: refreshToken });
        localStorage.setItem("sp_access_token", data.access_token);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(error.config);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- Reports ---
export const reportsApi = {
  list: (workspaceId: string, status?: string, cursor?: string) =>
    api.get<{ reports: Partial<Report>[]; next_cursor: string | null; has_more: boolean }>("/v1/reports", {
      params: { workspace_id: workspaceId, status, cursor },
    }),

  get: (id: string) =>
    api.get<{ data: Report }>(`/v1/reports/${id}`),

  generate: (body: GenerateReportRequest) =>
    api.post<{ data: { report_id: string; status: string } }>("/v1/reports/generate", body),

  update: (id: string, body: UpdateReportRequest) =>
    api.put<{ data: { id: string; updated: boolean } }>(`/v1/reports/${id}`, body),

  send: (id: string, body: SendReportRequest) =>
    api.post<{ data: { report_id: string; status: string } }>(`/v1/reports/${id}/send`, body),
};

// --- Integrations ---
export const integrationsApi = {
  list: (workspaceId: string) =>
    api.get<{ data: Integration[] }>("/v1/integrations", { params: { workspace_id: workspaceId } }),

  connect: (body: ConnectIntegrationRequest) =>
    api.post<{ data: Integration }>("/v1/integrations/connect", body),

  disconnect: (id: string) =>
    api.delete(`/v1/integrations/${id}`),

  sync: (id: string) =>
    api.post<{ data: { job_id: string; status: string } }>(`/v1/integrations/${id}/sync`),

  status: (id: string) =>
    api.get<{ data: Pick<Integration, "id" | "type" | "status" | "last_synced_at" | "last_error"> }>(`/v1/integrations/${id}/status`),
};

export default api;
