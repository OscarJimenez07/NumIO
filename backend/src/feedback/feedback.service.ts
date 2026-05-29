import { Injectable } from '@nestjs/common';
import { Step, FeedbackItem, FeedbackResult } from './feedback.types';

@Injectable()
export class FeedbackService {
  /**
   * Compara los pasos esperados (algoritmo correcto) con los pasos ingresados
   * por el estudiante. Genera retroalimentación pedagógica para cada divergencia.
   */
  compare(expected: Step[], user: Step[], tolerance = 1e-3): FeedbackResult {
    const feedback: FeedbackItem[] = [];
    let matched = 0;
    const total = expected.length;

    const limit = Math.min(expected.length, user.length);

    for (let i = 0; i < limit; i++) {
      const exp = expected[i];
      const usr = user[i];
      const itemErrors: FeedbackItem[] = [];

      for (const key of Object.keys(exp.state)) {
        const expVal = exp.state[key];
        const usrVal = usr.state?.[key];

        if (usrVal === undefined || usrVal === null) {
          itemErrors.push({
            stepIndex: i,
            field: key,
            expected: expVal as any,
            got: '∅',
            message: `Falta el valor de "${key}" en la iteración ${i + 1}.`,
            severity: 'error',
          });
          continue;
        }

        if (typeof expVal === 'number' && typeof usrVal === 'number') {
          if (Math.abs(expVal - usrVal) > tolerance) {
            itemErrors.push({
              stepIndex: i,
              field: key,
              expected: expVal,
              got: usrVal,
              message: this.buildNumericMessage(i, key, expVal, usrVal),
              severity: 'error',
            });
          }
        } else if (Array.isArray(expVal) && Array.isArray(usrVal)) {
          if (expVal.length !== usrVal.length) {
            itemErrors.push({
              stepIndex: i,
              field: key,
              expected: `[${expVal.length} valores]`,
              got: `[${usrVal.length} valores]`,
              message: `El tamaño del vector "${key}" en la iteración ${i + 1} no coincide.`,
              severity: 'error',
            });
          } else {
            for (let k = 0; k < expVal.length; k++) {
              if (Math.abs((expVal as number[])[k] - (usrVal as number[])[k]) > tolerance) {
                itemErrors.push({
                  stepIndex: i,
                  field: `${key}[${k}]`,
                  expected: (expVal as number[])[k],
                  got: (usrVal as number[])[k],
                  message: `Componente ${k + 1} de "${key}" difiere en la iteración ${i + 1}.`,
                  severity: 'error',
                });
              }
            }
          }
        } else if (String(expVal) !== String(usrVal)) {
          itemErrors.push({
            stepIndex: i,
            field: key,
            expected: expVal as any,
            got: usrVal as any,
            message: `El valor de "${key}" no coincide en la iteración ${i + 1}.`,
            severity: 'error',
          });
        }
      }

      if (itemErrors.length === 0) matched++;
      feedback.push(...itemErrors);
    }

    if (user.length < expected.length) {
      feedback.push({
        stepIndex: user.length,
        field: '__steps__',
        expected: expected.length,
        got: user.length,
        message: `Faltan ${expected.length - user.length} iteración(es) por completar.`,
        severity: 'warning',
      });
    } else if (user.length > expected.length) {
      feedback.push({
        stepIndex: expected.length,
        field: '__steps__',
        expected: expected.length,
        got: user.length,
        message: `Ingresaste ${user.length - expected.length} iteración(es) de más; el método converge antes.`,
        severity: 'warning',
      });
    }

    return {
      isCorrect: feedback.filter((f) => f.severity === 'error').length === 0 && matched === total,
      feedback,
      matchedSteps: matched,
      totalSteps: total,
    };
  }

  private buildNumericMessage(stepIndex: number, field: string, expected: number, got: number): string {
    const diff = Math.abs(expected - got);
    return `El valor de "${field}" en la iteración ${stepIndex + 1} esperado es ${expected.toFixed(6)} pero ingresaste ${got.toFixed(6)} (diferencia ${diff.toExponential(2)}). Revisa la sustitución y el cálculo.`;
  }
}
