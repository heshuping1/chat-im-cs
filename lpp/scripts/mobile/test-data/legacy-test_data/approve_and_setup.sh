#!/bin/bash
BASE_CHAT="https://chat.hearteasechat.com"
BASE_ADMIN="https://admin.hearteasechat.com"
PASSWORD="Test123456!"
TS=1776587541
TENANT_ID="019da0ce-9cd2-7623-8808-a0ab11da318a"
TENANT_CODE="mouse-corp"

get_captcha_login() {
  local email=$1
  local C=$(curl -s -X POST "$BASE_CHAT/api/client/v1/auth/captcha/generate" -H "Content-Type: application/json")
  local T=$(echo $C | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
  local Q=$(echo $C | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['question'])" 2>/dev/null)
  local A=$(python3 -c "import re; q='$Q'; n=re.findall(r'\d+',q); print(int(n[0])+int(n[1])) if '+' in q else print(int(n[0])-int(n[1]))" 2>/dev/null)
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$email\",\"password\":\"$PASSWORD\",\"loginType\":\"email\",\"captchaToken\":\"$T\",\"captchaAnswer\":\"$A\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['platformToken'] if d['code']=='OK' else 'FAIL:'+d['code'])" 2>/dev/null
}

select_tenant() {
  local pt=$1; local tid=$2
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/select-tenant" \
    -H "Authorization: Bearer $pt" -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$tid\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['code']+'|'+d.get('data',{}).get('accessToken','')+'|'+d.get('data',{}).get('userId',''))" 2>/dev/null
}

set_role() {
  local at=$1; local uid=$2; local role=$3
  curl -s -X PUT "$BASE_CHAT/api/client/v1/tenant/members/$uid/role" \
    -H "Authorization: Bearer $at" -H "Content-Type: application/json" \
    -d "{\"membershipRole\":$role}" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['code'])" 2>/dev/null
}

echo "=== 管理员登录 ==="
ADMIN_TOKEN=$(curl -s -X POST "$BASE_ADMIN/api/admin/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"loginName":"admin","password":"xFSHl6n3js9h0oUJU9dUq-OE","deviceId":"11111111-1111-7111-8111-111111111111"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
echo "OK"

echo ""
echo "=== 查看 mouse-corp 待审批申请 ==="
REQUESTS=$(curl -s "$BASE_ADMIN/api/admin/v1/platform/tenants/$TENANT_ID/join-requests?status=pending&pageSize=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo $REQUESTS | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('code:', d.get('code'))
items = d.get('data', [])
if isinstance(items, dict): items = items.get('items', [])
print('待审批数:', len(items))
for r in items[:10]:
    print(f'  {r.get(\"displayName\",\"?\")} | requestId={str(r.get(\"requestId\",\"\"))[:8]}...')
" 2>/dev/null

echo ""
echo "=== 审批所有待审批申请 ==="
REQUEST_IDS=$(echo $REQUESTS | python3 -c "
import json,sys
d=json.load(sys.stdin)
items = d.get('data', [])
if isinstance(items, dict): items = items.get('items', [])
for r in items:
    rid = r.get('requestId','')
    if rid: print(rid)
" 2>/dev/null)

for RID in $REQUEST_IDS; do
  RESP=$(curl -s -X POST "$BASE_ADMIN/api/admin/v1/platform/tenants/$TENANT_ID/join-requests/$RID/approve" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{}')
  CODE=$(echo $RESP | python3 -c "import json,sys; print(json.load(sys.stdin).get('code','?'))" 2>/dev/null)
  echo "  $RID: $CODE"
done

echo ""
echo "=== 各账户进入企业获取 userId ==="
get_uid() {
  local email=$1
  local pt=$(get_captcha_login "$email")
  local R=$(select_tenant "$pt" "$TENANT_ID")
  echo $R | cut -d'|' -f3
}

OWNER_UID=$(get_uid "lpp_owner_${TS}@test.com"); echo "owner: $OWNER_UID"
ADMIN_UID=$(get_uid "lpp_admin_${TS}@test.com"); echo "admin: $ADMIN_UID"
CS_UID=$(get_uid "lpp_cs_${TS}@test.com"); echo "cs: $CS_UID"
TECH_UID=$(get_uid "lpp_tech_${TS}@test.com"); echo "tech: $TECH_UID"
MEMBER_UID=$(get_uid "lpp_member_${TS}@test.com"); echo "member: $MEMBER_UID"

echo ""
echo "=== 所有者设置角色 ==="
OWNER_PT=$(get_captcha_login "lpp_owner_${TS}@test.com")
R=$(select_tenant "$OWNER_PT" "$TENANT_ID")
OWNER_AT=$(echo $R | cut -d'|' -f2)
echo "owner AT: ${OWNER_AT:0:20}..."

echo -n "  admin -> 3: "; set_role "$OWNER_AT" "$ADMIN_UID" 3
echo -n "  cs -> 2: "; set_role "$OWNER_AT" "$CS_UID" 2
echo -n "  tech -> 1: "; set_role "$OWNER_AT" "$TECH_UID" 1

echo ""
echo "============================================"
echo "TS=$TS"
echo "TENANT_ID=$TENANT_ID"
echo "TENANT_CODE=$TENANT_CODE"
echo "OWNER_UID=$OWNER_UID"
echo "ADMIN_UID=$ADMIN_UID"
echo "CS_UID=$CS_UID"
echo "TECH_UID=$TECH_UID"
echo "MEMBER_UID=$MEMBER_UID"
echo "============================================"
