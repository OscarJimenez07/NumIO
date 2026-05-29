import { Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';

const NUMERICAL = [
  { slug: 'bisection', name: 'Bisección', desc: 'Búsqueda de raíces dividiendo el intervalo.' },
  { slug: 'newton-raphson', name: 'Newton-Raphson', desc: 'Método abierto basado en la derivada.' },
  { slug: 'lagrange', name: 'Interpolación de Lagrange', desc: 'Polinomio interpolante por combinación lineal.' },
  { slug: 'newton-divided', name: 'Diferencias Divididas (Newton)', desc: 'Polinomio en forma de Newton.' },
  { slug: 'trapezoidal', name: 'Regla del Trapecio', desc: 'Integración numérica por áreas trapezoidales.' },
  { slug: 'simpson-1-3', name: 'Simpson 1/3', desc: 'Integración por polinomios cuadráticos.' },
  { slug: 'simpson-3-8', name: 'Simpson 3/8', desc: 'Integración por polinomios cúbicos.' },
];

const OPERATIONS = [
  { slug: 'simplex', name: 'Símplex', desc: 'Programación lineal por método tabular.' },
  { slug: 'transportation', name: 'Transporte', desc: 'Vogel + MODI para problemas de transporte.' },
  { slug: 'assignment', name: 'Asignación', desc: 'Algoritmo Húngaro para matching óptimo.' },
];

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">
          Bienvenido{user ? `, ${user.fullName}` : ''} 👋
        </h1>
        <p className="text-slate-600 mt-1">
          Plataforma interactiva para el aprendizaje de Análisis Numérico e Investigación de Operaciones.
          Cada módulo ofrece resolución paso a paso con visualización gráfica y retroalimentación inmediata.
        </p>
      </div>

      <Section title="Análisis Numérico" basePath="/numerical" items={NUMERICAL} />
      <Section title="Investigación de Operaciones" basePath="/operations" items={OPERATIONS} />
    </div>
  );
}

function Section({
  title,
  basePath,
  items,
}: {
  title: string;
  basePath: string;
  items: { slug: string; name: string; desc: string }[];
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Link
            key={it.slug}
            to={`${basePath}/${it.slug}`}
            className="card hover:shadow-md hover:border-brand-300 transition-all"
          >
            <h3 className="font-semibold text-slate-800">{it.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{it.desc}</p>
            <span className="inline-block mt-3 text-xs text-brand-700 font-medium">Abrir módulo →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
