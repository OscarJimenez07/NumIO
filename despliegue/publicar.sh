#!/usr/bin/env bash
#
# NumIO — sube el proyecto al servidor y lo levanta.
#
#     ./publicar.sh numio@203.0.113.10
#
# Se puede repetir tantas veces como quieras: es la forma normal de
# publicar un cambio. El archivo .env del servidor NUNCA se sobrescribe
# (lleva las claves de producción); solo se sube la primera vez, desde
# .env.produccion.

set -euo pipefail

DESTINO="${1:-}"
[ -n "$DESTINO" ] || { echo "Uso: ./publicar.sh usuario@ip"; exit 1; }

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(dirname "$AQUI")"          # la carpeta 'App Web'
REMOTO="~/numio"

# La clave del proyecto va aparte de las personales. Si prefieres otra:
#     CLAVE_SSH=~/.ssh/otra ./publicar.sh numio@IP
CLAVE_SSH="${CLAVE_SSH:-$HOME/.ssh/numio_ed25519}"
if [ -f "$CLAVE_SSH" ]; then
  SSH=(ssh -i "$CLAVE_SSH" -o IdentitiesOnly=yes)
  SCP=(scp -i "$CLAVE_SSH" -o IdentitiesOnly=yes -q)
else
  SSH=(ssh); SCP=(scp -q)
fi

azul()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
verde() { printf '\033[1;32m  ok\033[0m %s\n' "$1"; }

azul "Comprobando la conexión con $DESTINO"
"${SSH[@]}" -o ConnectTimeout=15 -o BatchMode=yes "$DESTINO" 'docker compose version >/dev/null' \
  || { echo "No se pudo entrar, o falta Docker. ¿Corriste instalar-servidor.sh?"; exit 1; }
verde "conexión y Docker correctos"

azul "Empaquetando el proyecto"
# Se excluye lo que se reconstruye en el servidor o no debe viajar:
#   node_modules/dist  -> los genera el Dockerfile, y pesan cientos de MB
#   .env               -> el del servidor lleva otras claves
#   .git               -> innecesario para ejecutar
PAQUETE="$(mktemp -t numio-XXXXXX).tar.gz"
tar -czf "$PAQUETE" -C "$RAIZ" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='*.tsbuildinfo' \
  --exclude='despliegue' \
  --exclude='.docker-up.log' \
  backend frontend docker-compose.prod.yml Caddyfile validar.py
verde "$(du -h "$PAQUETE" | cut -f1)"

azul "Subiendo"
"${SSH[@]}" "$DESTINO" "mkdir -p $REMOTO"
"${SCP[@]}" "$PAQUETE" "$DESTINO:$REMOTO/paquete.tar.gz"
"${SSH[@]}" "$DESTINO" "cd $REMOTO && tar -xzf paquete.tar.gz && rm paquete.tar.gz"
rm -f "$PAQUETE"
verde "proyecto en $REMOTO"

azul "Comprobando el archivo de variables"
if "${SSH[@]}" "$DESTINO" "test -f $REMOTO/.env"; then
  verde ".env ya existía en el servidor — no se toca"
else
  "${SCP[@]}" "$AQUI/.env.produccion" "$DESTINO:$REMOTO/.env"
  verde ".env subido por primera vez"
  echo
  echo "   AVISO: revisa DOMINIO y MS_CLIENT_ID dentro del servidor antes de seguir:"
  echo "          ssh $DESTINO 'nano ~/numio/.env'"
  echo
fi

azul "Construyendo y levantando (la primera vez tarda unos minutos)"
# Se compila un servicio detras de otro: en paralelo, backend y frontend no
# caben a la vez en un servidor de 1 GB aunque haya intercambio.
"${SSH[@]}" "$DESTINO" "cd $REMOTO && docker compose -f docker-compose.prod.yml build backend && docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d"

azul "Estado"
"${SSH[@]}" "$DESTINO" "cd $REMOTO && docker compose -f docker-compose.prod.yml ps --format 'table {{.Name}}\t{{.Status}}'"

DOM=$("${SSH[@]}" "$DESTINO" "grep -E '^DOMINIO=' $REMOTO/.env | cut -d= -f2" | tr -d '\r')
echo
echo "────────────────────────────────────────────────────────────"
if [ "$DOM" = ":80" ]; then
  echo " Publicado en  http://${DESTINO#*@}"
  echo " (sin HTTPS todavía: el ingreso con Microsoft aún no funcionará)"
else
  echo " Publicado en  https://$DOM"
  echo " El certificado puede tardar un minuto en emitirse la primera vez."
fi
echo
echo " Comprobar que todo responde:"
echo "     python validar.py https://$DOM"
echo "────────────────────────────────────────────────────────────"
