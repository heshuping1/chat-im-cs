#!/bin/bash
# 创建全场景测试数据（自动审批企业 + 各角色账户）
BASE_CHAT="https://chat.hearteasechat.com"
BASE_ADMIN="https://admin.hearteasechat.com"
PASSWORD="Test123456!"
TS=$(date +%s)

# ── 工具函数 ──────────────────────────────────────────────────────────────────

get_captcha_and_login_platform() {
  local email=$1
  local CAPTCHA=$(curl -s -X POST "$BASE_CHAT/api/client/v1/auth/captcha/generate" -H "Content-Type: application/json")
  local TOKEN=$(echo $CAPTCHA | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
  local QUESTION=$(echo $CAPTCHA | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['question'])" 2>/dev/null)
  local ANSWER=$(python3 -c "import re; q='$QUESTION'; nums=re.findall(r'\d+',q); print(int(nums[0])+int(nums[1])) if '+' in q else print(int(nums[0])-int(nums[1]))" 2>/dev/null)
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$email\",\"password\":\"$PASSWORD\",\"loginType\":\"email\",\"captchaToken\":\"$TOKEN\",\"captchaAnswer\":\"$ANSWER\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['platformToken'] if d['code']=='OK' else 'FAIL:'+d['code'])" 2>/dev/null
}

select_tenant() {
  local pt=$1; local tid=$2
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/select-tenant" \
    -H "Authorization: Bearer $pt" -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$tid\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['code']+'|'+d.get('data',{}).get('accessToken','')+'|'+d.get('data',{}).get('userId',''))" 2>/dev/null
}

register_platform() {
  local email=$1
  curl -s -X POST "$BASE_CHAT/api/platform/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"displayName\":\"${2}\",\"password\":\"$PASSWORD\",\"email\":\"$email\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['code']+'|'+d.get('data',{}).get('platformToken','')+'|'+d.get('data',{}).get('platformUserId',''))" 2>/dev/null
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

# ── Step1: 管理员登录 ─────────────────────────────────────────────────────────
echo "=== Step1: 管理员登录 ==="
ADMIN_TOKEN=$(curl -s -X POST "$BASE_ADMIN/api/admin/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"loginName":"admin","password":"xFSHl6n3js9h0oUJU9dUq-OE","deviceId":"11111111-1111-7111-8111-111111111111"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
echo "Admin OK"

# ── Step2: 创建自动审批企业 ───────────────────────────────────────────────────
echo ""
echo "=== Step2: 创建自动审批企业 ==="
TENANT_CODE="lpp-auto-${TS}"

# 先注册所有者账户
R=$(register_platform "lpp_owner_${TS}@test.com" "LPP所有者")
OWNER_PT=$(echo $R | cut -d'|' -f2)
OWNER_PUID=$(echo $R | cut -d'|' -f3)
echo "owner registered: ${OWNER_PUID:0:8}..."

# 用管理员API创建企业（自动审批）
NEW_TENANT=$(curl -s -X POST "$BASE_ADMIN/api/admin/v1/platform/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tenantName\":\"LPP测试企业\",\"tenantCode\":\"$TENANT_CODE\",\"joinApprovalMode\":\"auto\",\"customerServiceMode\":\"auto\",\"friendMode\":\"social\",\"tempSessionEnabled\":true}")
TENANT_ID=$(echo $NEW_TENANT | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('tenantId',''))" 2>/dev/null)
echo "tenant created: $TENANT_ID (code: $TENANT_CODE)"

if [ -z "$TENANT_ID" ]; then
  echo "企业创建失败，查看原因:"
  echo $NEW_TENANT | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('code'), d.get('message'))"
  exit 1
fi

# ── Step3: 所有者进入企业 ─────────────────────────────────────────────────────
echo ""
echo "=== Step3: 所有者进入企业 ==="
R=$(select_tenant "$OWNER_PT" "$TENANT_ID")
OWNER_AT=$(echo $R | cut -d'|' -f2)
OWNER_TENANT_UID=$(echo $R | cut -d'|' -f3)
echo "owner tenant uid: $OWNER_TENANT_UID"

# ── Step4: 注册员工账户并加入企业 ─────────────────────────────────────────────
echo ""
echo "=== Step4: 注册员工账户 ==="

# 管理员
R=$(register_platform "lpp_admin_${TS}@test.com" "LPP管理员")
ADMIN_PT=$(echo $R | cut -d'|' -f2)
echo -n "  admin join: "; join_tenant "$ADMIN_PT" "$TENANT_CODE"
R=$(select_tenant "$ADMIN_PT" "$TENANT_ID")
ADMIN_AT=$(echo $R | cut -d'|' -f2); ADMIN_UID=$(echo $R | cut -d'|' -f3)
echo "  admin uid: $ADMIN_UID"

# 客服
R=$(register_platform "lpp_cs_${TS}@test.com" "LPP客服")
CS_PT=$(echo $R | cut -d'|' -f2)
echo -n "  cs join: "; join_tenant "$CS_PT" "$TENANT_CODE"
R=$(select_tenant "$CS_PT" "$TENANT_ID")
CS_AT=$(echo $R | cut -d'|' -f2); CS_UID=$(echo $R | cut -d'|' -f3)
echo "  cs uid: $CS_UID"

# 技术支持
R=$(register_platform "lpp_tech_${TS}@test.com" "LPP技术支持")
TECH_PT=$(echo $R | cut -d'|' -f2)
echo -n "  tech join: "; join_tenant "$TECH_PT" "$TENANT_CODE"
R=$(select_tenant "$TECH_PT" "$TENANT_ID")
TECH_AT=$(echo $R | cut -d'|' -f2); TECH_UID=$(echo $R | cut -d'|' -f3)
echo "  tech uid: $TECH_UID"

# 普通员工
R=$(register_platform "lpp_member_${TS}@test.com" "LPP普通员工")
MEMBER_PT=$(echo $R | cut -d'|' -f2)
echo -n "  member join: "; join_tenant "$MEMBER_PT" "$TENANT_CODE"
R=$(select_tenant "$MEMBER_PT" "$TENANT_ID")
MEMBER_AT=$(echo $R | cut -d'|' -f2); MEMBER_UID=$(echo $R | cut -d'|' -f3)
echo "  member uid: $MEMBER_UID"

# ── Step5: 设置角色 ───────────────────────────────────────────────────────────
echo ""
echo "=== Step5: 设置角色 ==="
echo -n "  admin -> 3: "; set_role "$OWNER_AT" "$ADMIN_UID" 3
echo -n "  cs -> 2: "; set_role "$OWNER_AT" "$CS_UID" 2
echo -n "  tech -> 1: "; set_role "$OWNER_AT" "$TECH_UID" 1

# ── Step6: 注册客户账户 ───────────────────────────────────────────────────────
echo ""
echo "=== Step6: 注册客户账户 ==="
R=$(register_platform "lpp_cust1_${TS}@test.com" "LPP客户1")
CUST1_PT=$(echo $R | cut -d'|' -f2)
echo -n "  cust1 join: "; join_tenant "$CUST1_PT" "$TENANT_CODE"

R=$(register_platform "lpp_cust2_${TS}@test.com" "LPP客户2")
CUST2_PT=$(echo $R | cut -d'|' -f2)
echo -n "  cust2 join: "; join_tenant "$CUST2_PT" "$TENANT_CODE"

# ── Step7: 注册个人空间账户 ───────────────────────────────────────────────────
echo ""
echo "=== Step7: 注册个人空间账户 ==="
R=$(register_platform "lpp_personal_a_${TS}@test.com" "个人用户A")
PERSONAL_A_PT=$(echo $R | cut -d'|' -f2)
echo "  personal_a registered"

R=$(register_platform "lpp_personal_b_${TS}@test.com" "个人用户B")
PERSONAL_B_PT=$(echo $R | cut -d'|' -f2)
echo "  personal_b registered"

# ── Step8: 企业专属注册账户 ───────────────────────────────────────────────────
echo ""
echo "=== Step8: 企业专属注册账户（模式B）==="
ENT_LOGIN="lpp_ent_${TS}"
ENT_REG=$(curl -s -X POST "$BASE_CHAT/api/client/v1/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -d "{\"displayName\":\"企业专属用户\",\"loginName\":\"$ENT_LOGIN\",\"password\":\"$PASSWORD\",\"email\":\"lpp_ent_${TS}@test.com\"}")
ENT_UID=$(echo $ENT_REG | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('userId',''))" 2>/dev/null)
echo "  enterprise user registered: ${ENT_UID:0:8}..."

# ── 输出结果 ──────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "TIMESTAMP=$TS"
echo "TENANT_ID=$TENANT_ID"
echo "TENANT_CODE=$TENANT_CODE"
echo "OWNER_TENANT_UID=$OWNER_TENANT_UID"
echo "ADMIN_UID=$ADMIN_UID"
echo "CS_UID=$CS_UID"
echo "TECH_UID=$TECH_UID"
echo "MEMBER_UID=$MEMBER_UID"
echo "ENT_LOGIN=$ENT_LOGIN"
echo "ENT_UID=$ENT_UID"
echo "============================================"
