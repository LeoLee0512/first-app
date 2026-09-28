"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "app.css"), "utf8");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const manualPath = "/downloads/computational-mechanics-solver-v1.3.2-manual.pdf";
const manualFile = path.join(root, "web", "downloads", "computational-mechanics-solver-v1.3.2-manual.pdf");

let checks = 0;
function check(callback) {
  callback();
  checks += 1;
}

check(() => {
  assert.match(html, /<title>Computational Mechanics Solver v1\.5\.1<\/title>/);
  assert.match(html, /id="releaseVersion"[^>]*class="[^"]*rainbow-animated[^"]*"[^>]*>v1\.5\.1</);
  assert.match(css, /\.rainbow-animated\s*\{[^}]*animation:\s*rainbowFlow/s);
});

check(() => {
  assert.match(html, /id="announcementButton"/);
  assert.match(html, /aria-label="查看 v1\.5\.1 更新公告"/);
  assert.match(html, /aria-controls="announcementDialog"/);
  assert.match(html, /class="li-atom"/);
  assert.match(css, /@keyframes atomOrbit/);
});

check(() => {
  assert.match(html, /id="announcementDialog"[^>]*aria-labelledby="announcementTitle"/);
  assert.match(html, /Computational Mechanics Solver v1\.5\.1 更新公告/);
  assert.match(html, /同步二维动力学世界/);
  assert.match(html, /圆—圆、圆—地面接触/);
  assert.match(html, /受控 AST 与白名单求值/);
  assert.match(html, /cms-dynamics-project@2/);
  assert.match(html, /v1\.5\.0 新功能请参考本更新公告/);
  assert.match(html, /仅作为历史版本说明书继续提供下载/);
  assert.match(html, /不会自动推送 GitHub/);
  assert.match(html, /轨道对象尚未与自由\/接触对象进入同一碰撞世界/);
  assert.match(html, /不继续剩余时长的自由飞行/);
  assert.match(html, /不应用于未经独立复核的工程安全决策/);
});

check(() => {
  assert.match(app, /announcementDialog\.showModal\(\)/);
  assert.match(app, /event\.target === els\.announcementDialog/);
  assert.match(app, /announcementDialog\.addEventListener\("close", restoreAnnouncementFocus\)/);
});

check(() => {
  const cards = [...html.matchAll(/<a\s+class="manual-download-card"[\s\S]*?<\/a>/g)];
  assert.equal(cards.length, 2, "Both mechanics modules must expose one manual download card.");
  for (const card of cards) {
    assert.match(card[0], new RegExp(`href="${manualPath.replaceAll(".", "\\.")}"`));
    assert.match(card[0], /download/);
    assert.match(card[0], /用户与技术说明书/);
    assert.match(card[0], /v1\.3\.2 · 历史版本/);
    assert.match(card[0], /适用于 v1\.3\.2 的历史版本/);
    assert.match(card[0], /manual-cube-icon/);
    assert.equal((card[0].match(/cube-edge/g) || []).length, 9);
  }
});

check(() => {
  assert.equal(fs.existsSync(manualFile), true, "The single retained historical manual must exist.");
  const bytes = fs.readFileSync(manualFile);
  assert.ok(bytes.length > 0, "Historical manual must not be empty.");
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "%PDF");
  assert.doesNotMatch(html, /href="[^"]*release\//);
  assert.doesNotMatch(html, /v1\.5\.0[^<]{0,40}用户与技术说明书/);
});

check(() => {
  // v1.5.1: no membership UI may remain anywhere in the shipped page.
  assert.doesNotMatch(html, /Plus\/Pro|Pro 用户|Internal Tester|获得更多权益|internalLoginEntry|等待名单|entitlement/);
  assert.match(html, /PINN 求解器（开发中）/);
  assert.match(html, /移除套餐、权益门控与内部测试通道/);
});

check(() => {
  assert.doesNotMatch(html, /当前主身份|当前身份/);
  assert.match(css, /\.manual-cube-icon \.edge-1/);
  assert.match(css, /\.manual-cube-icon \.edge-9/);
});

check(() => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.atom-orbit[\s\S]*animation:\s*none !important/);
  assert.match(css, /\.manual-download-card[\s\S]*transition:\s*none !important/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.welcome-content[\s\S]*padding:\s*112px 22px 22px/);
});

check(() => {
  assert.match(html, /Leo\s+<span class="li-ion">Li<sup>\+<\/sup><\/span>\s+Studio出品/);
  assert.match(css, /\.li-ion\s*\{[\s\S]*position:\s*relative[\s\S]*padding-right:\s*0\.34em/);
  assert.match(css, /\.li-ion sup\s*\{[\s\S]*position:\s*absolute[\s\S]*top:\s*-0\.34em/);
  assert.match(css, /\.li-nucleus sup\s*\{[\s\S]*position:\s*absolute[\s\S]*right:\s*3px/);
});

console.log(`release-ui: ${checks} checks passed`);
