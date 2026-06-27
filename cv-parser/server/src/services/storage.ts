import { Candidate } from "../types";

class StorageService {
  private candidates: Candidate[] = [];

  add(candidate: Candidate): void {
    this.candidates.push(candidate);
  }

  addMany(candidates: Candidate[]): void {
    this.candidates.push(...candidates);
  }

  getAll(): Candidate[] {
    return [...this.candidates];
  }

  clear(): void {
    this.candidates = [];
  }

  count(): number {
    return this.candidates.length;
  }
}

export const storage = new StorageService();
