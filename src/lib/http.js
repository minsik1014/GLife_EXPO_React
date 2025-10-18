// 토큰 재발급 중 여부와 대기열
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

function clearStoredTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

/**
 * API 요청 래퍼 함수 (토큰 재발급 로직 포함)
 */
export async function http(path, { method = "GET", body, auth = true } = {}) {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  const headers = { "Content-Type": "application/json" };
  if (auth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // 401 에러 및 재발급 토큰이 있을 경우 토큰 재발급 시도
    if (res.status === 401 && auth && refreshToken) {
      if (isRefreshing) {
        // 다른 요청에 의해 재발급이 진행중이면, 대기열에 추가 후 재발급된 토큰으로 재시도
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            headers["Authorization"] = `Bearer ${token}`;
            return fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });
          })
          .then(res => res.json());
      }

      isRefreshing = true;

      return new Promise((resolve, reject) => {
        (async () => {
          try {
            // 토큰 재발급 API 호출
            const refreshRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/organizations/refresh/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: refreshToken }),
            });

            if (!refreshRes.ok) throw new Error("Token refresh failed");

            const { access: newAccessToken } = await refreshRes.json();
            localStorage.setItem("accessToken", newAccessToken);
            processQueue(null, newAccessToken); // 대기열에 있던 요청들 재개

            // 원래 실패했던 요청 재시도
            headers["Authorization"] = `Bearer ${newAccessToken}`;
            const retryRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });

            if (!retryRes.ok) {
              const text = await retryRes.text();
              throw new Error(`HTTP ${retryRes.status}: ${text}`);
            }

            resolve(retryRes.json());
          } catch (e) {
            processQueue(e, null);
            clearStoredTokens();
            window.location.href = "/login"; // 재발급 실패 시 로그인 페이지로
            reject(e);
          } finally {
            isRefreshing = false;
          }
        })();
      });
    }

    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * 외부에서 토큰 설정 (주로 로그아웃 시 사용)
 */
export function setAuthToken(token) {
  // 로그인 시에는 Login.jsx에서 직접 토큰을 설정하므로, 이 함수는 주로 로그아웃 시 토큰을 지우는 용도로 사용됩니다.
  if (!token) {
    clearStoredTokens();
  }
}

export const apiFetch = http;
