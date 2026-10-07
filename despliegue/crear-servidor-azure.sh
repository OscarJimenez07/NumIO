#!/usr/bin/env bash
#
# NumIO — crea el servidor en Azure con el saldo de Azure for Students.
#
# Antes de correrlo, una sola vez:      az login
#
#     ./crear-servidor-azure.sh
#
# Crea: grupo de recursos, IP pública ESTÁTICA, cortafuegos con 22/80/443
# abiertos y nada más, y una máquina Ubuntu 24.04.
#
# Se puede repetir: cada recurso se comprueba antes de crearlo, así que si
# algo falla a mitad, vuelves a lanzarlo y sigue donde estaba.

set -euo pipefail

# ── Lo que se va a crear ─────────────────────────────────────────────
GRUPO="numio-rg"
VM="numio-vm"
# El tamano y la region NO se fijan aqui: se eligen en el paso 0 entre los
# que tu suscripcion tenga realmente disponibles.
USUARIO="numio"
CLAVE="$HOME/.ssh/numio_ed25519"
IP_NOMBRE="numio-ip"
NSG="numio-nsg"

# En Git Bash, az vive fuera del PATH de la shell.
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"
export MSYS_NO_PATHCONV=1    # evita que Git Bash destroce las rutas de Azure

azul()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
verde() { printf '\033[1;32m  ok\033[0m %s\n' "$1"; }
aviso() { printf '\033[1;33m  !!\033[0m %s\n' "$1"; }

existe() { az "$@" >/dev/null 2>&1; }

# ── Comprobaciones previas ───────────────────────────────────────────
command -v az >/dev/null || { echo "Falta Azure CLI."; exit 1; }
[ -f "$CLAVE.pub" ] || { echo "Falta la clave $CLAVE.pub — créala con ssh-keygen."; exit 1; }

azul "Comprobando la sesión de Azure"
CUENTA=$(az account show --query "user.name" -o tsv 2>/dev/null) || {
  echo
  echo "No hay sesión iniciada. Ejecuta primero:    az login"
  echo "(entra con tu correo @uts.edu.co)"
  exit 1
}
SUSCRIPCION=$(az account show --query "name" -o tsv)
verde "$CUENTA — suscripción: $SUSCRIPCION"

case "$SUSCRIPCION" in
  *tudent*) verde "es la suscripción de estudiante, correcto" ;;
  *) aviso "La suscripción NO parece la de estudiante ($SUSCRIPCION)."
     aviso "Si tiene una tarjeta asociada, esto SÍ te puede generar cobros."
     read -r -p "  ¿Seguir de todas formas? (escribe SI) " r
     [ "$r" = "SI" ] || exit 1 ;;
esac

# ── 0. Elegir un tamaño y una región que de verdad existan ───────────
# Azure no ofrece todas las máquinas en todas las regiones ni a todas las
# suscripciones: la de estudiante tiene bastantes vetadas, y el portal solo
# avisa cuando ya intentaste crearla ("NotAvailableForSubscription"). Aquí se
# pregunta antes, y se coge el primero de la lista que esté libre de
# restricciones.
#
# Orden de preferencia: primero lo que mejor rinde por dólar. Precios reales
# por 730 h al mes (API de precios de Azure, Linux):
#
#   B1ms      1 vCPU · 2 GB  ·  $15,11   <- el crédito dura ~6,6 meses
#   B2s       2 vCPU · 4 GB  ·  $30,37
#   B2ls_v2   2 vCPU · 4 GB  ·  $37,08
#   B2ts_v2   2 vCPU · 1 GB  ·   $7,59
#   B1s       1 vCPU · 1 GB  ·   $7,59
#   D2as_v5   2 vCPU · 8 GB  ·  $62,78   <- solo si no queda otra
#
# Con 1 o 2 GB no hay problema: instalar-servidor.sh añade intercambio antes
# de compilar, que es el único momento en que la memoria aprieta.
# La suscripcion de estudiante tiene una politica (sys.regionrestriction) que
# solo deja crear recursos en: mexicocentral, northcentralus, canadacentral,
# spaincentral y belgiumcentral. Cualquier otra region da
# "RequestDisallowedByAzure". mexicocentral va primero por cercania.
# En mexicocentral no existe B1ms; B2ats_v2 (2 vCPU, 1 GB, AMD x64) cuesta
# $7,52/mes alli y hace durar el saldo todo el piloto.
CANDIDATOS=(Standard_B2ats_v2 Standard_B2ts_v2 Standard_B1ms Standard_B2als_v2 Standard_B2pls_v2 Standard_D2als_v7 Standard_B2s)
REGIONES=(mexicocentral northcentralus canadacentral)

# La región del grupo es solo donde se guardan sus metadatos: los recursos
# se crean en la región elegida abajo pasando --location a cada uno. (El grupo
# numio-rg quedó en southcentralus de un intento anterior y no estorba.)

