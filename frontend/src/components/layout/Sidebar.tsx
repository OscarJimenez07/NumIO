import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CLAVE_PANEL, useAuthStore } from '@/lib/auth';
import { Icon, IconName } from './Icons';
import marcaUts from '@/assets/marca-uts.png';
import logoUts from '@/assets/logo-uts.png';

interface ItemDef { to: string; label: string; icon: IconName }
interface SectionDef { id: string; title?: string; items: ItemDef[]; teacherOnly?: boolean }

/** El primer grupo va sin título: son los accesos generales. */
const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    items: [
      { to: '/', label: 'Inicio', icon: 'home' },
      { to: '/dashboard', label: 'Mi panel', icon: 'dashboard' },
    ],
  },
  {
    id: 'numerical',
    title: 'Análisis Numérico',
    items: [
      { to: '/numerical/bisection', label: 'Bisección', icon: 'bisection' },
      { to: '/numerical/newton-raphson', label: 'Newton-Raphson', icon: 'newton' },
      { to: '/numerical/lagrange', label: 'Lagrange', icon: 'lagrange' },
      { to: '/numerical/newton-divided', label: 'Newton (DD)', icon: 'divided' },
      { to: '/numerical/trapezoidal', label: 'Trapecio', icon: 'trapezoid' },
      { to: '/numerical/simpson-1-3', label: 'Simpson 1/3', icon: 'parabola' },
      { to: '/numerical/simpson-3-8', label: 'Simpson 3/8', icon: 'cubic' },
    ],
  },
  {
    id: 'operations',
    title: 'Inv. de Operaciones',
    items: [
      { to: '/operations/simplex', label: 'Símplex', icon: 'simplex' },
      { to: '/operations/transportation', label: 'Transporte', icon: 'transport' },
      { to: '/operations/assignment', label: 'Asignación', icon: 'assignment' },
    ],
  },
  {
    id: 'pilot',
    title: 'Validación',
    items: [
      { to: '/pilot/pre-test', label: 'Pre-test', icon: 'pretest' },
      { to: '/pilot/post-test', label: 'Pos-test', icon: 'posttest' },
      { to: '/pilot/opinion', label: 'Encuesta de opinión', icon: 'opinion' },
    ],
  },
  {
    id: 'teacher',
    title: 'Docente',
    teacherOnly: true,
    items: [
      { to: '/teacher/results', label: 'Resultados piloto', icon: 'results' },
      { to: '/teacher/opinion', label: 'Resultados de opinión', icon: 'opinionResults' },
      { to: '/teacher/students', label: 'Usuarios', icon: 'students' },
    ],
  },
];

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const isTeacher = role === 'TEACHER' || role === 'ADMIN';
  const { pathname } = useLocation();

  const sections = useMemo(
    () => SECTIONS.filter((s) => !s.teacherOnly || isTeacher),
    [isTeacher],
  );

  // En escritorio la barra se despliega o se reduce a iconos solo con la
  // flecha de arriba; no reacciona al puntero, para que no se mueva sola al
  // pasar el ratón. La preferencia se recuerda en el navegador.
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_PANEL) !== 'reducido';
    } catch {
      return true;
    }
  });
  const alternar = () =>
    setExpanded((e) => {
      try {
        localStorage.setItem(CLAVE_PANEL, e ? 'reducido' : 'desplegado');
      } catch {
        /* sin almacenamiento solo se pierde el recuerdo */
      }
      return !e;
    });

  useEffect(() => { onCloseMobile(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseMobile(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  /** Visible siempre en móvil; en escritorio solo con la barra desplegada. */
  const soloDesplegada = expanded ? '' : 'md:hidden';

  return (
    <>
      {/* Velo del cajón en pantallas pequeñas */}
      <div
        className={`fixed inset-0 z-30 bg-ink/40 backdrop-blur-[1px] transition-opacity md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Este hueco es el que ocupa la barra en la maquetación: al ensancharse
          desplaza la página, de modo que el contenido se reacomoda en lugar de
          quedar tapado. El ancho se declara en UNA sola rama, porque si las dos
          clases conviven gana la que Tailwind emite de última en el CSS y la
          barra nunca se ensancharía. */}
      <div
        className={`relative w-0 shrink-0 transition-[width] duration-200 ease-out
          ${expanded ? 'md:w-72' : 'md:w-[4.75rem]'}`}
      >
        {/* Flecha para desplegar o reducir la barra (solo escritorio). Va fuera
            del <aside> porque este recorta lo que sobresale de su borde. */}
        <button
          type="button"
          onClick={alternar}
          aria-label={expanded ? 'Reducir el menú' : 'Desplegar el menú'}
          aria-expanded={expanded}
          title={expanded ? 'Reducir el menú' : 'Desplegar el menú'}
          className="absolute -right-3.5 top-5 z-50 hidden h-7 w-7 items-center justify-center
                     rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm
                     hover:bg-slate-100 hover:text-slate-900 focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-brand-600 md:flex"
        >
          <Icon name="chevron" className={`h-4 w-4 ${expanded ? 'rotate-90' : '-rotate-90'}`} />
        </button>

        <aside
          aria-label="Navegación de métodos"
          className={`
            fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden
            border-r border-slate-200 bg-white text-slate-900
            transition-transform duration-200 ease-out
            md:absolute md:w-full md:translate-x-0 md:transition-none
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Cabecera: reducida deja solo la marca; desplegada añade el nombre */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-3">
            <NavLink
              to="/"
              className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none
                         focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {/* Reducida solo cabe el símbolo; desplegada entra el logotipo
                  completo. Ambos van sin recuadro: sobre la barra blanca el
                  logo institucional se muestra tal cual. */}
              <img
                src={marcaUts}
                alt="Unidades Tecnológicas de Santander"
                className={`h-9 w-auto shrink-0 ${expanded ? 'hidden' : 'hidden md:block'}`}
                width={320}
                height={225}
              />
              <img
                src={logoUts}
                alt="Unidades Tecnológicas de Santander"
                className={`h-11 w-auto shrink-0 ${expanded ? 'block' : 'block md:hidden'}`}
                width={640}
                height={384}
              />
              <span className={`flex min-w-0 flex-col leading-tight ${soloDesplegada}`}>
                <span className="truncate text-lg font-bold tracking-tight text-slate-900">NumIO</span>
                <span className="truncate text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">
                  BAN-00311
                </span>
              </span>
            </NavLink>

            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Cerrar menú"
              className="ml-auto rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 md:hidden"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
            {sections.map((section, i) => (
              <div key={section.id} className={i > 0 ? 'mt-1' : ''}>
                {section.title ? (
                  <>
                    <p
                      className={`truncate px-3 pb-1 pt-3 text-[0.68rem] font-bold uppercase
                                  tracking-wider text-slate-600 ${soloDesplegada}`}
                    >
                      {section.title}
                    </p>
                    {/* Reducida no caben los títulos: los grupos se separan
                        con una línea. */}
                    {!expanded && <div className="mx-auto my-2.5 hidden h-px w-8 bg-slate-200 md:block" />}
                  </>
                ) : null}

                <nav className="space-y-1">
                  {section.items.map((item) => (
                    <Item key={item.to} {...item} expanded={expanded} />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function Item({ to, label, icon, expanded }: ItemDef & { expanded: boolean }) {
  return (
    <NavLink
      to={to}
      end
      title={expanded ? undefined : label}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors
         focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
         ${expanded ? 'px-3' : 'px-3 md:justify-center md:px-0'}
         ${isActive
           ? 'bg-brand-500 font-semibold text-ink shadow-sm'
           : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-900" />
          )}
          <Icon name={icon} className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-950' : ''}`} />
          <span className={`truncate ${expanded ? '' : 'md:hidden'}`}>{label}</span>
        </>
      )}
    </NavLink>
  );
}
