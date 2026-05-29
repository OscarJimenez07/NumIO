# Arquitectura — NumIO

## Visión general

NumIO sigue una arquitectura cliente-servidor de tres capas, desplegada como tres contenedores Docker:

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Frontend    │  HTTP  │   Backend    │  TCP   │  PostgreSQL  │
│  React+Vite  │◀──────▶│   NestJS     │◀──────▶│      16      │
│  nginx :80   │  REST  │  :3000       │ Prisma │   :5432      │
└──────────────┘        └──────────────┘        └──────────────┘
       :8080                  :3000                  :5432
```

## Capas

### 1. Frontend (`frontend/`)
- React 18 + TypeScript + Vite + Tailwind CSS.
- Router declarativo (react-router v6) con guardias `RequireAuth` y `RequireRole`.
- Estado global con Zustand (sólo sesión: token + user).
- Cliente HTTP Axios con interceptor JWT.
- Visualización: Plotly.js (gráficas), KaTeX (fórmulas LaTeX), math.js (parser local).
- Empaquetado en imagen multi-stage que termina sirviendo `dist/` con nginx.

### 2. Backend (`backend/`)
NestJS con módulos:
- `auth`: registro, login, JWT, guards de roles (STUDENT/TEACHER/ADMIN).
- `users`: listado y detalle (sólo TEACHER+).
- `numerical`: 7 servicios de algoritmos (Bisección, Newton-Raphson, Lagrange, Newton-DD, Trapecio, Simpson 1/3, Simpson 3/8) + parser de expresiones.
- `operations`: 3 algoritmos (Símplex, Transporte Vogel+MODI, Hungarian).
- `attempts`: persiste cada intento del estudiante.
- `feedback`: motor de comparación paso a paso con tolerancia numérica.
- `pilot`: pre/post-test, encuesta SUS, resumen agregado.
- `prisma`: cliente Prisma compartido (Global module).
- `common`: filtros HTTP e interceptors.

Cada servicio de método expone `solve(input)` y `validate(input, userSteps)`.
Estructura del paso:
```ts
{ iteration, state: { ... }, explanation, latex }
```

### 3. Persistencia (`backend/prisma/schema.prisma`)
PostgreSQL con tablas:
- `User` (cuid, email único, passwordHash, fullName, role)
- `Method` (catálogo de los 10 métodos por slug)
- `Attempt` (intento del estudiante con steps esperados, userSteps y feedback)
- `TestResult` (pre/post-test)
- `SusResponse` (10 respuestas + score 0-100)

Cascade en delete para mantener integridad por usuario.

## Flujo típico (Bisección)

1. Estudiante completa formulario en `/numerical/bisection`.
2. Frontend POST `/numerical/bisection/solve` con `{ fn, a, b, tolerance }`.
3. NestJS valida DTO con class-validator y delega a `BisectionService.solve()`.
4. `Expr` (mathjs wrapper) parsea `fn` y evalúa f(c) en cada iteración.
5. Servicio devuelve `{ result, steps[], plotData }`.
6. Frontend renderiza gráfica + tabla + reproductor.
7. Estudiante elige modo "Practicar" → ingresa pasos → POST `/numerical/bisection/validate`.
8. `FeedbackService.compare()` produce diagnóstico.
9. Resultado se persiste en `Attempt` para historial.

## Decisiones técnicas

| Decisión | Alternativa | Motivo |
|----------|-------------|--------|
| Monorepo (front + back) | Repos separados | Despliegue conjunto, simplifica uso académico |
| JWT vs Sessions | Sessions con cookie | Permite que frontend SPA y backend vivan en orígenes distintos sin compartir cookies |
| math.js vs implementar parser | Parser propio | Soporte de expresiones, derivadas simbólicas, latex out-of-the-box |
| PostgreSQL 16 | MySQL/SQLite | Estándar industria, mejor soporte Prisma, JSONB nativo |
| Plotly.js | D3.js bare | Mayor productividad para gráficas científicas; menos código |
| nginx en frontend | servir desde Express | Imagen final más liviana, mejor caching estático |
| Vogel + MODI | Esquina noroeste + stepping stone | Solución básica más cercana a óptima → menos iteraciones MODI |

## Limitaciones conocidas

- El método Símplex de la versión actual no implementa Big-M ni dos fases (asume problemas de maximización con restricciones `<=` y `b ≥ 0`).
- El motor de retroalimentación compara con tolerancia numérica fija (1e-3); puede ajustarse a futuro.
- No hay i18n (todo en español).
- No hay paginación en listados (límite hard-coded a 100/500).

## Diagrama de despliegue

```
host (Docker host)
├── docker-compose
│   ├── numio-db        (postgres:16-alpine)
│   ├── numio-backend   (node:20-alpine + dist)
│   └── numio-frontend  (nginx:alpine + dist)
└── volúmenes: dbdata
```
