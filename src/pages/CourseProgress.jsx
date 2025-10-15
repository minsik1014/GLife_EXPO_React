// src/pages/CourseProgress.jsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/http";

function ProgressBar({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-gray-900"
        style={{ width: `${v}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        role="progressbar"
      />
    </div>
  );
}

/** 서버 → UI: 과정 매핑 (유연) */
function toCourse(item) {
  return {
    id: item.id ?? item.course_id ?? item.pk ?? String(item.title ?? item.name),
    title: item.title ?? item.name ?? item.course_name ?? "무제",
  };
}

/** 서버 → UI: 수강자 매핑 (유연) */
function toEnrollment(item) {
  const emp = item.employee ?? item.user ?? item.trainee ?? {};
  const progress =
    item.progress ??
    item.completion ??
    item.percent ??
    (typeof item.completed_ratio === "number" ? item.completed_ratio * 100 : 0);

  const statusRaw = (item.status ?? item.state ?? "").toString().toLowerCase();

  // 상태가 없으면 진행률로 분류 기준 설정
  let status = "not_started";
  if (typeof progress === "number") {
    if (progress >= 100) status = "completed";
    else if (progress > 0) status = "in_progress";
    else status = "not_started";
  }
  if (statusRaw.includes("complete") || statusRaw.includes("완료")) status = "completed";
  else if (statusRaw.includes("progress") || statusRaw.includes("진행")) status = "in_progress";
  else if (statusRaw.includes("미수강") || statusRaw.includes("not")) status = "not_started";

  return {
    id: item.id ?? item.enrollment_id ?? `${emp.id ?? emp.email ?? Math.random()}`,
    name: emp.name ?? item.name ?? "이름없음",
    dept: emp.dept ?? emp.department ?? "",
    email: emp.email ?? "",
    progress: Number(progress || 0),
    status,
  };
}

export default function CourseProgress() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState("");

  const [enrollments, setEnrollments] = useState([]);

  // 과정 목록 불러오기
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingCourses(true);
      setErr("");
      try {
        const data = await apiFetch("/courses/courses/", { method: "GET", auth: true });
        console.log(`data: ${data}`);
        const arr = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        const mapped = arr.map(toCourse);
        if (!ignore) {
          setCourses(mapped);
          if (!courseId && mapped.length) setCourseId(String(mapped[0].id));
        }
      } catch (e) {
        console.error(e);
        if (!ignore) setErr("과정 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!ignore) setLoadingCourses(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []); // 최초 1회

  // 선택된 과정의 수강자 현황 불러오기
  useEffect(() => {
    if (!courseId) {
      setEnrollments([]);
      return;
    }
    let ignore = false;
    (async () => {
      setLoadingList(true);
      setErr("");
      try {
        // 1차 시도: /courses/enrollments?course_id=ID
        let data;
        try {
          data = await apiFetch(`/courses/enrollments?course_id=${courseId}`, {
            method: "GET",
            auth: true,
          });
        } catch (e1) {
          // 2차 시도: /courses/courses/ID/enrollments
          data = await apiFetch(`/courses/courses/${courseId}/enrollments`, {
            method: "GET",
            auth: true,
          });
        }
        const arr = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        const mapped = arr.map(toEnrollment);
        if (!ignore) setEnrollments(mapped);
      } catch (e) {
        console.error(e);
        if (!ignore) {
          setErr("수강자 목록을 불러오는 중 오류가 발생했습니다.");
          setEnrollments([]);
        }
      } finally {
        if (!ignore) setLoadingList(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [courseId]);

  const grouped = useMemo(() => {
    const ns = [];
    const ip = [];
    const cp = [];
    for (const e of enrollments) {
      if (e.status === "completed") cp.push(e);
      else if (e.status === "in_progress") ip.push(e);
      else ns.push(e);
    }
    return { not_started: ns, in_progress: ip, completed: cp };
  }, [enrollments]);

  return (
    <div className="space-y-6">
      {/* 헤더: 과정 선택 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-lg font-semibold">교육 수강 현황</div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <label className="text-sm text-gray-600">교육과정</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            disabled={loadingCourses || !courses.length}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 에러/로딩 */}
      {err && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      {/* 전체 테이블 */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">수강자 목록</div>
          {loadingList && <div className="text-sm text-gray-500">불러오는 중…</div>}
        </div>

        {(!enrollments || enrollments.length === 0) && !loadingList ? (
          <div className="text-center text-gray-500 py-10">
            선택된 과정의 수강자가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">이름</th>
                  <th className="py-2 pr-4">부서</th>
                  <th className="py-2 pr-4">이메일</th>
                  <th className="py-2 pr-4 w-64">진행률</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="py-2 pr-4">{e.name}</td>
                    <td className="py-2 pr-4">{e.dept}</td>
                    <td className="py-2 pr-4">{e.email}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-48">
                          <ProgressBar value={e.progress} />
                        </div>
                        <span className="tabular-nums">{Math.round(e.progress)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상태별 분류 섹션 */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="font-medium mb-2">미수강</div>
          {grouped.not_started.length === 0 ? (
            <div className="text-sm text-gray-500">없음</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {grouped.not_started.map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.dept ? <span className="text-gray-500"> · {p.dept}</span> : null}
                  {p.email ? <span className="text-gray-400"> · {p.email}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="font-medium mb-2">수강중</div>
          {grouped.in_progress.length === 0 ? (
            <div className="text-sm text-gray-500">없음</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {grouped.in_progress.map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.dept ? <span className="text-gray-500"> · {p.dept}</span> : null}
                  {p.email ? <span className="text-gray-400"> · {p.email}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="font-medium mb-2">수강완료</div>
          {grouped.completed.length === 0 ? (
            <div className="text-sm text-gray-500">없음</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {grouped.completed.map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.dept ? <span className="text-gray-500"> · {p.dept}</span> : null}
                  {p.email ? <span className="text-gray-400"> · {p.email}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
