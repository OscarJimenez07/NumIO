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

## Despliegue en producción (Azure)

La plataforma de la prueba piloto está en una máquina virtual de **Azure for Students** (Ubuntu 24.04) y se publica en https://numio.mexicocentral.cloudapp.azure.com. La guía paso a paso (crear la máquina, instalar Docker, configurar el dominio y Entra ID) está en `despliegue/GUIA-DESPLIEGUE.md`.

Resumen:
1. Crear el servidor (`despliegue/crear-servidor-azure.sh` o desde el portal) e instalar Docker (`despliegue/instalar-servidor.sh`).
2. Llenar `despliegue/.env.produccion` (no se sube al repositorio).
3. Publicar o actualizar con:
   ```bash
   ./despliegue/publicar.sh usuario@ip-del-servidor
   ```
   que sube el código y en el servidor ejecuta `docker compose -f docker-compose.prod.yml up -d --build`.

`docker-compose.prod.yml` difiere del local en que:
- Caddy queda adelante y pide el certificado HTTPS a Let's Encrypt automáticamente.
- La base de datos y la API no publican puertos: solo se comunican por la red interna de Docker.
- Las claves no tienen valor por defecto; si falta alguna, el arranque se detiene.
- No se crean usuarios demo.

Variables principales del `.env` de producción:

| Variable | Uso |
|----------|-----|
| `DOMINIO` | Dominio público (Caddy pide el certificado para él) |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Base de datos |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma y duración de la sesión |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_ALLOWED_DOMAINS` | Ingreso con Microsoft Entra ID y dominios de correo permitidos |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CORREO_REMITENTE` | Envío de los códigos de ingreso por correo |
| `PERMITIR_CONTRASENA` | `false` deja solo el ingreso con Microsoft y con código |
| `ADMIN_EMAILS`, `DOCENTE_EMAILS` | Correos que reciben el rol de administrador o docente al ingresar |
| `SWAGGER_ENABLED` | `true` publica la documentación en `/api/docs` |

## Verificación funcional (`validar.py`)

```bash
docker compose up -d
python validar.py            # contra http://localhost:8080
```

El guion revisa los diez métodos contra los casos de la bibliografía, el modo de práctica, las validaciones de entrada, los permisos por rol y que el cuestionario del piloto no entregue la clave de respuestas.

**Cuidado:** usa las cuentas demo y, al terminar, borra con `docker exec numio-db psql` **todos** los registros de `TestResult`, `SusResponse`, `Attempt` y `OpinionResponse`, no solo los que creó. Por eso se corre contra una instalación local o una copia de la base, nunca en el servidor de producción con los datos del piloto. Si hay que hacerlo, primero se saca el respaldo de la sección siguiente.

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
