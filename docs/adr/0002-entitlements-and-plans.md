# ADR 0002：套餐、权益与内部测试身份

- 状态：**已废弃（v1.5.1，2026-09-28）**。套餐、权益门控、Internal Tester 通道与 PINN 等待名单已整体移除，见迁移 `0003_remove_membership.sql`。以下内容仅作历史记录。
- 日期：2026-07-12
- 目标版本：v1.4.0-beta.1

## 1. 背景

真实服务器账户已经建立，但 `role` 目前只是用户记录上的字符串，不能安全表达 Free、Plus、Pro、Internal Tester 和 Admin 的能力边界。前端隐藏按钮也不能阻止直接调用报告接口。本 ADR 定义服务端为唯一权限来源，并明确尚未上线的支付和 PINN 能力不得伪装成可用功能。

## 2. 决策

### 2.1 单一服务端权限来源

- 当前角色、角色权益、显式用户授权和内部测试有效期均由数据库计算。
- 浏览器提交的 `role`、`plan`、`isPro` 或 entitlement 数组一律不参与授权。
- 每个受限接口在执行计算或生成文件前检查权限。
- 用户响应只返回可公开的角色、主身份标签和权益名，不返回邀请凭据、凭据指纹或管理字段。

### 2.2 角色和主身份标签

| 角色 | 主标签 | 管理权限 |
|---|---|---|
| `free` | Free | 无 |
| `plus` | Plus | 无 |
| `pro` | Pro | 无 |
| `internal_tester` | Internal Tester | 无 |
| `admin` | Admin | 有 |

普通用户只显示一个主身份标签。非管理员身份优先级为：

```text
Internal Tester > Pro > Plus > Free
```

Internal Tester 不是 Admin，不能授予角色、撤销其他用户或访问管理接口。

### 2.3 权益矩阵

| 权益 | Free | Plus | Pro | Internal Tester | Admin |
|---|---:|---:|---:|---:|---:|
| 静力学基础求解 `solve.static` | 是 | 是 | 是 | 是 | 是 |
| 动力学基础求解 `solve.dynamics` | 是 | 是 | 是 | 是 | 是 |
| 基础报告 `report.basic` | 是 | 是 | 是 | 是 | 是 |
| 高级导出 `export.advanced` | 否 | 是 | 是 | 是 | 是 |
| 正式报告 `report.formal` | 否 | 否 | 是 | 是 | 是 |
| PINN 等待名单 `pinn.waitlist` | 是 | 是 | 是 | 是 | 是 |
| 内部预览 `preview.internal` | 否 | 否 | 否 | 是 | 是 |
| 权益管理 `admin.entitlements` | 否 | 否 | 否 | 否 | 是 |

当前版本没有支付、订单或自动升级接口。Plus 和 Pro 只展示规划权益与“尚未开放购买”，不能收款，也不能把开发中功能描述为已交付。基础报告保持现有行为；只有明确请求 `formal` 或 `advanced` 时才触发额外权限检查。

### 2.4 Internal Tester 通道

- 服务端只从环境变量 `CMS_INTERNAL_INVITE_CODE` 读取当前凭据。
- 仓库、前端、日志、数据库、响应和测试夹具不得出现真实值；`.env.example` 只使用 `change-me`。
- 未配置、空值或占位值表示通道关闭。
- 用户必须先完成普通登录，再提交内部通道凭据。
- 比较使用常量时间函数；数据库只保存带服务端密钥的 HMAC 指纹。
- 尝试按用户和来源地址的 HMAC 摘要限速，不保存明文凭据或地址。
- 成功授权记录授予时间、到期时间、最后使用时间、撤销时间、撤销管理员和升级前角色。
- 到期或撤销后恢复升级前角色；默认恢复 Free。
- 只有 Admin 可以撤销其他用户的 Internal Tester 授权。

### 2.5 PINN 等待名单

- PINN 求解器选项继续禁用并显示“开发中”。
- `pinn_waitlist` 只记录用户申请时间和当前状态。
- 加入等待名单不授予求解能力，也不触发训练、推理或付费。
- 前端只显示等待名单状态和真实进度文案。

### 2.6 套餐展示

- “获得更多权益”面板从服务端读取当前角色、权益和公开套餐。
- Free、Plus、Pro 的说明由数据库种子提供；Internal Tester 单独显示兑换区。
- 前端可以根据权限改善可见性，但最终拒绝必须发生在服务端。
- 内部测试用户头像可显示彩虹光圈，但只能显示一个主身份标签。

## 3. 数据模型

新增迁移至少包含：

- `role_entitlements`
- `internal_access_grants`
- `pinn_waitlist`
- `subscription_plans` 的公开说明字段

已有 `login_attempts` 复用 `internal_invite` 类型记录限速审计。

## 4. API 合同

| 方法 | 路径 | 权限 | 用途 |
|---|---|---|---|
| `GET` | `/api/entitlements` | 已登录 | 当前主标签、权益、公开套餐和 PINN 状态 |
| `POST` | `/api/entitlements/internal/redeem` | 已登录 + CSRF | 兑换内部测试身份 |
| `POST` | `/api/entitlements/internal/revoke` | Admin + CSRF | 撤销指定用户内部身份 |
| `POST` | `/api/pinn/waitlist` | `pinn.waitlist` + CSRF | 加入 PINN 等待名单 |

权限不足统一返回稳定错误，例如：

```json
{
  "error": {
    "code": "ENTITLEMENT_REQUIRED",
    "message": "当前账户不包含正式报告权益。"
  }
}
```

响应不回显用户提交的内部通道凭据。

## 5. 被拒绝的方案

### 5.1 只隐藏按钮

拒绝。用户可以直接构造 HTTP 请求，必须在服务端检查。

### 5.2 把真实内部凭据写进前端或数据库

拒绝。前端资源公开，数据库泄漏也不应直接暴露当前凭据。

### 5.3 Internal Tester 继承管理员能力

拒绝。测试资格与系统管理是两个独立信任边界。

### 5.4 在没有支付系统时伪造 Plus/Pro 购买

拒绝。当前只展示规划与权益矩阵，不创建虚假订单、订阅或成功状态。

### 5.5 让 PINN 等待名单调用预留求解器

拒绝。等待名单不是求解授权，PINN 在实现和验证前保持禁用。

## 6. 后续

- 支付、订单、退款和订阅续期需要独立 ADR 与真实支付服务。
- 云工程存储需要独立的数据所有权和配额设计。
- 管理后台不在本目标范围；撤销操作先提供受保护 API 和服务层测试。
