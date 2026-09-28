(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AuthClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  class AuthClientError extends Error {
    constructor(message, { code = "AUTH_REQUEST_FAILED", status = 0, retryAfter = null } = {}) {
      super(message);
      this.name = "AuthClientError";
      this.code = code;
      this.status = status;
      this.retryAfter = retryAfter;
    }
  }

  function create(options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

    let current = {
      authenticated: false,
      user: null,
      csrfToken: "",
      expiresAt: "",
    };

    function snapshot() {
      return {
        authenticated: current.authenticated,
        user: current.user ? { ...current.user } : null,
        csrfToken: current.csrfToken,
        expiresAt: current.expiresAt,
      };
    }

    function acceptSession(payload) {
      if (!payload || payload.authenticated !== true || !payload.user) {
        current = { authenticated: false, user: null, csrfToken: "", expiresAt: "" };
      } else {
        current = {
          authenticated: true,
          user: { ...payload.user },
          csrfToken: String(payload.csrfToken || ""),
          expiresAt: String(payload.expiresAt || ""),
        };
      }
      return snapshot();
    }

    async function request(path, { method = "GET", json, body, csrf = false } = {}) {
      const headers = { Accept: "application/json" };
      let requestBody = body;
      if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify(json);
      }
      if (csrf) {
        if (!current.csrfToken) {
          throw new AuthClientError("登录状态已失效，请重新登录。", {
            code: "AUTH_CSRF_MISSING",
            status: 401,
          });
        }
        headers["X-CSRF-Token"] = current.csrfToken;
      }

      let response;
      try {
        response = await fetchImpl(path, {
          method,
          headers,
          body: requestBody,
          credentials: "same-origin",
        });
      } catch (error) {
        throw new AuthClientError("无法连接账户服务，请检查网络后重试。", {
          code: "AUTH_NETWORK_ERROR",
        });
      }

      const contentType = String(response.headers?.get?.("Content-Type") || "");
      let payload = null;
      if (contentType.includes("application/json")) {
        try {
          payload = await response.json();
        } catch (error) {
          payload = null;
        }
      }
      if (!response.ok) {
        const serverError = payload && payload.error && typeof payload.error === "object" ? payload.error : {};
        throw new AuthClientError(
          String(serverError.message || "账户请求失败，请稍后再试。"),
          {
            code: String(serverError.code || "AUTH_REQUEST_FAILED"),
            status: Number(response.status || 0),
            retryAfter: response.headers?.get?.("Retry-After") || null,
          }
        );
      }
      if (!payload || typeof payload !== "object") {
        throw new AuthClientError("账户服务返回了无效响应。", {
          code: "AUTH_INVALID_RESPONSE",
          status: Number(response.status || 0),
        });
      }
      return payload;
    }

    return {
      state: snapshot,

      async session() {
        return acceptSession(await request("/api/auth/session"));
      },

      async register(input) {
        return acceptSession(await request("/api/auth/register", { method: "POST", json: input }));
      },

      async login(input) {
        return acceptSession(await request("/api/auth/login", { method: "POST", json: input }));
      },

      async logout() {
        await request("/api/auth/logout", { method: "POST", json: {}, csrf: true });
        return acceptSession({ authenticated: false });
      },

      async updateProfile(displayName) {
        const payload = await request("/api/auth/profile", {
          method: "PATCH",
          json: { displayName },
          csrf: true,
        });
        current.user = { ...payload.user };
        return snapshot();
      },

      async changePassword(currentPassword, newPassword, newPasswordConfirm) {
        return acceptSession(
          await request("/api/auth/password", {
            method: "POST",
            json: { currentPassword, newPassword, newPasswordConfirm },
            csrf: true,
          })
        );
      },

      async uploadAvatar(file) {
        if (!file) throw new TypeError("file is required");
        const formData = new FormData();
        formData.append("avatar", file);
        const payload = await request("/api/auth/avatar", {
          method: "POST",
          body: formData,
          csrf: true,
        });
        current.user = { ...payload.user };
        return snapshot();
      },
    };
  }

  return { create, AuthClientError };
});
