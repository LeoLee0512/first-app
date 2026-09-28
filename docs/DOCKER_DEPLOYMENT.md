# Docker 部署：cms.leomath.cn

Computational Mechanics Solver 与 LeoMath、Leo Tree 部署在同一台阿里云 ECS 上，使用子域名 `cms.leomath.cn`。三者共用主机上的 nginx，按 `server_name` 区分，各自用 Let's Encrypt 域名证书。容器只在 `127.0.0.1:8765` 发布，不对公网开放端口。

| 站点 | 目录 | 容器端口 |
| --- | --- | --- |
| LeoMath | `/opt/leomath` | 3000 |
| Leo Tree | `/opt/leotree-docker` | 3008 |
| 本项目 | `/opt/cms-docker` | 8765 |

## 前提

1. 云解析里为 `leomath.cn` 添加 A 记录：主机记录 `cms`，指向服务器公网 IP。等 `dig +short cms.leomath.cn` 返回该 IP 再签证书。
2. 服务器已有 Docker 与 nginx（部署 LeoMath 时已装）。
3. 备案：`cms.leomath.cn` 是 `leomath.cn` 的子域名，主域名备案通过后子域名可直接使用。

## 首次部署

```bash
git clone https://github.com/LeoLee0512/first-app.git /opt/cms-docker
cd /opt/cms-docker

# 环境变量：两个随机值，只写在 .env，不提交
printf 'POSTGRES_PASSWORD=%s\nCMS_AUTH_SECRET=%s\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > .env
chmod 600 .env

# 构建并启动（首次约 1–2 分钟；GIT_COMMIT 会显示在 /api/version 里）
GIT_COMMIT=$(git rev-parse HEAD) docker compose up -d --build
docker compose ps                                      # web 与 db 都应为 healthy
curl -s http://127.0.0.1:8765/api/version              # 应返回 version 1.5.1 与该提交

# nginx
sudo cp deploy/cms.leomath.nginx.conf /etc/nginx/conf.d/cms.leomath.conf
sudo nginx -t && sudo systemctl reload nginx

# HTTPS（先确认 DNS 已生效）
sudo certbot --nginx -d cms.leomath.cn
```

打开 https://cms.leomath.cn/ 应看到建模界面。生产模式强制 Secure Cookie，所以登录只能通过 HTTPS 使用；直接访问 `http://127.0.0.1:8765` 可以看页面但登录不会保持。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | 是 | 数据库密码，同时用于拼接 `CMS_DATABASE_URL` |
| `CMS_AUTH_SECRET` | 是 | 至少 32 字节的随机值，用于会话签名与审计 |
| `CMS_PORT` | 否 | 主机上监听的端口，默认 8765，只绑定 127.0.0.1 |
| `GIT_COMMIT` | 否 | 构建时传入，显示在 `/api/version`；不传显示 unknown |

`CMS_ENV=production`、`CMS_COOKIE_SECURE=true`、`CMS_DATA_DIR=/var/lib/cms` 固定在 `docker-compose.yml` 里。v1.5.1 起没有套餐、会员或内测码，`CMS_INTERNAL_INVITE_*` 不再读取。

## 更新

```bash
cd /opt/cms-docker && git pull && GIT_COMMIT=$(git rev-parse HEAD) docker compose up -d --build
```

启动时会自动应用 `src/mechanics_mvp/migrations/` 里缺失的迁移。升级前备份：

```bash
docker compose exec db pg_dump -U cms cms | gzip > cms-$(date +%F).sql.gz
docker run --rm -v cms-docker_cms-data:/data -v "$PWD":/backup alpine tar czf /backup/cms-data-$(date +%F).tgz -C /data .
```

## 排错

- `docker compose logs -f web`：应用日志；`docker compose logs db`：数据库。
- 启动即退出并提示 `CMS_AUTH_SECRET` 或 `CMS_COOKIE_SECURE`：`.env` 缺值，或被外部环境变量覆盖为 false。
- 登录报「请求来源无效」：nginx 没有把 `Host` 头原样转发，检查 `proxy_set_header Host $host`。
- 502：容器未启动或健康检查失败，`docker compose ps`。
- nginx 欢迎页或跳到 LeoMath：`cms.leomath.conf` 未加载或 `server_name` 写错，`nginx -T | grep server_name`。
