# Despliegue — NumIO

## Requisitos

- **Docker Desktop** ≥ 4.x con Docker Compose v2 (Windows / macOS / Linux).
- 4 GB de RAM disponibles.
- Puertos libres: `8080` (frontend), `3000` (backend), `5432` (postgres).

## Despliegue local (producción)

```powershell
cd "C:\Users\PC\Documents\Proyecto de Grado\App Web"
Copy-Item .env.example .env       # ajustar JWT_SECRET en producción
docker compose up --build
```

Tras unos minutos verás:
- Frontend: http://localhost:8080
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- DB: `localhost:5432` (usuario/clave: numio/numio)

El servicio backend ejecuta automáticamente:
1. `prisma migrate deploy` — crea las tablas si no existen.
2. `prisma db seed` — inserta los 10 métodos y, **solo en desarrollo**
   (`SEED_USUARIOS_DEMO=true`), los 3 usuarios demo. En producción no se crean.

Credenciales demo (solo entorno local):
| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@uts.edu.co | Admin123! |
| TEACHER | docente@uts.edu.co | Docente123! |
| STUDENT | estudiante@uts.edu.co | Estudiante123! |

## Detener

```bash
docker compose down           # mantiene datos
docker compose down -v        # elimina también el volumen de la BD
```

## Modo desarrollo (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Cambios en `backend/src/**` y `frontend/src/**` se recargan automáticamente.

URLs en dev:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Despliegue sin Docker

```bash
# Backend
cd backend
npm install
cp ../.env.example .env       # editar DATABASE_URL para apuntar a tu Postgres
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Despliegue en producción (cloud)

Recomendaciones:
1. Servir backend tras un reverse proxy con HTTPS (Nginx, Caddy, Cloudflare Tunnel).
2. Usar Postgres administrado (Render, Supabase, Neon, RDS).
3. Variables de entorno mínimas en producción:
   - `DATABASE_URL` (con SSL)
   - `JWT_SECRET` (string aleatorio largo, mínimo 32 chars)
   - `JWT_EXPIRES_IN` (p.ej. `8h`)
4. Construir el frontend con `VITE_API_URL` apuntando al dominio público del backend.

Ejemplo build prod del frontend con dominio personalizado:
```bash
cd frontend
VITE_API_URL=https://api.numio.uts.edu.co npm run build
# Subir dist/ a un CDN o nginx
```

## Backups

```bash
# Backup
docker exec numio-db pg_dump -U numio numio > backup_$(date +%F).sql

# Restore
cat backup.sql | docker exec -i numio-db psql -U numio -d numio
```

## Solución de problemas

**El backend no conecta a la BD**
- Verifica `DATABASE_URL` en `.env`.
- Espera al healthcheck: `docker compose logs db`.

**El frontend muestra 404 en rutas internas**
- Asegúrate de que nginx tenga el `try_files $uri $uri/ /index.html` (ya incluido en `nginx.conf`).

**Error "Prisma Client not generated"**
- Reconstruir backend: `docker compose build backend --no-cache`.

**Las migraciones no se aplican**
- En la primera ejecución, generarlas: `docker compose run --rm backend npx prisma migrate dev --name init`.
