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

En producción (Azure) se agrega Caddy adelante, que es lo único expuesto a internet:

```
Internet ──HTTPS──▶ Caddy :443 ──▶ Frontend (nginx) ──/api──▶ Backend ──▶ PostgreSQL
                    (Let's Encrypt)                          (red interna Docker, sin puertos publicados)
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
- `auth`: ingreso con Microsoft Entra ID, con código enviado al correo y con usuario/contraseña; registro (solo estudiantes); cambio obligatorio de contraseña temporal; JWT y guards de roles (STUDENT/TEACHER/ADMIN).
- `users`: listado, detalle, cambio de rol y restablecimiento de contraseña (sólo TEACHER+; los administradores solo los gestiona un ADMIN).
- `numerical`: 7 servicios de algoritmos (Bisección, Newton-Raphson, Lagrange, Newton-DD, Trapecio, Simpson 1/3, Simpson 3/8) + parser de expresiones.
- `operations`: 3 algoritmos (Símplex, Transporte Vogel+MODI, Hungarian).
- `attempts`: persiste cada práctica validada del estudiante (la resolución automática no se guarda como intento).
- `feedback`: motor de comparación paso a paso con tolerancia numérica.
- `pilot`: cuestionario del pre/post-test, calificación en el servidor (la clave de respuestas no sale del backend), encuesta SUS y resumen agregado.
- `opinion`: encuesta de opinión del piloto (afirmaciones por dimensión, recomendación, frecuencia de uso, módulos usados y los 10 ítems SUS) con resultados agregados para el docente.
- `prisma`: cliente Prisma compartido (Global module).
- `common`: filtros HTTP e interceptors.

Cada servicio de método expone `solve(input)` y `validate(input, userSteps)`.
Estructura del paso:
```ts
{ iteration, state: { ... }, explanation, latex }
```

### 3. Persistencia (`backend/prisma/schema.prisma`)
PostgreSQL con tablas:
- `User` (cuid, email único, passwordHash opcional, fullName, role, provider LOCAL/MICROSOFT, mustChangePassword)
- `LoginCode` (códigos de un solo uso para ingreso y restablecimiento, guardados con hash y con vencimiento)
- `Method` (catálogo de los 10 métodos por slug)
- `Attempt` (intento del estudiante con steps esperados, userSteps y feedback)
- `TestResult` (pre/post-test)
- `SusResponse` (10 respuestas + score 0-100)
- `OpinionResponse` (una por usuario: respuestas de la encuesta de opinión y SUS)

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
9. Resultado se persiste en `Attempt` para historial (solo las prácticas validadas, no las resoluciones automáticas).

## Decisiones técnicas

| Decisión | Alternativa | Motivo |
|----------|-------------|--------|
| Monorepo (front + back) | Repos separados | Despliegue conjunto, simplifica uso académico |
| Microsoft Entra ID + código por correo | Solo contraseña | Los estudiantes entran con su cuenta institucional y no hay que repartir contraseñas |
| Calificar el pre/post-test en el servidor | Calificar en el navegador | La clave de respuestas no queda en el código que descarga el navegador |
| Caddy como proxy en producción | Nginx con certbot | Certificado HTTPS automático y renovación sin intervención |
| JWT vs Sessions | Sessions con cookie | Permite que frontend SPA y backend vivan en orígenes distintos sin compartir cookies |
| math.js vs implementar parser | Parser propio | Soporte de expresiones, derivadas simbólicas, latex out-of-the-box |
| PostgreSQL 16 | MySQL/SQLite | Estándar industria, mejor soporte Prisma, JSONB nativo |
| Plotly.js | D3.js bare | Mayor productividad para gráficas científicas; menos código |
| nginx en frontend | servir desde Express | Imagen final más liviana, mejor caching estático |
| Vogel + MODI | Esquina noroeste + stepping stone | Solución básica más cercana a óptima → menos iteraciones MODI |

## Limitaciones conocidas

- El modo de práctica de transporte valida las asignaciones de Vogel; las iteraciones de MODI solo se muestran en la resolución guiada.
- El motor de retroalimentación compara con tolerancia numérica fija (1e-3); puede ajustarse a futuro.
- No hay i18n (todo en español).
- No hay paginación en listados (límite hard-coded a 100/500).

## Diagrama de despliegue

Local (`docker-compose.yml`):
```
host (Docker host)
├── docker-compose
│   ├── numio-db        (postgres:16-alpine)
│   ├── numio-backend   (node:20-alpine + dist)
│   └── numio-frontend  (nginx:alpine + dist)
└── volúmenes: dbdata
```

Producción (`docker-compose.prod.yml`, máquina virtual de Azure for Students, https://numio.mexicocentral.cloudapp.azure.com):
```
numio-vm (Ubuntu + Docker)
├── docker-compose.prod.yml
│   ├── numio-caddy     (caddy:2-alpine, puertos 80/443)
│   ├── numio-frontend  (nginx:alpine + dist, reenvía /api)
│   ├── numio-backend   (node:20-alpine + dist, sin puerto público)
│   └── numio-db        (postgres:16-alpine, sin puerto público)
└── volúmenes: dbdata, datos de Caddy (certificados)
```

Los diagramas UML (casos de uso, clases, secuencia y despliegue) están en el informe final del proyecto.
