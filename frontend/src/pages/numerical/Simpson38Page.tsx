import { IntegrationPage } from './IntegrationPage';

export function Simpson38Page() {
  return (
    <IntegrationPage
      title="Simpson 3/8"
      slug="simpson-3-8"
      description="Aproxima la integral usando polinomios cúbicos. Requiere n múltiplo de 3."
      defaultN={6}
    />
  );
}
