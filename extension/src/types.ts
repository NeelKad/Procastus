export type TaskStatus = 'pending' | 'in_progress' | 'complete';

export interface ExtractionResult {
  title: string;
  brief_description: string;
  requirements: string[];
  acceptance_criteria: string[];
  estimated_minutes: number;
  tips: string[];
}

export interface Task {
  id: string;
  title: string;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  status: TaskStatus;
  /** Optional AI-generated plan (requirements, estimated time, tips) attached by the backend */
  plan?: ExtractionResult;
}

export interface VerificationResult {
  verdict: 'complete' | 'incomplete';
  confidence: number;
  missing: string[];
  notes: string[];
}
