import { Step } from '../../feedback/feedback.types';

export interface SolveResult {
  result: Record<string, any>;
  steps: Step[];
  plotData?: PlotData;
  message?: string;
}

export interface PlotData {
  type: 'function' | 'points' | 'integral';
  fnSource?: string;
  xRange?: [number, number];
  points?: Array<{ x: number; y: number }>;
  marks?: Array<{ x: number; y?: number; label?: string }>;
}

export { Step };
