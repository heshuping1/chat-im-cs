# Electron Regression Server API Preparation

`npm run test:electron:regression` prepares accounts through the real server API. It does not require a custom fixture service.

## Required Environment

```powershell
$env:PC_REGRESSION_PASSWORD="test account password"
```

Optional but recommended:

```powershell
$env:PC_REGRESSION_API_BASE_URL="https://chat.hearteasechat.com"
$env:PC_REGRESSION_TENANT_ID="test tenant id"
$env:PC_REGRESSION_TENANT_CODE="mouse-corp"
$env:PC_REGRESSION_ADMIN_TOKEN="admin api access token"
```

Instead of `PC_REGRESSION_ADMIN_TOKEN`, the runner can log in to the admin API when both are provided:

```powershell
$env:PC_REGRESSION_ADMIN_LOGIN="admin login name"
$env:PC_REGRESSION_ADMIN_PASSWORD="admin password"
```

For the shared test environment, the runner can also discover the owner/admin seed from the quick-login account list in `lpp_mobile/lib/features/auth/presentation/pages/login_page.dart`. When `PC_REGRESSION_PASSWORD`, `PC_REGRESSION_TENANT_ID`, and `PC_REGRESSION_ADMIN_TOKEN` are not provided, it uses that seed to:

- log in through `POST /api/platform/v1/auth/login`;
- find the tenant whose code matches `PC_REGRESSION_TENANT_CODE` or `mouse-corp`;
- issue an admin token through `POST /api/platform/v1/auth/admin-token`;
- create the regression account pool through admin API.

Account naming can be controlled with:

```powershell
$env:PC_REGRESSION_ACCOUNT_PREFIX="pc-regression"
$env:PC_REGRESSION_EMAIL_DOMAIN="example.test"
$env:PC_REGRESSION_EMAIL="pc-regression+customer-1@example.test"
```

## API Flow

Preferred preparation path when admin access is available:

- `POST /api/admin/v1/auth/login` when `PC_REGRESSION_ADMIN_LOGIN` is provided.
- `POST /api/admin/v1/platform/tenants/{tenantId}/users` to create each tenant user.
- `POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/reset-password` when the account already exists.
- `PUT /api/admin/v1/platform/tenants/{tenantId}/users/{userId}` to enforce `userType` and `membershipRole`.
- `POST /api/platform/v1/auth/login` and `POST /api/platform/v1/auth/select-tenant` to verify the PC client login path.

Fallback path without admin access:

- `POST /api/platform/v1/auth/login` to reuse an existing account.
- `POST /api/platform/v1/auth/register` when the account does not exist.
- `POST /api/platform/v1/auth/select-tenant` when a platform token must be exchanged for a tenant token.

Fallback registration can prove login and multi-profile isolation, but it cannot guarantee exact customer-service/admin roles when the tenant requires approval or role assignment. In that case the report writes a trackable task instead of silently treating the run as production-ready.

## Role Mapping

| Profile | Role | `userType` | `membershipRole` |
| --- | --- | ---: | ---: |
| `owner-admin` | owner/admin | 2 | 4 |
| `staff-1` | customer service | 2 | 2 |
| `staff-2` | customer service | 2 | 2 |
| `customer-1` | customer | 1 | 0 |
| `customer-2` | customer | 1 | 0 |
| `external-1` | external customer | 1 | 0 |

When `PC_REGRESSION_ACCOUNT_PREFIX` is not provided, the runner uses a run-scoped prefix such as `pc-regression-20260531_180000` so repeated debugging and scheduled runs do not hammer the same fixed account identities. The runner writes only non-sensitive account metadata to `lpp/.local/pc-regression/account-pool.json`. Passwords, tokens, Authorization headers, and refresh tokens must not be written to code, reports, logs, or git.
