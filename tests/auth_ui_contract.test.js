"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const authClient = fs.readFileSync(path.join(root, "web", "auth-client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "app.css"), "utf8");

assert.match(html, /id="loginPassword"[^>]*type="password"/);
assert.match(html, /id="registerPassword"[^>]*type="password"/);
assert.match(html, /id="registerPasswordConfirm"[^>]*type="password"/);
assert.match(html, /id="acceptTerms"[^>]*type="checkbox"/);
assert.match(html, /id="acceptPrivacy"[^>]*type="checkbox"/);
assert.match(html, /id="settingsCurrentPassword"[^>]*type="password"/);
assert.match(html, /id="settingsNewPassword"[^>]*type="password"/);

assert.ok(
  html.indexOf('/static/auth-client.js') < html.indexOf('/static/app.js'),
  "Auth client must load before the UI controller."
);
assert.doesNotMatch(app, /localStorage\.setItem\([^\n]*(cms_users|cms_current_user)/);
assert.doesNotMatch(app, /JSON\.parse\([^\n]*(cms_users|LEGACY_AUTH_USERS_KEY)/);
assert.match(app, /authClient\.session\(\)/);
assert.match(app, /authClient\.register\(/);
assert.match(app, /authClient\.login\(/);
assert.match(app, /authClient\.logout\(/);
assert.match(authClient, /credentials:\s*"same-origin"/);
assert.match(authClient, /"X-CSRF-Token"/);

assert.match(html, /Leo\s+<span class="li-ion">Li<sup>\+<\/sup><\/span>\s+Studio出品/);
assert.doesNotMatch(html, /Li⁺|Li\+/);
assert.match(html, /<body class="dark-theme">/);
assert.match(css, /body\.dark-theme\s*\{[^}]*--bg:\s*#0e0e10;/s);
assert.match(css, /\.manual-download-card\s*\{[^}]*background:\s*var\(--surface-subtle\)/s);

console.log("auth-ui-contract: 22 checks passed");
