export interface Step {
  iteration: number;
  state: Record<string, number | string | number[] | string[]>;
  explanation?: string;
  latex?: string;
}

export interface FeedbackItem {
  stepIndex: number;
  field: string;
  expected: number | string;
  got: number | string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FeedbackResult {
  isCorrect: boolean;
  feedback: FeedbackItem[];
  matchedSteps: number;
  totalSteps: number;
}
