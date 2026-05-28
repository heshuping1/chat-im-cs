#!/bin/bash
BASE_ADMIN="https://admin.hearteasechat.com"
TENANT_ID="019da0ce-9cd2-7623-8808-a0ab11da318a"
TS=1776587541

ADMIN_UID="019da4df-ce34-764e-be54-1eaac342ec93"
CS_UID="019da4df-c90c-77e1-bdab-2d8b957ab523"
TECH_UID="019da4df-c69b-70c0-9b91-0b462a47596f"
OWNER_UID="019da4df-d135-7bae-a2a4-d7db34cc43bd"

ADMIN_TOKEN=$(curl -s -X POST "$BASE_ADMIN/api/admin/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"loginName":"admin","password":"xFSHl6n3js9h0oUJU9dUq-OE","deviceId":"11111111-1111-7111-8111-111111111111"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
echo "Admin OK"

set_role_admin() {
  local uid=$1; local role=$2
  curl -s -X PUT "$BASE_ADMIN/api/admin/v1/tenants/$TENANT_ID/members/$uid/role" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"membershipRole\":$role}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('code'), d.get('message',''))" 2>/dev/null
}

echo ""
echo "=== 用管理员 API 设置角色 ==="
echo -n "  owner -> 4: "; set_role_admin "$OWNER_UID" 4
echo -n "  admin -> 3: "; set_role_admin "$ADMIN_UID" 3
echo -n "  cs -> 2: "; set_role_admin "$CS_UID" 2
echo -n "  tech -> 1: "; set_role_admin "$TECH_UID" 1

echo ""
echo "=== 验证角色设置 ==="
curl -s "$BASE_ADMIN/api/admin/v1/users?tenantId=$TENANT_ID&userType=2&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import json,sys
d=json.load(sys.stdin)
data = d.get('data', {})
items = data.get('items', data) if isinstance(data, dict) else data
for m in items:
    name = m.get('displayName','?')
    if 'LPP' in name or 'lpp' in name.lower():
        print(f'  {name} | role={m.get(\"membershipRole\")} | uid={str(m.get(\"userId\",\"\"))[:8]}...')
" 2>/dev/null
