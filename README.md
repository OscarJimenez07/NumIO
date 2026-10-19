# NumIO — Plataforma Interactiva de Análisis Numérico e Investigación de Operaciones

Producto del proyecto de grado **BAN-00311** de la Facultad de Ciencias Naturales e Ingenierías de las **Unidades Tecnológicas de Santander (UTS)**.

> Plataforma web interactiva para el aprendizaje asistido y visual de métodos de Análisis Numérico e Investigación de Operaciones, con resolución paso a paso, visualización gráfica y retroalimentación automática.

**En línea:** https://numio.mexicocentral.cloudapp.azure.com (máquina virtual de Azure for Students, usada en la prueba piloto).

**Estudiantes:** Oscar Javier Jiménez Celis · Anderson David Suárez Bernal
**Director:** David Fernando Santamaría Maldonado
**Programa:** Ingeniería de Sistemas — Línea de Arquitectura y Diseño de Software

---

## Stack tecnológico

| Capa       | Tecnología                                    |
|------------|-----------------------------------------------|
| Frontend   | React 18 + TypeScript + Vite + Tailwind CSS   |
| Visualiz.  | Plotly.js + KaTeX + math.js                   |
| Backend    | NestJS 10 + TypeScript                        |
| ORM        | Prisma                                        |
| BD         | PostgreSQL 16                                 |
| Auth       | Microsoft Entra ID, código por correo, JWT (Bearer) + bcrypt |
| Despliegue | Docker + Docker Compose; Caddy (HTTPS) en Azure |

---

## Métodos implementados

### Análisis Numérico
- **Raíces**: Bisección, Newton-Raphson
- **Interpolación**: Lagrange, Diferencias Divididas de Newton
- **Integración**: Trapezoidal, Simpson 1/3, Simpson 3/8

### Investigación de Operaciones
- **Programación lineal**: Símplex tabular
- **Transporte**: Aproximación de Vogel + optimización MODI
- **Asignación**: Algoritmo Húngaro

Cada método ofrece dos modos:
1. **Resolver automático** — la plataforma muestra todos los pasos.
2. **Practicar paso a paso** — el estudiante ingresa cada paso y recibe retroalimentación inmediata. Disponible en los diez métodos; solo las prácticas validadas quedan en el historial del estudiante.

---

## Despliegue rápido (local)

Requisitos: Docker Desktop con Compose v2.

```bash
cd "App Web"
cp .env.example .env
docker compose up --build
```

URLs:
- Frontend: http://localhost:8080
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

Credenciales seed (solo en local, con `SEED_USUARIOS_DEMO=true`):
```
email: admin@uts.edu.co
password: Admin123!
```

Para producción en Azure ver `docs/DEPLOYMENT.md` y `despliegue/GUIA-DESPLIEGUE.md`.

---

## Desarrollo

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Backend hot-reload en http://localhost:3000
- Frontend Vite dev server en http://localhost:5173

O sin Docker:
```bash
# Terminal 1 — backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

---

## Validación pedagógica

Las páginas `/pilot/pre-test`, `/pilot/post-test` y `/pilot/opinion` (encuesta de opinión con la escala SUS) permiten ejecutar la prueba cuasi-experimental descrita en el objetivo específico 4 de la propuesta. El pre-test y el pos-test se califican en el servidor. El panel docente (`/teacher/results` y `/teacher/opinion`) muestra los resultados agregados y exporta un CSV seudonimizado (código de participante en lugar de nombre y correo) para el análisis estadístico.

---

## Tests

```bash
cd backend
npm run test           # unitarios: 58 pruebas en 14 suites
```

Prueba funcional de extremo a extremo contra la aplicación en marcha (solo local, ver `docs/DEPLOYMENT.md`):
```bash
python validar.py
```

Casos de prueba canónicos extraídos de:
- Burden, R. & Faires, J. (2011). *Numerical Analysis* (9.ª ed.).
- Hillier, F. & Lieberman, G. (2015). *Introducción a la investigación de operaciones* (10.ª ed.).
- Taha, H. (2017). *Operations Research: An Introduction* (10.ª ed.).

---

## Documentación

Ver `docs/`:
- `ARCHITECTURE.md` — diseño y decisiones técnicas
- `API.md` — los 46 endpoints REST
- `DEPLOYMENT.md` — guía de despliegue (local y Azure)
- `USER_MANUAL.md` — manual de estudiante y docente

---

## Licencia

Software libre — uso académico para las UTS.
