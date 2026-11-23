# Computational Mechanics Solver v1.5.1 公开用户与技术说明书维护说明

本目录保存公开说明书的唯一维护源与配套实机截图资源：

- 维护源：`docs/manual/v1.5.1/manual-source.md`
- 截图与封面资源：`docs/manual/v1.5.1/assets/`
- 公开 PDF 成品：`web/downloads/computational-mechanics-solver-v1.5.1-manual.pdf`

## 重新生成步骤

在仓库根目录执行：

```powershell
python tools/build_public_manual.py
powershell -ExecutionPolicy Bypass -File tools/export_public_manual.ps1
```

生成的中间 `.docx` 文件仅用于 Word 排版、公式构建与目录更新，不提交至代码仓库；导出 PDF 后应删除中间 `.docx` 并运行 `tests/test_public_manual.py` 与 `tests/test_manual_download.py` 复核。
