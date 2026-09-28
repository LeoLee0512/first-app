# Computational Mechanics Solver

当前版本：**v1.5.0**

Computational Mechanics Solver 是一个带浏览器建模界面的二维静力学与动力学求解器。Python 服务端负责账户、权限、静力学求解、报告和文件下载；动力学数值核心在浏览器中以纯数值模块运行。

版本唯一来源为 `src/mechanics_mvp/version.py`。`/api/version` 会返回应用版本、真实 Git 提交/构建注入值、真实工作区状态以及静力学/动力学 Schema。

## 当前功能

### 静力学

- 二维梁柱、桁架和刚性单元，`ux`、`uy`、`rz` 自由度。
- 节点荷载、局部均布/线性/多项式荷载、杆中集中力和集中力偶。
- 单端弯矩释放、位移、反力、杆端力、内力图、危险截面和柔度摘要。
- 内力图符号约定：轴力 N 以拉为正；弯矩 M 以杆件下侧（局部 -y 侧）受拉为正；剪力 V 取截面左侧横向力之和。杆端力 `n_i/v_i/m_i` 等是节点作用在杆端上的力，与内力图约定不同。
- 工程保存/打开、模型诊断以及 PDF 计算书。

### 动力学

- 独立质点和同步二维刚体世界。
- 圆—圆、圆—地面碰撞，恢复系数、静/动摩擦、阻尼、多接触迭代和自适应防穿透子步。
- 真实角度、角速度、角加速度、转动惯量、力矩，以及局部/世界坐标作用点。
- 直线、斜坡、折线、圆弧、Bezier 轨道；质点滑动、实心圆盘滚动、端点事件和离轨状态。
- 重力、电场和二维垂直磁场的常量、时间、空间与时间—空间表达式；表达式使用受控 AST，不执行用户代码。
- 动力学工程 Schema 为 `cms-dynamics-project@2`，保留从 `@1` 的迁移。

### 账户与权益

- 服务器账户、Argon2id 密码、可撤销会话、CSRF/同源检查、登录限速和安全头像存储。
- Free、Plus、Pro、Internal Tester、Admin 服务端权益矩阵。
- Plus/Pro 当前只展示，购买尚未开放。
- Internal Tester 不继承 Admin；内测码只允许通过 `CMS_INTERNAL_INVITE_CODE` 环境变量设置。
- PINN 求解器仍为**开发中**；加入等待名单不会启用求解能力。

## 历史说明书

仓库只保留一份公开用户说明书：

`web/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`

页面下载地址为 `/downloads/computational-mechanics-solver-v1.3.2-manual.pdf`。这是**适用于 v1.3.2 的历史版本说明书**，不完整覆盖 v1.5.0 的云账户、Plus/Pro、内测通道、碰撞、刚体转动、约束轨道和变化场。v1.5.0 新功能以主页更新公告和 `RELEASE_NOTES_v1.5.0.md` 为准。

维护源位于 `docs/manual/v1.3.2/manual-source.md`；生成 DOCX 仅作为本地中间文件，不提交仓库。

## 本地运行

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe run_webapp.py --port 18765
```

打开 `http://127.0.0.1:18765/`。如需局域网访问，可显式增加 `--host 0.0.0.0`；这不会自动创建公网或 HTTPS 服务。

命令行静力学示例：

```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python.exe -m mechanics_mvp examples/cantilever_beam.json
```

## Docker

```bash
docker build \
  --build-arg APPLICATION_VERSION=1.5.0 \
  --build-arg GIT_COMMIT="$(git rev-parse HEAD)" \
  --build-arg GIT_DIRTY=false \
  -t computational-mechanics-solver:1.5.0 .

docker run --rm -p 8765:8765 computational-mechanics-solver:1.5.0
```

生产环境还必须配置持久数据库/数据目录、至少 32 字节随机 `CMS_AUTH_SECRET`、`CMS_ENV=production`、`CMS_COOKIE_SECURE=true` 和 HTTPS。完整候选验证、迁移、切换和回滚步骤见 `DEPLOYMENT_HANDOFF_v1.5.0.md`。

## 测试

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests

Get-ChildItem tests\*.test.js | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "JavaScript test failed: $($_.Name)" }
}

Get-ChildItem web\*.js | ForEach-Object {
  node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax failed: $($_.Name)" }
}

node tools\physics_validation_metrics.js --json
```

## 安全和适用范围

- `.env.example` 只含开发占位符，不得直接用于生产。
- 不支持的碰撞几何会明确拒绝，不以隐藏近似继续求解。
- 轨道约束对象暂不与自由/接触对象碰撞；离轨后不继续剩余时长的自由飞行。
- 变化场没有声明标量势函数时，不提供势能或机械能守恒结论。
- v1.5.0 不替代安全关键工程的独立复核、法规验算或试验认证。

## 发布状态

本仓库已完成 v1.5.0 发布前本地清理和验证。本流程**不会自动推送 GitHub、不会连接阿里云、不会更新或切换正式容器**。云端部署必须等待人工确认，并严格按 `DEPLOYMENT_HANDOFF_v1.5.0.md` 执行。
