export interface Candidate {
  fileName: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  employer: string;
  address: string;
  workingSince: string;
  totalExperience: string;
  location: string;
  qualification: string;
  dateOfBirth: string; // <-- Add this
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  startDate: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
}

export interface UploadResult {
  success: boolean;
  data?: Candidate;
  error?: string;
  fileName: string;
}
