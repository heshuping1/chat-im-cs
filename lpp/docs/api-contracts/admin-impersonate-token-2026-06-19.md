# 超管代登录 — 为坐席换取 client 访问令牌

供外部聚合系统统一对接:持有超管 token 的调用方,可为指定坐席换取其 client access token,**无需该坐席密码**。

## 端点

```
POST /api/admin/v1/users/{userId}/impersonate-token
```

- **Host**:admin 域(`https://admin.hearteasechat.com`)。
- **路径参数**:`userId` — 目标坐席的 ZTChat userId(GUID)。
- **请求体**:无。
- **认证**:`Authorization: Bearer <超管 token>`,且该 token 已 select 到目标租户(与 `/api/admin/v1/users/{userId}/rate-limit` 等端点完全相同的认证与租户上下文要求,即需带租户上下文头 `X-Tenant-Id`)。
- **所需权限**:`admin.user.impersonate`。平台超管与租户主账号(Owner)默认拥有。

## 成功响应

统一壳,`data` 仅含 access token(不返回 refresh token):

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "accessToken": "<jwt>",
    "userId": "019da95a-086b-79eb-9949-c49d44e840d7",
    "expiresIn": 21600
  }
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `accessToken` | string | 目标坐席的 client access token(JWT)。直接作为 `Authorization: Bearer <accessToken>` 调用 chat 域 `/api/client/v1/*` 端点,行为与该坐席真实登录完全一致。 |
| `userId` | string(GUID) | 目标坐席的 userId(回显)。 |
| `expiresIn` | number | access token 有效期(秒)。 |

## 失败响应

统一错误壳,`code` 取值:

| HTTP | code | 含义 |
| --- | --- | --- |
| 404 | `USER_NOT_FOUND` | 目标 userId 不存在,或不属于当前 select 的租户。 |
| 403 | `IMPERSONATION_NOT_ALLOWED` | 目标账号不可被代登录。仅允许客服/主管类账号(坐席、租户管理员、租户主账号);普通终端用户、无在职成员关系的账号一律拒绝。 |
| 403 | `USER_DISABLED` | 目标账号被禁用/冻结。 |
| 403 | `ADMIN_PERMISSION_FORBIDDEN` | 调用方缺少 `admin.user.impersonate` 权限。 |

## 客户端用法

1. 用超管账号登录 admin 域并 select 到目标租户,拿到超管 token。
2. 通过 `GET /api/admin/v1/users` 找到目标坐席的 `userId`(坐席的 `membershipRole` 为客服(2)/管理员(3)/主账号(4))。
3. `POST /api/admin/v1/users/{userId}/impersonate-token` 取回 `accessToken`。
4. 用该 `accessToken` 调用 chat 域 `/api/client/v1/*`(需带租户头 `X-Tenant-Code`),即以该坐席身份工作。token 过期后重新换取即可。
