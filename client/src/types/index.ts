export interface Candidate {
  fileName: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
   dateOfBirth: string;
  employer: string;
  address: string;
  workingSince: string;
  totalExperience: string;
  location: string;
  qualification: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
  };
}

export interface UploadResponse {
  results: {
    success: boolean;
    data?: Candidate;
    error?: string;
    fileName: string;
  }[];
  total: number;
  successCount: number;
  failCount: number;
}

export interface CandidatesResponse {
  candidates: Candidate[];
  total: number;
}

export interface ProgressState {
  total: number;
  completed: number;
  failed: number;
  status: "parsing" | "done" | "error" | "pending";
}
