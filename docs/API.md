# API — NumIO

La API tiene 46 servicios REST: autenticación (10), usuarios (4), análisis numérico (14), investigación de operaciones (6), intentos (3), validación pedagógica (4), encuesta de opinión (4) y salud (1).

Base URL:
- Producción (Azure): `https://numio.mexicocentral.cloudapp.azure.com/api` (Nginx reenvía `/api` al backend, que no está expuesto a internet).
- Local: `http://localhost:3000`.

Documentación interactiva (Swagger): `/api/docs`. En producción solo está activa si `SWAGGER_ENABLED=true`.

Las rutas públicas son las de ingreso (`/auth/config`, `/auth/register`, `/auth/login`, `/auth/microsoft`, `/auth/codigo/*`, `/auth/contrasena/solicitar` y `/auth/contrasena/restablecer`) y `/health`. Todas las demás requieren `Authorization: Bearer <token>`.

## Autenticación (10)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/auth/config` | Formas de ingreso habilitadas (Microsoft, código por correo, contraseña) |
| POST   | `/auth/register` | `{ email, password, fullName? }`. Crea siempre una cuenta STUDENT con correo institucional |
| POST   | `/auth/login`    | `{ email, password }`. `email` acepta el correo completo o solo el usuario. Retorna `{ user, token }` |
| POST   | `/auth/microsoft` | `{ idToken }` de Microsoft Entra ID. Retorna `{ user, token }` |
| POST   | `/auth/codigo/solicitar` | `{ email }`. Envía un código de un solo uso al correo |
| POST   | `/auth/codigo/verificar` | `{ email, codigo, nombre? }`. Retorna `{ user, token }` o `{ requiereNombre: true }` si la cuenta es nueva |
| POST   | `/auth/contrasena/solicitar` | `{ email }`. Envía un código para restablecer la contraseña |
| POST   | `/auth/contrasena/restablecer` | `{ email, codigo, password }`. Cambia la contraseña y abre la sesión |
| POST   | `/auth/contrasena/cambiar` | `{ actual, nueva }`. Autenticado; obligatorio cuando la contraseña es temporal |
| GET    | `/auth/me`       | Datos del usuario autenticado |

El rol de docente o administrador no se puede pedir en el registro: lo asigna un administrador desde el panel o el servidor con `DOCENTE_EMAILS` / `ADMIN_EMAILS`.

## Usuarios (4, TEACHER y ADMIN)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET   | `/users`     | Lista todos los usuarios |
| GET   | `/users/:id` | Detalle de un usuario |
| PATCH | `/users/:id/rol` | `{ role }`. Cambia el rol. Solo un ADMIN puede nombrar o modificar administradores |
| POST  | `/users/:id/restablecer-contrasena` | `{ password? }`. Pone una contraseña temporal (si no se envía, se genera) y retorna `{ passwordTemporal }` |

## Análisis Numérico (14)

Cada método expone `/solve` y `/validate`.

| Slug | Solve | Validate | Body principal |
|------|-------|----------|----------------|
| Bisección       | POST `/numerical/bisection/solve`        | POST `/numerical/bisection/validate`        | `{ fn, a, b, tolerance?, maxIter? }` |
| Newton-Raphson  | POST `/numerical/newton-raphson/solve`   | POST `/numerical/newton-raphson/validate`   | `{ fn, x0, tolerance?, maxIter? }` |
| Lagrange        | POST `/numerical/lagrange/solve`         | POST `/numerical/lagrange/validate`         | `{ points: [{x, y}], evalAt? }` |
| Newton DD       | POST `/numerical/newton-divided/solve`   | POST `/numerical/newton-divided/validate`   | `{ points: [{x, y}], evalAt? }` |
| Trapecio        | POST `/numerical/trapezoidal/solve`      | POST `/numerical/trapezoidal/validate`      | `{ fn, a, b, n }` |
| Simpson 1/3     | POST `/numerical/simpson-1-3/solve`      | POST `/numerical/simpson-1-3/validate`      | `{ fn, a, b, n }` (n par) |
| Simpson 3/8     | POST `/numerical/simpson-3-8/solve`      | POST `/numerical/simpson-3-8/validate`      | `{ fn, a, b, n }` (n múltiplo de 3) |

`/validate` añade `userSteps: [{ iteration, state }]` al body.

