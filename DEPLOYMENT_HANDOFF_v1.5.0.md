# Computational Mechanics Solver v1.5.0 部署交接

本文仅供后续人工审批和执行；本次清理不执行部署、推送或正式切换。

## 发布目标

- GitHub 分支：待人工确认后，将 `chore/v1.5.0-release-cleanup` 的已审核提交集成到正式发布分支。
- 目标提交：以审批时 `git rev-parse HEAD` 的完整 SHA 为准，不使用浮动分支名代替。
- Docker 构建：`docker build --build-arg APPLICATION_VERSION=1.5.0 -t computational-mechanics-solver:1.5.0 .`

## 生产环境变量

- `CMS_ENV=production`
- `CMS_AUTH_SECRET`：至少 32 字节的随机秘密，由密钥管理服务注入。
- `CMS_DATABASE_URL`：生产 PostgreSQL URL，禁止写入仓库。
- `CMS_DATA_DIR`：持久化工程数据目录。
- `CMS_COOKIE_SECURE=true`，并只通过 HTTPS 暴露服务。
- `CMS_INTERNAL_INVITE_*`：v1.5.1 起已删除，不再读取；旧部署中可直接移除。
- `MECHANICS_GIT_COMMIT`、`MECHANICS_GIT_DIRTY=false`：构建时注入真实提交状态。

## 候选验证

1. 使用独立候选容器、独立候选数据库和独立数据目录，绑定未占用的内部端口。
2. 启动会自动执行 `src/mechanics_mvp/migrations/` 中缺失迁移；核对 `schema_migrations` 后再继续。
3. 健康检查至少覆盖 `/`、`/api/version` 与历史 PDF 下载，并确认 API 返回版本 1.5.0 和目标提交。
4. 验证注册、登录、退出、Cookie Secure 和会话撤销；确认 `/api/entitlements` 返回 404。
5. 验证静力学、动力学、碰撞、轨道、变化场及旧工程迁移。

## 备份、切换与回滚

1. 切换前对生产数据库和 `CMS_DATA_DIR` 制作带时间戳、可恢复验证的快照。
2. 候选环境全部通过后，进入写入维护窗口，再由人工将 HTTPS 反向代理流量切向候选容器。
3. 切换后立即复核版本、账户安全、下载与关键求解路径；观察日志但不得记录密码、Cookie、Token 或内测码。
4. 如验证失败，停止新写入，将流量切回原容器，并恢复切换前数据库和数据目录快照。
5. 未经用户后续明确批准，不连接阿里云、不停止或替换正式容器。
