# Publicar NumIO en internet

Cinco pasos. Los dos primeros son tuyos (crear el servidor y comprar el
dominio); el resto lo hacen los dos scripts de esta carpeta.

Estado de lo que ya está resuelto:

| | |
|---|---|
| Configuración de producción | probada entera en local, 50/50 en `validar.py` |
| Claves de la base y de sesión | generadas, en `.env.produccion` |
| Tenant de Entra ID de las UTS | averiguado: `8c28de3c-6c8e-40a2-beec-bd8827b92802` |
| HTTPS | automático, lo pide Caddy a Let's Encrypt |

Solo hay **dos casillas por rellenar** en `.env.produccion`: `DOMINIO` y
`MS_CLIENT_ID`.

---

## Paso 1 — El servidor

Primero activa **Azure for Students** en `azure.microsoft.com/free/students`
con tu correo **@uts.edu.co**. No pide tarjeta.

Después, crea la máquina. Hay dos caminos y dan exactamente lo mismo; usa el
que prefieras.

### Camino A — desde el portal (a clics)

En `portal.azure.com` → **Máquinas virtuales** → **Crear** → *Máquina virtual
de Azure*. Estos son los valores; lo que no aparezca aquí, déjalo como venga.

**Pestaña «Aspectos básicos»**

| Campo | Valor |
|---|---|
| Suscripción | **Azure for Students** |
| Grupo de recursos | Crear nuevo → `numio-rg` |
| Nombre de la máquina | `numio-vm` |
| Región | `(US) Este de EE. UU.` |
| Imagen | **Ubuntu Server 24.04 LTS — x64 Gen2** |
| Tamaño | **Standard_B1ms** — 1 vCPU, 2 GiB (pulsa «Ver todos los tamaños») |
| Tipo de autenticación | **Clave pública SSH** |
| Nombre de usuario | `numio` |
| Origen de la clave SSH | **Usar una clave pública existente** |
| Clave pública | la de abajo, pegada entera en una sola línea |
| Puertos de entrada públicos | Permitir puertos seleccionados: **SSH (22), HTTP (80), HTTPS (443)** |

La clave pública que hay que pegar (es pública, no pasa nada si se ve):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICU32TQvIDiAnghhSm0ssJtc0An6kZtGnBV4dXpmxSFn numio-proyecto-grado-uts
```

> **Si el tamaño sale en gris o da «NotAvailableForSubscription»**, no es que
> falte saldo: esa SKU no está habilitada para tu suscripción en esa región.
> Prueba en este orden, que son los que caben en el crédito (precios reales de
> la API de Azure, por 730 h al mes, Linux):
>
> | Tamaño | vCPU / RAM | Al mes | El crédito dura |
> |---|---|---|---|
> | `Standard_B1ms` | 1 / 2 GiB | $15,11 | ~6,6 meses |
> | `Standard_B2s` | 2 / 4 GiB | $30,37 | ~3,3 meses |
> | `Standard_B2ls_v2` | 2 / 4 GiB | $37,08 | ~2,7 meses |
> | `Standard_B2ts_v2` | 2 / 1 GiB | $7,59 | ~13 meses |
>
> Si ninguno aparece, cambia la **región** a `(US) Este de EE. UU. 2` o
> `(US) Centro-sur de EE. UU.` y vuelve a mirar: la disponibilidad va por
> región, no por cuenta.
>
> **No aceptes los que propone por defecto** (`D2s_v3` a $70,08 al mes,
> `D4s_v3` a $140): son los «recomendados por el editor de la imagen» y se
> comen el crédito en semanas sin darte nada que necesites.
>
> Con 1 o 2 GB de RAM no hay problema: `instalar-servidor.sh` añade 4 GB de
> memoria de intercambio antes de compilar, que es el único momento en que la
> memoria aprieta.

**Pestaña «Discos»**: tipo de disco del SO → **SSD estándar**. El tamaño por
defecto (30 GB) vale.

**Pestaña «Redes»**: en *Dirección IP pública* → **Crear nuevo**, nombre
`numio-ip`, SKU **Estándar**, y sobre todo **Asignación: Estática**.

> **La asignación tiene que ser Estática.** Si la dejas Dinámica, la IP cambia
> cada vez que apagues la máquina y se rompen a la vez el registro DNS del
> dominio y la URI de redirección de Entra ID. Corregirlo después obliga a
> rehacer el paso 3.

Luego **Revisar y crear** → **Crear**. Tarda un par de minutos. Al terminar,
en la página de la máquina aparece la **IP pública**: anótala.

### Camino B — por consola

```bash
az login                      # entra con el correo @uts.edu.co
./crear-servidor-azure.sh
```

Crea lo mismo y ya deja la IP estática y el cortafuegos puestos. Se puede
repetir sin miedo: comprueba cada recurso antes de crearlo.

### Cuánto gasta

Una B1ms son unos $15 al mes; con los $100 de saldo, más de seis meses. Cuando no
la uses, en la página de la máquina pulsa **Detener** (eso es *deallocate* y
congela el cobro del cómputo). Apagarla desde dentro con `shutdown` **no**
detiene el cobro.

Por consola sería:

```bash
az vm deallocate -g numio-rg -n numio-vm
az vm start      -g numio-rg -n numio-vm
```

## Paso 2 — El dominio

Libres a 19/09/2026, comprobado en RDAP: `numio.tech`, `numio.me`,
`numio.site`, `numio.online`, `numio.fun`, `numio.co`.
Ya tomados: `numio.xyz`, `numio.app`, `numio.dev`, `numio.pro`.

Cómpralo en Namecheap o Porkbun y crea **un solo registro DNS**:

```
Tipo    Nombre    Valor              TTL
A       @         LA_IP_DEL_SERVIDOR  automático
```

Si además quieres que funcione `www`, añade `CNAME  www  → numio.tech`.

> **Si usas Cloudflare para el DNS**, deja el registro en **«DNS only»** (nube
> gris), no en «Proxied» (nube naranja). Con el proxy activo, Let's Encrypt no
> puede comprobar el dominio y Caddy se queda sin certificado.

Comprueba que el DNS ya propagó antes de seguir:

```bash
nslookup numio.tech
```

## Paso 3 — El ingreso con la cuenta institucional

En `portal.azure.com`, con tu cuenta **@uts.edu.co**:
**Microsoft Entra ID → Registros de aplicaciones → Nuevo registro**.

| Campo | Valor |
|---|---|
| Nombre | `NumIO — Proyecto de grado BAN-00311` |
| Tipos de cuenta | Solo cuentas de este directorio organizativo |
| URI de redirección | tipo **Aplicación de página única (SPA)**, valor `https://numio.tech` |

