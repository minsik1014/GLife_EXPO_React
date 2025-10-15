import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth";

function normalizeBizNo(v) {
  // 숫자만 남김
  return (v || "").replace(/\D/g, "").slice(0, 10);
}

export default function LoginPage() {
  const nav = useNavigate();
  const [bizNo, setBizNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const isValid = bizNo.length === 10 && password.length >= 1;

  async function handleLogin(e) {
    e.preventDefault();
    setErrMsg("");

    const cleanBizNo = normalizeBizNo(bizNo);
    if (cleanBizNo.length !== 10) {
      setErrMsg("사업자번호 10자리를 입력하세요.");
      return;
    }
    if (!password) {
      setErrMsg("비밀번호를 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      const token = await login({ biz_no: cleanBizNo, password });
      // alert("로그인 성공");  // 시각적 알림 대신 페이지 전환
      localStorage.setItem("token", token.access); // 세션/쿠키 쓰면 이 부분 제거
      nav("/home", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "로그인에 실패했습니다. 입력값을 확인하세요.";
      setErrMsg(msg);
      console.error("로그인 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-center">로그인</h1>

        {errMsg && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" aria-live="polite">
            {errMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">사업자번호</label>
            <input
              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900"
              type="text"
              placeholder="예: 1234567890"
              value={bizNo}
              onChange={(e) => setBizNo(normalizeBizNo(e.target.value))}
              inputMode="numeric"
              autoComplete="username"
            />
            <p className="text-xs text-gray-500 mt-1">숫자 10자리만 입력하세요.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border bg-gray-900 text-white hover:bg-black disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
