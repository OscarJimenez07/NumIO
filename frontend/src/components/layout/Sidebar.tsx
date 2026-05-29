import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';

const linkBase =
  'block px-3 py-2 rounded text-sm transition-colors';
const active = 'bg-brand-100 text-brand-800 font-medium';
const inactive = 'text-slate-600 hover:bg-slate-100';

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const isTeacher = role === 'TEACHER' || role === 'ADMIN';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 overflow-auto p-4 hidden md:block">
      <Section title="General">
        <Item to="/" label="Inicio" />
        <Item to="/dashboard" label="Mi panel" />
      </Section>

      <Section title="Análisis Numérico">
        <Item to="/numerical/bisection" label="Bisección" />
        <Item to="/numerical/newton-raphson" label="Newton-Raphson" />
        <Item to="/numerical/lagrange" label="Lagrange" />
        <Item to="/numerical/newton-divided" label="Newton (DD)" />
        <Item to="/numerical/trapezoidal" label="Trapecio" />
        <Item to="/numerical/simpson-1-3" label="Simpson 1/3" />
        <Item to="/numerical/simpson-3-8" label="Simpson 3/8" />
      </Section>

      <Section title="Investigación de Operaciones">
        <Item to="/operations/simplex" label="Símplex" />
        <Item to="/operations/transportation" label="Transporte" />
        <Item to="/operations/assignment" label="Asignación" />
      </Section>

      <Section title="Validación">
        <Item to="/pilot/pre-test" label="Pre-test" />
        <Item to="/pilot/post-test" label="Pos-test" />
        <Item to="/pilot/sus" label="Encuesta SUS" />
      </Section>

      {isTeacher && (
        <Section title="Docente">
          <Item to="/teacher/results" label="Resultados piloto" />
          <Item to="/teacher/students" label="Estudiantes" />
        </Section>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs uppercase font-semibold text-slate-500 mb-2 tracking-wide">{title}</p>
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}

function Item({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
      {label}
    </NavLink>
  );
}