Al guardar, copia el **Id. de aplicación (cliente)**. Ese es tu `MS_CLIENT_ID`.
No es un secreto: es un identificador público, y no hace falta ningún
*client secret* porque la firma se verifica contra las claves públicas de
Microsoft.

Los permisos `openid`, `profile` y `email` ya vienen incluidos; no tienes que
añadir ninguno.

> **Si el portal no te deja registrar la aplicación**, es que las UTS
> restringieron esa política. Entonces hay que pedírselo al área de Sistemas,
> con exactamente esos cuatro datos de la tabla. Inténtalo tú primero: en la
> mayoría de los tenants está permitido por defecto.

> **La URI de redirección debe ser la definitiva.** Si registras contra un
> dominio y luego lo cambias, hay que editar el registro. Por eso este paso va
> después de tener el dominio.

## Paso 4 — Desplegar

Desde tu equipo, en Git Bash, dentro de `App Web/despliegue`:

```bash
# 4.1 — preparar el servidor (una sola vez)
ssh -i ~/.ssh/numio_ed25519 numio@LA_IP 'sudo bash -s' < instalar-servidor.sh

# 4.2 — rellenar las dos casillas
nano .env.produccion        # DOMINIO=numio.tech   y   MS_CLIENT_ID=...

# 4.3 — subir y levantar
./publicar.sh numio@LA_IP
```

`publicar.sh` usa `~/.ssh/numio_ed25519` por sí solo; no hay que indicársela.

La primera vez tarda unos minutos: compila el backend y el frontend en el
servidor. `publicar.sh` se puede repetir cuantas veces quieras — es la forma
normal de publicar un cambio, y **nunca sobrescribe el `.env` del servidor**.

## Paso 5 — Comprobar

```bash
python validar.py https://numio.tech
```

Tienen que salir las 50 comprobaciones en verde. Después, entra a
`https://numio.tech` y confirma que aparece el botón **«Ingresar con mi correo
institucional»** y que un correo @uts.edu.co entra con él.

En producción no hay cuentas con contraseña: el seed no crea las cuentas demo
(solo lo hace con `SEED_USUARIOS_DEMO=true`, que únicamente pone el compose de
desarrollo) y `PERMITIR_CONTRASENA=false` cierra el ingreso y el registro con
contraseña. Se entra con Microsoft o con un código de 6 dígitos que llega al
correo institucional (necesita `SMTP_USER`/`SMTP_PASS`; con Gmail, una
contraseña de aplicación). Los roles se dan por correo en `ADMIN_EMAILS` y `DOCENTE_EMAILS`;
quien no figure ahí entra como estudiante. Por lo mismo, `validar.py` solo
sirve contra el entorno local.

---

## Tres cosas que rompen el despliegue

**1. Cambiar `POSTGRES_PASSWORD` después del primer arranque.**
PostgreSQL solo aplica esa contraseña cuando crea la base la primera vez.
Si la cambias luego, el backend deja de conectar con
`P1000: Authentication failed` y reinicia en bucle. Para cambiarla de verdad
hay que borrar el volumen — lo que **borra todos los datos**:

```bash
docker compose -f docker-compose.prod.yml down -v   # -v BORRA la base
```

**2. Poner comentarios al final de una línea del `.env`.**
Docker Compose no los reconoce: se los traga como parte del valor. Mal:

```
MS_CLIENT_ID=abc-123   # el de la app     <- el valor queda "abc-123   # el de la app"
```

Los comentarios van en su propia línea.

**3. Dejar `DOMINIO=:80` y esperar que funcione Microsoft.**
El ingreso institucional exige HTTPS. Sin dominio, la plataforma sirve por
HTTP contra la IP y el botón de Microsoft no funcionará aunque el
`MS_CLIENT_ID` esté puesto.

---

## Mantenimiento

```bash
# ver el estado
ssh numio@LA_IP 'cd ~/numio && docker compose -f docker-compose.prod.yml ps'

# ver los registros del backend
ssh numio@LA_IP 'cd ~/numio && docker compose -f docker-compose.prod.yml logs -f backend'

# copia de seguridad de la base (antes del piloto y después)
ssh numio@LA_IP 'docker exec numio-db pg_dump -U numio numio' > respaldo-$(date +%F).sql

# al terminar el piloto: liberar la máquina desde el panel de Azure.
# Apagarla desde dentro (shutdown) NO detiene el cobro; hay que usar
# «Detener (liberar)» en el portal.
```
