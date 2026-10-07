#!/usr/bin/env bash
#
# NumIO — preparación de un servidor Ubuntu 24.04 recién creado.
#
# Se ejecuta UNA vez, como root, dentro del servidor:
#
#     ssh root@TU_IP 'bash -s' < instalar-servidor.sh
#
# Deja el servidor con Docker instalado, el cortafuegos cerrado salvo
# 22/80/443 y un usuario 'numio' que no necesita ser root para trabajar.
# Volver a ejecutarlo no rompe nada: cada paso comprueba antes de actuar.

set -euo pipefail

azul()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
verde() { printf '\033[1;32m  ok\033[0m %s\n' "$1"; }

[ "$(id -u)" -eq 0 ] || { echo "Este script se ejecuta como root."; exit 1; }

azul "Actualizando el sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
verde "sistema al día"

azul "Instalando Docker"
if command -v docker >/dev/null 2>&1; then
  verde "Docker ya estaba instalado ($(docker --version))"
else
  curl -fsSL https://get.docker.com | sh >/dev/null
  verde "$(docker --version)"
fi
docker compose version >/dev/null 2>&1 || { echo "Falta el plugin compose"; exit 1; }
verde "$(docker compose version)"

azul "Creando el usuario 'numio'"
if id numio >/dev/null 2>&1; then
  verde "el usuario ya existía"
else
  adduser --disabled-password --gecos "NumIO" numio >/dev/null
  usermod -aG sudo numio
  verde "usuario creado"
fi
usermod -aG docker numio

# Las claves SSH con las que entraste como root sirven para el usuario nuevo.
if [ -d /root/.ssh ] && [ ! -f /home/numio/.ssh/authorized_keys ]; then
  mkdir -p /home/numio/.ssh
  cp /root/.ssh/authorized_keys /home/numio/.ssh/ 2>/dev/null || true
  chown -R numio:numio /home/numio/.ssh
  chmod 700 /home/numio/.ssh
  chmod 600 /home/numio/.ssh/authorized_keys 2>/dev/null || true
  verde "claves SSH copiadas al usuario numio"
fi

azul "Cerrando el cortafuegos salvo 22, 80 y 443"
if command -v ufw >/dev/null 2>&1; then
  # El orden importa: se permite SSH ANTES de activar, o la sesión se corta.
  ufw allow 22/tcp    >/dev/null
  ufw allow 80/tcp    >/dev/null
  ufw allow 443/tcp   >/dev/null
  ufw --force enable  >/dev/null
  verde "$(ufw status | head -1)"
else
  echo "  ufw no está disponible; usa el cortafuegos del panel del proveedor"
fi

azul "Memoria de intercambio"
# Compilar el frontend (Vite con Plotly y KaTeX) es lo que más memoria pide de
# todo el despliegue, y en una máquina de 1 o 2 GB el compilador muere con un
# críptico "killed" que en realidad es el sistema quedándose sin RAM. Con disco
# de intercambio, esa compilación termina aunque sea más lenta. En una máquina
# de 4 GB o más no hace falta y no se toca nada.
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$RAM_MB" -ge 3800 ]; then
  verde "${RAM_MB} MB de RAM: no hace falta"
elif swapon --show | grep -q .; then
  verde "ya había intercambio activo"
else
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Que solo se use cuando de verdad falte RAM, no de forma rutinaria.
  sysctl -w vm.swappiness=10 >/dev/null
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  verde "4 GB de intercambio activos (RAM física: ${RAM_MB} MB)"
fi

azul "Carpeta del proyecto"
mkdir -p /home/numio/numio
chown -R numio:numio /home/numio/numio
verde "/home/numio/numio"

echo
echo "────────────────────────────────────────────────────────────"
echo " Servidor listo. Desde tu equipo, ahora:"
echo "     ./publicar.sh numio@$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "────────────────────────────────────────────────────────────"
