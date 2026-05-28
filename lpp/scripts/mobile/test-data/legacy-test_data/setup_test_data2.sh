#!/bin/bash
# 使用已有企业，改为自动审批，创建全场景测试账户
BASE_CHAT="https://chat.hearteasechat.com"
BASE_ADMIN="https://admin.hearteasechat.com"
PASSWORD="Test123456!"
TS=$(date +%s)

# 使用 mouse-corp 企业（已有所有者）
TENANT_ID="019da0ce-9cd2-7623-8808-a0ab11da318a"
TENANT_CODE="mouse-corp"

register_platform() {
  local email=$1; local name=$2
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"displayName\":\"$name\",\"password\":\"$PASSWORD\",\"email\":\"$email\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['code']+'|'+d.get('data',{}).get('platformToken','')+'|'+d.get('data',{}).get('platformUserId',''))" 2>/dev/null
}

select_tenant() {
  local pt=$1; local tid=$2
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/select-tenant" \
    -H "Authorization: Bearer $pt" -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$tid\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['code']+'|'+d.get('data',{}).get('accessToken','')+'|'+d.get('data',{}).get('userId',''))" 2>/dev/null
}

join_tenant() {
  local pt=$1; local code=$2
  curl -s -X POST "$BASE_CHAT/api/platform/v1/tenants/join-by-code" \
    -H "Authorization: Bearer $pt" -H "Content-Type: application/json" \
    -d "{\"tenantCode\":\"$code\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['code'], d.get('message',''))" 2>/dev/null
}

set_role() {
  local at=$1; local uid=$2; local role=$3
  curl -s -X PUT "$BASE_CHAT/api/client/v1/tenant/members/$uid/role" \
    -H "Authorization: Bearer $at" -H "Content-Type: application/json" \
    -d "{\"membershipRole\":$role}" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['code'])" 2>/dev/null
}

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

echo "=== Step1: 管理员登录 ==="
ADMIN_TOKEN=$(curl -s -X POST "$BASE_ADMIN/api/admin/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"loginName":"admin","password":"xFSHl6n3js9h0oUJU9dUq-OE","deviceId":"11111111-1111-7111-8111-111111111111"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
echo "Admin OK"

echo ""
echo "=== Step2: 把 mouse-corp 改为自动审批 ==="
UPD=$(curl -s -X PUT "$BASE_ADMIN/api/admin/v1/platform/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"joinApprovalMode":"auto","friendMode":"social","tempSessionEnabled":true}')
echo $UPD | python3 -c "import json,sys; d=json.load(sys.stdin); print('update:', d.get('code'), d.get('message',''))" 2>/dev/null

echo ""
echo "=== Step3: 注册所有者账户并进入企业 ==="
R=$(register_platform "lpp_owner_${TS}@test.com" "LPP所有者")
OWNER_CODE=$(echo $R | cut -d'|' -f1)
OWNER_PT=$(echo $R | cut -d'|' -f2)
OWNER_PUID=$(echo $R | cut -d'|' -f3)
echo "owner: $OWNER_CODE puid=${OWNER_PUID:0:8}..."

echo -n "  owner join mouse-corp: "
join_tenant "$OWNER_PT" "$TENANT_CODE"
R=$(select_tenant "$OWNER_PT" "$TENANT_ID")
OWNER_AT=$(echo $R | cut -d'|' -f2); OWNER_UID=$(echo $R | cut -d'|' -f3)
echo "  owner tenant uid: $OWNER_UID"

echo ""
echo "=== Step4: 注册员工账户 ==="
R=$(register_platform "lpp_admin_${TS}@test.com" "LPP管理员")
ADMIN_PT=$(echo $R | cut -d'|' -f2)
echo -n "  admin join: "; join_tenant "$ADMIN_PT" "$TENANT_CODE"
R=$(select_tenant "$ADMIN_PT" "$TENANT_ID")
ADMIN_AT=$(echo $R | cut -d'|' -f2); ADMIN_UID=$(echo $R | cut -d'|' -f3)
echo "  admin uid: $ADMIN_UID"

R=$(register_platform "lpp_cs_${TS}@test.com" "LPP客服")
CS_PT=$(echo $R | cut -d'|' -f2)
echo -n "  cs join: "; join_tenant "$CS_PT" "$TENANT_CODE"
R=$(select_tenant "$CS_PT" "$TENANT_ID")
CS_AT=$(echo $R | cut -d'|' -f2); CS_UID=$(echo $R | cut -d'|' -f3)
echo "  cs uid: $CS_UID"

R=$(register_platform "lpp_tech_${TS}@test.com" "LPP技术支持")
TECH_PT=$(echo $R | cut -d'|' -f2)
echo -n "  tech join: "; join_tenant "$TECH_PT" "$TENANT_CODE"
R=$(select_tenant "$TECH_PT" "$TENANT_ID")
TECH_AT=$(echo $R | cut -d'|' -f2); TECH_UID=$(echo $R | cut -d'|' -f3)
echo "  tech uid: $TECH_UID"

R=$(register_platform "lpp_member_${TS}@test.com" "LPP普通员工")
MEMBER_PT=$(echo $R | cut -d'|' -f2)
echo -n "  member join: "; join_tenant "$MEMBER_PT" "$TENANT_CODE"
R=$(select_tenant "$MEMBER_PT" "$TENANT_ID")
MEMBER_AT=$(echo $R | cut -d'|' -f2); MEMBER_UID=$(echo $R | cut -d'|' -f3)
echo "  member uid: $MEMBER_UID"

echo ""
echo "=== Step5: 设置角色（需要所有者权限）==="
echo -n "  admin -> 3: "; set_role "$OWNER_AT" "$ADMIN_UID" 3
echo -n "  cs -> 2: "; set_role "$OWNER_AT" "$CS_UID" 2
echo -n "  tech -> 1: "; set_role "$OWNER_AT" "$TECH_UID" 1

echo ""
echo "=== Step6: 注册客户账户 ==="
R=$(register_platform "lpp_cust1_${TS}@test.com" "LPP客户1")
CUST1_PT=$(echo $R | cut -d'|' -f2)
echo -n "  cust1 join: "; join_tenant "$CUST1_PT" "$TENANT_CODE"

R=$(register_platform "lpp_cust2_${TS}@test.com" "LPP客户2")
CUST2_PT=$(echo $R | cut -d'|' -f2)
echo -n "  cust2 join: "; join_tenant "$CUST2_PT" "$TENANT_CODE"

echo ""
echo "=== Step7: 注册个人空间账户 ==="
R=$(register_platform "lpp_pa_${TS}@test.com" "个人用户A")
PA_PT=$(echo $R | cut -d'|' -f2)
echo "  personal_a registered"

R=$(register_platform "lpp_pb_${TS}@test.com" "个人用户B")
PB_PT=$(echo $R | cut -d'|' -f2)
echo "  personal_b registered"

echo ""
echo "=== Step8: 企业专属注册（模式B）==="
ENT_LOGIN="lpp_ent_${TS}"
ENT_REG=$(curl -s -X POST "$BASE_CHAT/api/client/v1/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -d "{\"displayName\":\"企业专属用户\",\"loginName\":\"$ENT_LOGIN\",\"password\":\"$PASSWORD\",\"email\":\"lpp_ent_${TS}@test.com\"}")
ENT_UID=$(echo $ENT_REG | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('userId',''))" 2>/dev/null)
echo "  enterprise user: ${ENT_UID:0:8}..."

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
echo "ENT_LOGIN=$ENT_LOGIN"
echo "ENT_UID=$ENT_UID"
echo "============================================"
