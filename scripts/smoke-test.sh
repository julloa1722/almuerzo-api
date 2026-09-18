#!/usr/bin/env bash
# Reproduce, con curl, exactamente el flujo que se validó a mano durante el desarrollo:
# health -> rechazo sin token -> login -> rechazo sin ambito -> seleccionar ambito ->
# endpoint protegido devolviendo solo los colaboradores de la empresa correcta.
#
# Requiere que la API esté corriendo (npm run start:dev en otra terminal) y que
# ya hayas corrido npm run migrate && npm run seed.
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000}"

fallas=0
ok() {
  if [ "$1" = "0" ]; then echo "  OK  $2"; else echo " FALLA  $2"; fallas=$((fallas+1)); fi
}

echo "=== 1. Health ==="
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH"
echo "$HEALTH" | grep -q '"estado":"ok"'; ok $? "el servicio responde saludable"

echo -e "\n=== 2. Sin token ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/colaboradores")
[ "$CODE" = "401" ]; ok $? "sin token, /colaboradores responde 401 (obtuvo $CODE)"

echo -e "\n=== 3. Login con credenciales de prueba ==="
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"rrhh@futuroars.demo","password":"rrhh123456"}')
TOKEN_SIN_AMBITO=$(echo "$LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")
MEMBRESIA_ID=$(echo "$LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['membresias'][0]['membresiaId'])")
[ -n "$TOKEN_SIN_AMBITO" ]; ok $? "login exitoso, se recibió accessToken"

echo -e "\n=== 4. Endpoint protegido sin ambito seleccionado ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/colaboradores" -H "Authorization: Bearer $TOKEN_SIN_AMBITO")
[ "$CODE" = "403" ]; ok $? "sin ambito, /colaboradores responde 403 (obtuvo $CODE)"

echo -e "\n=== 5. Seleccionar ambito ==="
AMBITO=$(curl -s -X POST "$BASE_URL/auth/seleccionar-ambito" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SIN_AMBITO" \
  -d "{\"membresiaId\": $MEMBRESIA_ID}")
TOKEN=$(echo "$AMBITO" | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")
[ -n "$TOKEN" ]; ok $? "se emitió un token con ambito"

echo -e "\n=== 6. Endpoint protegido, ahora con ambito ==="
RESP=$(curl -s "$BASE_URL/colaboradores" -H "Authorization: Bearer $TOKEN")
echo "$RESP" | python3 -m json.tool
CANTIDAD=$(echo "$RESP" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['colaboradores']))")
[ "$CANTIDAD" = "4" ]; ok $? "devuelve exactamente los 4 colaboradores de Futuro ARS (obtuvo $CANTIDAD)"

echo -e "\n$([ $fallas -eq 0 ] && echo 'Todas las pruebas de humo pasaron.' || echo "$fallas prueba(s) fallaron.")"
exit $fallas
