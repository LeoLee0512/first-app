# 协作约定

- 直接在 `main` 上开发和推送，不再新建工作分支或 PR（仓库所有者 2026-09-28 决定）。
- 每完成一项改动跑一次测试：
  - Python：`python -m unittest discover -s tests`（依赖见 `requirements.txt`）
  - JavaScript：`node --test 'tests/*.test.js'`（直接传目录会报错），并对 `web/*.js` 跑 `node --check`
  - 前端改动用 Playwright 起开发服务器做端到端验证（`CMS_DATA_DIR` 指向临时目录，`python run_webapp.py --port 18765`）
- 每项改动一个提交，提交信息说明物理意义和验证方式。
- 涉及删除文件、数据库迁移、账号/权益逻辑的改动先询问再动手。
- 静力学约定：轴力拉为正；弯矩下侧受拉为正；`support_angle` 逆时针为正、0 表示地面在节点下方。
