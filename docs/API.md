# API — NumIO

Base URL local: `http://localhost:3000`
Documentación interactiva (Swagger): `http://localhost:3000/api/docs`

Todas las rutas excepto `/auth/login`, `/auth/register` y `/health` requieren `Authorization: Bearer <token>`.

## Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST   | `/auth/register` | Crea usuario STUDENT (o el rol enviado) y retorna `{ user, token }` |
| POST   | `/auth/login`    | Autentica y retorna `{ user, token }` |
| GET    | `/auth/me`       | Datos del usuario autenticado |

## Usuarios (TEACHER+)

| GET | `/users`     | Lista todos los usuarios |
| GET | `/users/:id` | Detalle de un usuario |

## Análisis Numérico

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

## Investigación de Operaciones

| Método | Solve | Body |
|--------|-------|------|
| Símplex     | POST `/operations/simplex/solve`        | `{ objective: 'max'|'min', c: number[], constraints: [{ coefficients, operator, rhs }] }` |
| Transporte  | POST `/operations/transportation/solve` | `{ costs: number[][], supply: number[], demand: number[] }` |
| Asignación  | POST `/operations/assignment/solve`     | `{ costs: number[][], maximize?: boolean }` |

(Cada uno acepta también `/validate` con `userSteps`.)

## Intentos (Attempts)

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/attempts`     | Usuario autenticado |
| GET  | `/attempts/me`  | Usuario autenticado (su historial) |
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

## Validación pedagógica (Pilot)

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/pilot/test`      | Usuario autenticado |
| POST | `/pilot/sus`       | Usuario autenticado |
| GET  | `/pilot/results`   | TEACHER, ADMIN |

`POST /pilot/test`:
```json
{ "testType": "PRE", "score": 66.7, "details": { "answers": {...} } }
```

`POST /pilot/sus`:
```json
{ "answers": [4, 2, 5, 1, 4, 2, 5, 1, 5, 1] }
```

Respuesta:
```json
{ "id": "...", "answers": [...], "score": 87.5 }
```

## Salud

| GET | `/health` | `{ status: "ok", service: "numio-api", timestamp: "..." }` |
