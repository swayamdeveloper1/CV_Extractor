import axios, { AxiosPromise } from "axios";
import { LoginResponse, UploadResponse, CandidatesResponse, ProgressState } from "../types";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
};

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function startUpload(
  files: File[], sessionId: string, /*aiMode: boolean = false, openRouterApiKey: string = ""*/
  aiMode?: boolean, openRouterApiKey?: string
): AxiosPromise<UploadResponse> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  // formData.append("llmMode", aiMode ? "true" : "false");
  // formData.append("openRouterApiKey", openRouterApiKey);
  formData.append("llmMode", "false");
  formData.append("openRouterApiKey", "");
  const headers: Record<string, string> = { "X-Session-Id": sessionId };
  return api.post<UploadResponse>("/resumes/upload", formData, { headers });
}

export const pollProgress = async (sessionId: string): Promise<ProgressState> => {
  const { data } = await api.get<ProgressState>(`/resumes/progress/${sessionId}`);
  return data;
};

export const getCandidates = async (): Promise<CandidatesResponse> => {
  const { data } = await api.get("/resumes");
  return data;
};

export const downloadCsv = async (): Promise<void> => {
  const { data } = await api.get("/resumes/export", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `candidates-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const clearCandidates = async (): Promise<void> => {
  await api.delete("/resumes/clear");
};
