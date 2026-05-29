import { IntegrationPage } from './IntegrationPage';

export function Simpson13Page() {
  return (
    <IntegrationPage
      title="Simpson 1/3"
      slug="simpson-1-3"
      description="Aproxima la integral usando polinomios cuadráticos en cada par de subintervalos. Requiere n par."
      defaultN={4}
    />
  );
}
