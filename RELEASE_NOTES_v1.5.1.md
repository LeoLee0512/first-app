# Computational Mechanics Solver v1.5.1

## 移除会员体系

v1.5.1 删除了 v1.4/v1.5 引入的套餐与权益系统，产品回到"账户只是身份"的形态：

- 删除 Free/Plus/Pro 套餐展示、"获得更多权益"面板、"尚未开放购买"文案及所有购买占位。
- 删除服务端权益门控：`formal`/`advanced` 报告选项对所有账户可用，`/api/entitlements*` 与 `/api/pinn/waitlist` 接口返回 404。
- 删除 Internal Tester 邀请码通道、彩虹头像光圈、`CMS_INTERNAL_INVITE_*` 环境变量。
- 删除 PINN 等待名单；PINN 求解器选项保持"开发中"禁用。
- 用户角色只剩 `free`（普通账户，界面不显示标签）与 `admin`。

## 数据库

新增迁移 `0003_remove_membership.sql`：把 `plus`/`pro`/`internal_tester` 账户转为普通账户，删除 `subscription_plans`、`entitlements`、`user_entitlements`、`role_entitlements`、`internal_access_grants`、`pinn_waitlist` 表和内测尝试记录。**升级前备份数据库**；迁移不可逆。

## 验证

- Python：`python -m unittest discover -s tests`
- JavaScript：`node --test 'tests/*.test.js'`，`node --check web/*.js`
- 历史文档 `docs/adr/0002-entitlements-and-plans.md` 标记为已废弃，保留作记录。
