// src/pages/Schedule.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../lib/http";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }).map((_, i) => CURRENT_YEAR - 2 + i); // year-2 .. year+4

const STATUS_OPTIONS = [
  { value: "planned", label: "예정" },
  { value: "ongoing", label: "진행" },
  { value: "done", label: "완료" },
];

function QuarterSelect({ value, onChange }) {
  return (
    <select
      className="border rounded-lg px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={1}>1분기</option>
      <option value={2}>2분기</option>
      <option value={3}>3분기</option>
      <option value={4}>4분기</option>
    </select>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select
      className="border rounded-lg px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** 간단 모달 */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="닫기">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 서버 응답 → UI 매핑 (서버 필드명 유연 처리) */
function toUI(item) {
  return {
    id: item.id ?? `${item.year ?? item.course_year}-${item.quarter ?? item.term}-${item.title ?? item.course ?? "item"}`,
    year: Number(item.year ?? item.course_year ?? CURRENT_YEAR),
    quarter: Number(item.quarter ?? item.term ?? 1),
    course: item.title ?? item.course ?? "",
    status: item.status ?? "planned",
    note: item.description ?? item.note ?? "",
  };
}

/** 목록 카드(읽기 전용 표시) */
function ScheduleCard({ item }) {
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === item.status)?.label || item.status;
  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {item.year}년 · {item.quarter}분기
        </div>
        <span
          className={
            "text-xs px-2 py-0.5 rounded-full " +
            (item.status === "done"
              ? "bg-green-100 text-green-700"
              : item.status === "ongoing"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700")
          }
        >
          {statusLabel}
        </span>
      </div>
      <div className="font-medium">{item.course}</div>
      {item.note && <div className="text-sm text-gray-600 whitespace-pre-wrap">{item.note}</div>}
    </div>
  );
}

export default function Schedule() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // 추가 모달 상태 & 폼
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    quarter: 1,
    status: "planned",
    course: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => YEARS, []);

  /** 목록 조회: 백엔드 등록 형식에 맞춰 조회 */
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 서버가 year 필터를 지원한다고 가정: GET /courses/courses/?year=YYYY
      const data = await apiFetch(`/courses/courses/?year=${year}`, { method: "GET", auth: true });
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      // 혹시 서버에서 필터를 안 해주면 클라이언트에서 한 번 더 걸러줌
      const filtered = arr.filter((x) => Number(x.year ?? x.course_year) === Number(year));
      setItems((filtered.length ? filtered : arr).map(toUI));
    } catch (e) {
      console.error(e);
      setError("일정 목록을 불러오는 중 오류가 발생했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ESC로 모달 닫기
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openCreateModal() {
    setForm({ quarter: 1, status: "planned", course: "", note: "" });
    setOpen(true);
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** 등록: 서버 스키마에 맞춰 전송 (title/description/quarter/year) */
  async function createSchedule(e) {
    e?.preventDefault?.();
    if (!form.course.trim()) return;

    setSaving(true);
    setMsg("");
    setError("");

    try {
      const payload = {
        year: Number(year),                // 서버가 숫자형을 기대한다고 가정
        quarter: Number(form.quarter),
        title: form.course.trim(),
        description: form.note.trim(),
        // status 필드를 서버가 지원하면 아래 라인 주석 해제:
        // status: form.status,
        // 서버가 course_year 등 다른 키를 기대하면 여기서 추가 매핑:
        // course_year: Number(year),
      };

      await apiFetch("/courses/courses/", {
        method: "POST",
        auth: true,
        body: payload,
      });

      setOpen(false);
      setMsg("일정이 등록되었습니다.");
      await fetchList(); // 목록 재조회
    } catch (e) {
      console.error(e);
      setError("일정 등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {/* 상단 바: 연도 선택 + 추가 버튼 */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">년도 선택</label>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>

        <button onClick={openCreateModal} className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black">
          + 추가
        </button>
      </div>

      {/* 메시지/에러 */}
      {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</div>}
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {/* 목록 */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500 border border-dashed rounded-2xl py-16">
          {year}년 등록된 일정이 없습니다.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <ScheduleCard key={it.id} item={it} />
          ))}
        </div>
      )}

      {/* 추가 모달 */}
      <Modal open={open} title="일정 추가" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={createSchedule}>
          <div className="text-sm text-gray-500">{year}년</div>

          <div className="flex items-center gap-2">
            <div>
              <div className="text-sm text-gray-600 mb-1">분기</div>
              <QuarterSelect value={form.quarter} onChange={(v) => updateForm("quarter", v)} />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">상태</div>
              <StatusSelect value={form.status} onChange={(v) => updateForm("status", v)} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">교육과정명</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="예) 소화기 사용 및 화재대응"
              value={form.course}
              onChange={(e) => updateForm("course", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">비고</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              placeholder="특이사항/대상부서/교육 형태 등"
              value={form.note}
              onChange={(e) => updateForm("note", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50" onClick={() => setOpen(false)} disabled={saving}>
              취소
            </button>
            <button type="submit" className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-70" disabled={saving || !form.course.trim()}>
              {saving ? "저장중..." : "저장"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}