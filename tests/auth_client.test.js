"use strict";

const assert = require("node:assert/strict");
const { create, AuthClientError } = require("../web/auth-client.js");

function response(status, payload, headers = {}) {
  const normalized = new Map(
    Object.entries({ "Content-Type": "application/json", ...headers }).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ])
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => normalized.get(String(name).toLowerCase()) || null },
    json: async () => payload,
  };
}

(async () => {
  const calls = [];
  const sessionPayload = {
    authenticated: true,
    user: {
      id: "u1",
      username: "student01",
      displayName: "结构力学同学",
      avatarUrl: null,
      role: "free",
      createdAt: "2026-07-12T00:00:00Z",
    },
    csrfToken: "csrf-token-value",
    expiresAt: "2026-07-19T00:00:00Z",
  };
  const client = create({
    fetchImpl: async (path, options) => {
      calls.push({ path, options });
      if (path === "/api/auth/session") return response(200, { authenticated: false });
      if (path === "/api/auth/register") return response(201, sessionPayload);
      if (path === "/api/auth/profile") {
        return response(200, { user: { ...sessionPayload.user, displayName: "新昵称" } });
      }
      if (path === "/api/auth/logout") return response(200, { ok: true });
      return response(500, { error: { code: "UNEXPECTED", message: "unexpected" } });
    },
  });

  assert.deepEqual(await client.session(), {
    authenticated: false,
    user: null,
    csrfToken: "",
    expiresAt: "",
  });
  assert.equal(calls[0].options.credentials, "same-origin");

  const registered = await client.register({ username: "student01", password: "secret" });
  assert.equal(registered.user.displayName, "结构力学同学");
  assert.equal(calls[1].options.headers["Content-Type"], "application/json");
  assert.doesNotMatch(JSON.stringify(client.state()), /password|secret/i);

  const updated = await client.updateProfile("新昵称");
  assert.equal(updated.user.displayName, "新昵称");
  assert.equal(calls[2].options.headers["X-CSRF-Token"], "csrf-token-value");

  const loggedOut = await client.logout();
  assert.equal(loggedOut.authenticated, false);
  assert.equal(calls[3].options.headers["X-CSRF-Token"], "csrf-token-value");

  const failingClient = create({
    fetchImpl: async () => response(401, {
      error: { code: "AUTH_INVALID_CREDENTIALS", message: "用户名或密码错误。" },
    }),
  });
  await assert.rejects(
    () => failingClient.login({ username: "missing", password: "wrong" }),
    (error) =>
      error instanceof AuthClientError &&
      error.code === "AUTH_INVALID_CREDENTIALS" &&
      error.status === 401
  );

  console.log("auth-client: 12 checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