azul "Buscando un tamaño disponible para tu suscripción"
TAMANO=""
for reg in "${REGIONES[@]}"; do
  # Una sola consulta por región: traer todas las SKU y filtrar aquí es mucho
  # más rápido que preguntar una por una.
  # Solo descalifica la restriccion de tipo Location (la SKU no existe para
  # esta suscripcion en esta region). Las de tipo Zone son normales: no
  # impiden nada mientras no se pida una zona de disponibilidad concreta.
  libres=$(az vm list-skus -l "$reg" --resource-type virtualMachines --all --query "[?!(restrictions[?type=='Location'])].name" -o tsv 2>/dev/null) || continue
  for cand in "${CANDIDATOS[@]}"; do
    if echo "$libres" | grep -qx "$cand"; then
      TAMANO="$cand"; REGION="$reg"
      verde "$TAMANO disponible en $REGION"
      break 2
    fi
  done
  aviso "en $reg no hay ninguno de los candidatos"
done

if [ -z "$TAMANO" ]; then
  echo
  echo "Ninguno de los tamaños candidatos está disponible en ninguna región."
  echo "Mira qué te ofrece tu suscripción con:"
  echo "    az vm list-skus -l eastus --resource-type virtualMachines --all \\"
  echo "       --query \"[?length(restrictions)==\\`0\\`].name\" -o tsv | sort -u | head -40"
  exit 1
fi

# Las SKU con "p" en el sufijo (B2pls_v2, D2ps_v5...) son ARM64 (Ampere), no
# x86. Salen bastante mas baratas y las imagenes que usa NumIO son todas
# multiarquitectura, pero hay que pedir la imagen ARM del sistema: el alias
# "Ubuntu2404" apunta solo a x64 y la maquina no arrancaria.
if [[ "$TAMANO" =~ ^Standard_[A-Z]+[0-9]+[a-z]*p ]]; then
  IMAGEN="Canonical:ubuntu-24_04-lts:server-arm64:latest"
  verde "es ARM64 - se usara la imagen Ubuntu 24.04 para ARM"
else
  IMAGEN="Ubuntu2404"
fi

# ── 1. Grupo de recursos ─────────────────────────────────────────────
azul "Grupo de recursos '$GRUPO' en $REGION"
if existe group show -n "$GRUPO"; then
  verde "ya existía"
else
  az group create -n "$GRUPO" -l "$REGION" -o none
  verde "creado"
fi

# ── 2. IP pública estática ───────────────────────────────────────────
# Estática a propósito: si cambiara, se romperían a la vez el registro DNS
# del dominio y la URI de redirección de Entra ID.
azul "IP pública estática '$IP_NOMBRE'"
if existe network public-ip show -g "$GRUPO" -n "$IP_NOMBRE"; then
  verde "ya existía"
else
  az network public-ip create -g "$GRUPO" -n "$IP_NOMBRE" \
     --sku Standard --allocation-method Static --version IPv4 -l "$REGION" -o none
  verde "creada"
fi

# ── 3. Cortafuegos ───────────────────────────────────────────────────
azul "Cortafuegos '$NSG' — solo 22, 80 y 443"
existe network nsg show -g "$GRUPO" -n "$NSG" || az network nsg create -g "$GRUPO" -n "$NSG" -l "$REGION" -o none
crear_regla() {
  local nombre=$1 prioridad=$2 puerto=$3
  if existe network nsg rule show -g "$GRUPO" --nsg-name "$NSG" -n "$nombre"; then
    verde "regla $nombre ya existía"
  else
    az network nsg rule create -g "$GRUPO" --nsg-name "$NSG" -n "$nombre" \
       --priority "$prioridad" --destination-port-ranges "$puerto" \
       --protocol Tcp --access Allow --direction Inbound -o none
    verde "regla $nombre (puerto $puerto)"
  fi
}
crear_regla permitir-ssh   1000 22
crear_regla permitir-http  1010 80
crear_regla permitir-https 1020 443

# ── 4. La máquina ────────────────────────────────────────────────────
azul "Máquina '$VM' — Ubuntu 24.04, $TAMANO"
if existe vm show -g "$GRUPO" -n "$VM"; then
  verde "ya existía"
else
  echo "   (tarda un par de minutos)"
  # La clave se pasa por contenido y no por ruta: Git Bash reescribe las
  # rutas al llamar a un ejecutable de Windows y az recibiría una basura.
  az vm create \
     -g "$GRUPO" -n "$VM" -l "$REGION" \
     --image "$IMAGEN" \
     --size "$TAMANO" \
     --admin-username "$USUARIO" \
     --ssh-key-values "$(cat "$CLAVE.pub")" \
     --public-ip-address "$IP_NOMBRE" \
     --nsg "$NSG" \
     --os-disk-size-gb 32 \
     --storage-sku StandardSSD_LRS \
     --output none
  verde "creada"
fi

IP=$(az network public-ip show -g "$GRUPO" -n "$IP_NOMBRE" --query ipAddress -o tsv)

echo
echo "────────────────────────────────────────────────────────────"
echo " Servidor listo.   IP:  $IP"
echo
echo " 1. Apunta tu dominio a esa IP con un registro A."
echo " 2. Prepara el servidor:"
echo "      ssh -i ~/.ssh/numio_ed25519 $USUARIO@$IP 'sudo bash -s' < instalar-servidor.sh"
echo " 3. Rellena DOMINIO y MS_CLIENT_ID en .env.produccion"
echo " 4. Publica:"
echo "      ./publicar.sh $USUARIO@$IP"
echo
echo " Para dejar de gastar saldo cuando no la uses:"
echo "      az vm deallocate -g $GRUPO -n $VM"
echo " Para borrarlo todo al terminar el proyecto:"
echo "      az group delete -n $GRUPO --yes"
echo "────────────────────────────────────────────────────────────"