Respuesta estándar de `/solve`:
```json
{
  "result": { ... },
  "steps": [ { "iteration": 1, "state": {...}, "explanation": "...", "latex": "..." } ],
  "plotData": { "type": "function", "fnSource": "x^3 - x - 2", "xRange": [0.5, 2.5], "marks": [...] }
}
```

Respuesta estándar de `/validate`:
```json
{
  "isCorrect": false,
  "feedback": [
    { "stepIndex": 1, "field": "c", "expected": 1.5, "got": 1.6, "message": "...", "severity": "error" }
  ],
  "matchedSteps": 0,
  "totalSteps": 5
}
```

## Investigación de Operaciones (6)

| Método | Solve | Body |
|--------|-------|------|
| Símplex     | POST `/operations/simplex/solve`        | `{ objective: 'max'|'min', c: number[], constraints: [{ coefficients, operator, rhs }] }` |
| Transporte  | POST `/operations/transportation/solve` | `{ costs: number[][], supply: number[], demand: number[] }` |
| Asignación  | POST `/operations/assignment/solve`     | `{ costs: number[][], maximize?: boolean }` |

Cada uno tiene también `/validate` con `userSteps`, igual que los de análisis numérico. Los campos que se validan en la práctica son:
- Símplex: variable que entra, variable que sale, elemento pivote y valor de Z en cada pivoteo (incluida la fase 1).
- Transporte: cada asignación de Vogel (fila, columna, cantidad y costo acumulado).
- Asignación: reducciones de fila y columna, recurso asignado y costo acumulado.

## Intentos (3)

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/attempts`     | Usuario autenticado |
| GET  | `/attempts/me`  | Usuario autenticado (su historial de prácticas) |
| GET  | `/attempts`     | TEACHER, ADMIN (todos) |

Body de `POST /attempts`:
```json
{
  "methodSlug": "bisection",
  "input": { ... },
  "steps": [ ... ],
  "userSteps": [ ... ],
  "feedback": [ ... ],
  "isCorrect": true
}
```

## Validación pedagógica (4)

| Método | Ruta | Rol |
|--------|------|-----|
| GET  | `/pilot/cuestionario` | Usuario autenticado |
| POST | `/pilot/test`      | Usuario autenticado |
| POST | `/pilot/sus`       | Usuario autenticado |
| GET  | `/pilot/results`   | TEACHER, ADMIN |

`GET /pilot/cuestionario` entrega las 6 preguntas del pre-test y el pos-test **sin** la opción correcta:
```json
[ { "id": "q1", "text": "...", "options": ["...", "...", "...", "..."] } ]
```

`POST /pilot/test` recibe solo las respuestas (índice de la opción elegida); el servidor califica:
```json
{ "testType": "PRE", "answers": { "q1": 1, "q2": 2, "q3": 0 } }
```

Respuesta:
```json
{ "id": "...", "testType": "PRE", "score": 50, "correct": 3, "total": 6 }
```

`POST /pilot/sus`:
```json
{ "answers": [4, 2, 5, 1, 4, 2, 5, 1, 5, 1] }
```

Respuesta:
```json
{ "id": "...", "answers": [...], "score": 87.5 }
```

## Encuesta de opinión (4)

| Método | Ruta | Rol |
|--------|------|-----|
| GET  | `/opinion/cuestionario` | Usuario autenticado |
| GET  | `/opinion/mia`          | Usuario autenticado (su respuesta, si ya la envió) |
| POST | `/opinion`              | Usuario autenticado. Si ya había respondido, se reemplaza |
| GET  | `/opinion/resultados`   | TEACHER, ADMIN (solo agregados) |

`POST /opinion` (afirmaciones de 1 a 5 por dimensión: U utilidad, R práctica y retroalimentación, F facilidad de uso, S satisfacción; recomendación de 0 a 10; los 10 ítems SUS de 1 a 5):
```json
{
  "answers": { "U1": 4, "U2": 5, "R1": 4, "F1": 3, "S1": 4 },
  "susAnswers": [4, 2, 5, 1, 4, 2, 5, 1, 5, 1],
  "recommendation": 8,
  "frequency": "UNA_DOS",
  "modules": ["bisection", "simplex"],
  "mostUseful": "...",
  "improvements": "..."
}
```

## Salud (1)

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/health` | `{ status: "ok", service: "numio-api", timestamp: "..." }` |
