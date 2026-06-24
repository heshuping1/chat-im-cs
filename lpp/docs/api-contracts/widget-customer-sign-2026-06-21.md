# Widget customerId 签名（customerSign）接入说明

> Base：`POST /api/widget/v1/{tenantCode}/sessions`（无需登录鉴权）
> 适用：网页在线客服挂件（`/chat-widget/`、`/zt-widget/`、自带 SDK `widget/sdk.js`）。

## 1. 这是什么 / 为什么要签名

挂件通过 `customerId` 把访客**识别成你方业务系统里的某个实名客户**，从而在该客户复访（换设备、换浏览器、清缓存）时**续上他本人的历史会话**。

`customerId` 是写在挂件 URL / SDK 入参里的**明文**，任何人都能在浏览器地址栏里改。为防止「改一下 `customerId` 就冒充别人、看到别人的客服记录」，服务端用 **HMAC 签名（`customerSign`）** 校验这个 `customerId` 确实由你方系统签发。

判定规则（服务端）：

| 传入 | 行为 |
|---|---|
| `customerId` + **正确** `customerSign` | ✅ 认定为该实名客户 → 续上他的历史会话 |
| `customerId` + **没带 / 错误** `customerSign` | ⚠️ **不报错**，但**当成全新匿名访客**：开新会话，**不会**续到该 `customerId` 的任何历史 |
| 只传 `customerId`、租户**未开启**签名校验 | （兼容旧接入）裸 `customerId` 即可认人 |

> 即：**没有有效签名的 `customerId`，无法进入任何老会话**。要让客户复访续聊，必须带正确的 `customerSign`。

## 2. 签名算法

```
customerSign = Base64( HMAC_SHA256( key = <租户密钥>, message = <customerId 的 UTF-8 字节> ) )
```

- 哈希算法：**HMAC-SHA256**
- 待签名内容：`customerId` 字符串的 **UTF-8 字节**（不加盐、不拼时间戳、不含其它字段）
- 输出编码：**标准 Base64**（含 `+` `/` `=`，非 URL-safe）
- `key`：**你方租户专属的 widget 签名密钥**（每租户独立、可单独轮换、与平台其它密钥隔离），由平台方线下提供给你方，**只在你方服务端持有，严禁下发到浏览器/客户端**。该密钥泄露只影响你方一个租户，请妥善保管；如需更换，联系平台方轮换即可。

签名必须在**你方服务端**计算，再随页面下发给挂件。`customerId` 与 `customerSign` 是**一一对应**的：同一个 `customerId` 永远得到同一个 `customerSign`（密钥不变时），可缓存。

### 各语言示例

**Node.js**
```js
const crypto = require("crypto");
function signCustomerId(customerId, secretKey) {
  return crypto.createHmac("sha256", secretKey)
    .update(customerId, "utf8")
    .digest("base64");
}
```

**Java**
```java
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
String customerSign = Base64.getEncoder()
    .encodeToString(mac.doFinal(customerId.getBytes(StandardCharsets.UTF_8)));
```

**PHP**
```php
$customerSign = base64_encode(hash_hmac('sha256', $customerId, $secretKey, true));
```

**Python**
```python
import hmac, hashlib, base64
customer_sign = base64.b64encode(
    hmac.new(secret_key.encode("utf-8"), customer_id.encode("utf-8"), hashlib.sha256).digest()
).decode()
```

**C#**
```csharp
using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
var customerSign = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(customerId)));
```

## 3. 怎么传给挂件

`customerId` 与 `customerSign` 成对传入。三种接入方式任选其一：

### 3.1 SDK（推荐）
```html
<script src="https://chat.hearteasechat.com/widget/sdk.js"></script>
<script>
  ZTWidget.init({
    tenantCode: "jinlongglobal",
    customerId: "80000000",
    customerSign: "<你方服务端算出的 base64 签名>",
    resumeRecentSession: true   // 复访续聊：续上该客户最近会话
  });
</script>
```

### 3.2 直接打开挂件页（URL 参数）
```
https://chat.hearteasechat.com/chat-widget/?tenantCode=jinlongglobal&customerId=80000000&customerSign=<URL编码后的签名>
```
> `customerSign` 是标准 Base64，含 `+` `/` `=`，放进 URL 时务必做 **URL 编码**（`encodeURIComponent`）。

### 3.3 直接调建会话接口
```
POST /api/widget/v1/{tenantCode}/sessions
Content-Type: application/json

{
  "customerId": "80000000",
  "customerSign": "<base64 签名>",
  "resumeRecentSession": true,
  "locale": "zh-CN",
  "initialMessage": "你好"
}
```

## 4. 请求字段（与签名相关部分）

`WidgetCreateSessionInput`（仅列与本特性相关字段，其余见 [client-api-reference.md](./client-api-reference.md) §Widget）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `customerId` | string? | 否 | 你方业务系统的客户标识。要续聊则必传。 |
| `customerSign` | string? | 视租户配置 | `customerId` 的 HMAC-SHA256 base64 签名。租户开启签名校验时，未带/错误则该 `customerId` 失去认人能力（降级匿名）。 |
| `resumeRecentSession` | bool? | 否 | `true`=复访续聊：进行中会话直接复用，已关闭的自动重开同一会话、保留历史。前提是稳定传**有效**的 `customerId`（或 `fingerprint`）。 |
| `fingerprint` | string? | 否 | 浏览器指纹。未带（有效）`customerId` 时的兜底认人维度；不受签名约束。 |

## 5. 行为与注意事项

- **签名失败不返回错误码**：未带/错误 `customerSign` 时，接口仍 `200 OK` 正常建会话，只是开的是**全新匿名会话**。不要据此判断「签名是否正确」——可在测试阶段对比两次返回的 `visitorId` 是否相同来验证（相同=认人成功，不同=被降级为匿名）。
- **续聊要素**：续上老会话 = 有效 `customerId` 签名 **且** `resumeRecentSession: true`。只带签名不带 `resumeRecentSession`，仍会每次开新会话（按既有冷却窗口）。
- **密钥保密**：`customerSign` 必须在你方服务端生成；切勿把租户密钥写进网页 JS、移动端包体或任何客户端可见处。
- **大小写/编码**：`customerId` 区分大小写，参与签名的就是它本身的字节；`customerSign` 是大小写敏感的 Base64，不要做 trim 以外的改写。

## 6. 错误与降级速查

| 现象 | 含义 | 处理 |
|---|---|---|
| 续不上历史、每次都是空会话 | `customerSign` 没带 / 算错 / 密钥不符 | 核对密钥与算法，确认服务端对**当前 customerId** 重新计算签名 |
| 同一客户换设备后看不到历史 | 未传 `customerId` 或未带签名 | 复访场景必须带 `customerId`+`customerSign`+`resumeRecentSession:true` |
| 想要「全新匿名会话」 | 不传 `customerId`（或故意不带签名） | 走 `fingerprint` 或纯匿名即可 |
