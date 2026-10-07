/**
 * Iconografía de la barra lateral.
 *
 * Se dibujan a mano en lugar de traer una librería: son dieciocho trazos, no
 * justifican una dependencia nueva ni el peso extra en el paquete final. Cada
 * glifo evoca el método que representa (el intervalo que se parte a la mitad,
 * la recta tangente, el trapecio bajo la curva) en vez de un símbolo genérico.
 *
 * Todos comparten lienzo de 24×24, trazo de 1.75 y `currentColor`, de modo que
 * heredan el color del enlace que los contiene.
 */

export type IconName =
  | 'home' | 'dashboard'
  | 'bisection' | 'newton' | 'lagrange' | 'divided'
  | 'trapezoid' | 'parabola' | 'cubic'
  | 'simplex' | 'transport' | 'assignment'
  | 'pretest' | 'posttest' | 'survey' | 'opinion'
  | 'results' | 'students' | 'opinionResults'
  | 'menu' | 'close' | 'chevron' | 'panel' | 'logout';

const paths: Record<IconName, JSX.Element> = {
  // --- General ---
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></>,
  dashboard: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,

  // --- Raíces: el intervalo que se parte / la recta tangente ---
  bisection: <><path d="M3 12h18" /><path d="M3 8.5v7M21 8.5v7" /><path d="M12 9.5v5" /><circle cx="12" cy="12" r="1.6" /></>,
  newton: <><path d="M3 19c5.5 0 8-14 12.5-14" /><path d="M7 21 19 7" /><circle cx="9.5" cy="18.5" r="1.4" /></>,

  // --- Interpolación: la curva que pasa por los puntos / la tabla triangular ---
  lagrange: <><path d="M3 17c3.5 0 4.5-9 8-9s5 6 10 6" /><circle cx="5" cy="16.4" r="1.4" /><circle cx="11" cy="8" r="1.4" /><circle cx="19" cy="13.6" r="1.4" /></>,
  divided: <><path d="M4 6h16" /><path d="M6 11h12" /><path d="M8 16h8" /><path d="M10 21h4" /></>,

  // --- Integración: las tres figuras que rellenan cada franja ---
  trapezoid: <><path d="M3 19h18" /><path d="M3 19 8 7h8l5 12" /><path d="M8 19V7M16 19V7" /></>,
  parabola: <><path d="M3 19h18" /><path d="M4 19c0-9 4-12 8-12s8 3 8 12" /><path d="M9 19v-9M15 19v-9" /></>,
  cubic: <><path d="M3 19h18" /><path d="M4 18c3-11 5 4 8-6s5 5 8-4" /><path d="M8 19v-6M12 19v-4M16 19v-7" /></>,

  // --- Investigación de operaciones ---
  simplex: <><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17" /><path d="M9 9.5v10" /><rect x="9" y="9.5" width="5.5" height="5" fill="currentColor" stroke="none" opacity=".45" /></>,
  transport: <><circle cx="5.5" cy="6.5" r="2.2" /><circle cx="5.5" cy="17.5" r="2.2" /><circle cx="18.5" cy="12" r="2.2" /><path d="M7.6 7.6 16.6 11M7.6 16.4 16.6 13" /></>,
  assignment: <><circle cx="6" cy="5.5" r="1.8" /><circle cx="6" cy="12" r="1.8" /><circle cx="6" cy="18.5" r="1.8" /><circle cx="18" cy="5.5" r="1.8" /><circle cx="18" cy="12" r="1.8" /><circle cx="18" cy="18.5" r="1.8" /><path d="M7.8 5.5h8.4M7.8 12.6 16.2 18M7.8 17.9 16.2 12.6" /></>,

  // --- Validación pedagógica ---
  pretest: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3.5h6v2.5H9z" /><path d="M9 12h6M9 16h4" /></>,
  posttest: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3.5h6v2.5H9z" /><path d="m9 13.5 2.2 2.2L15.5 11" /></>,
  survey: <><path d="M4 18h3v-5H4zM10.5 18h3V8h-3zM17 18h3v-8h-3z" /><path d="M3 21h18" /></>,

  // --- Docente ---
  // Globo de diálogo: la opinión del estudiante; con barras, sus resultados.
  opinion: <><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><path d="M8 9h8M8 12h5" /></>,
  opinionResults: <><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><path d="M9 13v-2M12 13V8M15 13v-4" /></>,
  results: <><path d="M4 4v16h16" /><path d="m7 15 3.5-4 3 2.5L20 7" /><circle cx="10.5" cy="11" r="1.2" /><circle cx="13.5" cy="13.5" r="1.2" /></>,
  students: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16.5 6.2a3 3 0 0 1 0 5.6" /><path d="M17 14.4c2.2.6 3.5 2.4 3.5 4.6" /></>,

  // --- Controles de la interfaz ---
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="M6 6 18 18M18 6 6 18" /></>,
  chevron: <><path d="m8 10 4 4 4-4" /></>,
  panel: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /></>,
  logout: <><path d="M14 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8" /><path d="M17 15.5 20.5 12 17 8.5" /><path d="M20 12h-9" /></>,
};

interface Props {
  name: IconName;
  className?: string;
}

export function Icon({ name, className = 'w-5 h-5' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
