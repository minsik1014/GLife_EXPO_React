import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/http";

function makeRow() {
  const uuid =
    typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    key: uuid,
    employeeId: "",
    name: "",
    dept: "",
    email: "",
  };
}

function toCourseOption(item) {
  return {
    id: item.id ?? item.course_id ?? item.pk ?? String(item.title ?? item.name),
    title: item.title ?? item.name ?? item.course_name ?? "무제",
  };
}

export default function Enrollments() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [rows, setRows] = useState(() => [makeRow()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchCourseList = useCallback(async () => {
    const data = await apiFetch("/courses/courses/", { method: "GET", auth: true });
    const arr = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
    return arr.map(toCourseOption);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingCourses(true);
      setError("");
      try {
        const mapped = await fetchCourseList();
        if (!ignore) {
          setCourses(mapped);
          if (mapped.length) {
            setCourseId((prev) => {
              if (prev && mapped.some((c) => String(c.id) === String(prev))) return prev;
              return String(mapped[0].id);
            });
          }
        }
      } catch (e) {
        console.error(e);
        if (!ignore) setError("과정 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!ignore) setLoadingCourses(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fetchCourseList]);

  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(""), 3500);
      return () => clearTimeout(id);
    }
  }, [message]);

  const hasValidRow = useMemo(() => rows.some((r) => r.employeeId.trim()), [rows]);

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(key) {
    setRows((prev) => {
      if (prev.length <= 1) return [makeRow()];
      return prev.filter((row) => row.key !== key);
    });
  }

  function updateRow(key, field, value) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!courseId) {
      setError("과정을 선택해주세요.");
      return;
    }

    const payloadRows = rows
      .map((row) => ({
        employee_id: row.employeeId.trim(),
        name: row.name.trim(),
        dept: row.dept.trim(),
        email: row.email.trim(),
      }))
      .filter((row) => row.employee_id);

    if (!payloadRows.length) {
      setError("최소 한 명 이상의 수강자를 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiFetch(`/courses/courses/${courseId}/enroll`, {
        method: "POST",
        auth: true,
        body: {
          employee_ids: payloadRows.map((row) => row.employee_id),
          employees: payloadRows.map(({ employee_id, name, dept, email }) => ({
            employee_id,
            ...(name ? { name } : {}),
            ...(dept ? { dept } : {}),
            ...(email ? { email } : {}),
          })),
        },
      });
      setRows([makeRow()]);
      setMessage("수강자 등록이 완료되었습니다.");
    } catch (err) {
      console.error(err);
      setError("수강자 등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">수강자 등록</h1>
        <p className="text-sm text-gray-500">
          선택한 교육 과정에 여러 명의 사원을 한 번에 등록할 수 있습니다. 사번(또는 직원 ID)을 반드시 입력해주세요.
        </p>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      {message && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</div>}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="course-select">
            교육과정
          </label>
          <select
            id="course-select"
            className="border rounded-lg px-3 py-2 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={loadingCourses || !courses.length}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-sm text-gray-500 underline disabled:text-gray-300"
            onClick={() => {
              setLoadingCourses(true);
              setError("");
              (async () => {
                try {
                  const mapped = await fetchCourseList();
                  setCourses(mapped);
                  if (mapped.length) {
                    setCourseId((prev) => {
                      if (prev && mapped.some((c) => String(c.id) === String(prev))) return prev;
                      return String(mapped[0].id);
                    });
                  } else {
                    setCourseId("");
                  }
                } catch (err) {
                  console.error(err);
                  setError("과정 목록을 새로고침하는 동안 오류가 발생했습니다.");
                } finally {
                  setLoadingCourses(false);
                }
              })();
            }}
            disabled={loadingCourses}
          >
            목록 새로고침
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-medium">수강자 입력</div>
            <button
              type="button"
              onClick={addRow}
              className="text-sm px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100"
            >
              + 행 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 w-40">사번 / ID *</th>
                  <th className="px-4 py-2 w-40">이름</th>
                  <th className="px-4 py-2 w-48">부서</th>
                  <th className="px-4 py-2 w-56">이메일</th>
                  <th className="px-4 py-2 w-20 text-center">삭제</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="123456"
                        value={row.employeeId}
                        onChange={(e) => updateRow(row.key, "employeeId", e.target.value)}
                        required={!rows.some((r) => r.key !== row.key && r.employeeId.trim())}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="홍길동"
                        value={row.name}
                        onChange={(e) => updateRow(row.key, "name", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="안전관리팀"
                        value={row.dept}
                        onChange={(e) => updateRow(row.key, "dept", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="email"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="user@example.com"
                        value={row.email}
                        onChange={(e) => updateRow(row.key, "email", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500">
          <div>* 사번 또는 직원 ID는 필수입니다. 이름/부서/이메일은 선택 입력입니다.</div>
          <div>※ 백엔드 스키마에 맞춰 필요한 경우 추가 필드를 확장할 수 있습니다.</div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
            onClick={() => {
              setRows([makeRow()]);
              setError("");
              setMessage("");
            }}
            disabled={saving}
          >
            초기화
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-70"
            disabled={saving || !hasValidRow || !courseId}
          >
            {saving ? "등록 중..." : "수강자 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
