#!/usr/bin/env bash
# Descargar lista de proxies Webshare a webshare_proxies.txt
# Requiere: WS_TOKEN en entorno o .env en la raíz del proyecto.
# Uso: WS_TOKEN=tu_token ./server/download_proxies.sh
set -euo pipefail

# Intentar leer token desde variable de entorno o .env
if [ -z "${WS_TOKEN:-}" ]; then
  if [ -f .env ]; then
    # cargar .env (líneas VAR=VAL)
    # evita sobreescribir variables del entorno
    export $(grep -v '^#' .env | sed -n 's/^WS_TOKEN=\(.*\)$/WS_TOKEN=\1/p')
  fi
fi

if [ -z "${WS_TOKEN:-}" ]; then
  echo "ERROR: WS_TOKEN no encontrado. Exporta WS_TOKEN o añade WS_TOKEN=... en .env"
  exit 2
fi

OUTFILE="webshare_proxies.txt"
TMPFILE="$(mktemp)"
API="https://proxy.webshare.io/api/v2/proxy/list/download/${WS_TOKEN}/-/any/username/direct/-/?plan_id=12553212"

echo "Solicitando lista a Webshare..."
# Pedimos como text/plain y mostramos cabeceras
http_status=$(curl -s -w "%{http_code}" -o "$TMPFILE" -H "Authorization: Token ${WS_TOKEN}" -H "Accept: text/plain" "$API")

if [ "$http_status" -ge 400 ]; then
  echo "Upstream responded HTTP $http_status. Guardando snippet para diagnóstico."
  head -c 2000 "$TMPFILE" > "${OUTFILE}.error_snippet.txt"
  echo "Snippet guardado en ${OUTFILE}.error_snippet.txt"
  rm -f "$TMPFILE"
  exit 3
fi

# Comprobar si la respuesta parece HTML (caso de página de error/login)
if head -c 64 "$TMPFILE" | grep -qiE '<(html|!doctype|script)'; then
  echo "La respuesta parece HTML (posible error de token/permisos). Guardando snippet."
  head -c 2000 "$TMPFILE" > "${OUTFILE}.error_snippet.txt"
  echo "Snippet guardado en ${OUTFILE}.error_snippet.txt"
  rm -f "$TMPFILE"
  exit 4
fi

# Todo bien: mover a OUTFILE
mv "$TMPFILE" "$OUTFILE"
echo "Lista guardada en $OUTFILE ($(wc -l < "$OUTFILE") líneas)"

echo "Primeras 10 líneas:"
head -n 10 "$OUTFILE"
