// src/pages/CourseProgress.jsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/http";

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
    id: item.id ?? item.enrollment_id ?? `${emp.id ?? Math.random()}`,
    employeePk: emp.id ?? item.employee_id ?? null,
    empNo: emp.emp_no ?? item.emp_no ?? null,
    name: emp.name ?? item.name ?? "이름없음",
    dept: emp.dept ?? emp.department ?? "",
    progress: Number(progress || 0),
    status,
  };
}

const STATUS_MAP = {
  completed: { label: "수강 완료", className: "bg-green-100 text-green-800" },
  in_progress: { label: "수강중", className: "bg-yellow-100 text-yellow-800" },
  not_started: { label: "미수강", className: "bg-gray-100 text-gray-800" },
};

export default function CourseProgress() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState("");

  const [enrollments, setEnrollments] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [evaluationDetail, setEvaluationDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // 과정 목록 불러오기
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingCourses(true);
      setErr("");
      try {
        const data = await apiFetch("/courses/courses/", { method: "GET", auth: true });
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
  }, []);

  // 수강자 목록 + AI 평가 상태 함께 조회
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
        // 1. 기본 수강자 목록 조회
        let data;
        try {
          data = await apiFetch(`/enrollments/?course=${courseId}`, { method: "GET", auth: true });
        } catch (e1) {
          data = await apiFetch(`/courses/courses/${courseId}/enrollments`, { method: "GET", auth: true });
        }
        const arr = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        const baseEnrollments = arr.map(toEnrollment);

        if (ignore) return;

        // 2. 각 수강자의 AI 평가 상태를 개별적으로 조회하여 상태 업데이트
        const updatedEnrollments = await Promise.all(
          baseEnrollments.map(async (en) => {
            if (!en.empNo) return en;
            try {
              const evaluation = await apiFetch(
                `/organizations/${encodeURIComponent(en.empNo)}/`,
                { method: "GET", auth: false }
              );
              if (evaluation.status === true) {
                return { ...en, status: 'completed' };
              }
              return en; // AI 평가 상태가 true가 아니면 기존 상태 유지
            } catch (err) {
              console.error(`Failed to fetch AI status for ${en.empNo}`, err);
              return en; // 에러 발생 시 기존 정보 반환
            }
          })
        );

        if (!ignore) {
          setEnrollments(updatedEnrollments);
        }
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

  // '미수강'과 '수강완료'로만 그룹화
  const grouped = useMemo(() => {
    const ns = [];
    const cp = [];
    for (const e of enrollments) {
      if (e.status === "completed") {
        cp.push(e);
      } else {
        ns.push(e);
      }
    }
    return { not_started: ns, completed: cp };
  }, [enrollments]);

  // 상세 정보 불러오기 (직원 정보 + AI 평가)
  useEffect(() => {
    if (!detailOpen || !selectedEnrollment) return;
    let ignore = false;
    (async () => {
      setDetailLoading(true);
      setDetailError("");
      setEmployeeDetail(null);
      setEvaluationDetail(null);

      // 직원 정보 조회
      try {
        let employeeData = null;
        if (selectedEnrollment.employeePk) {
          employeeData = await apiFetch(`/organizations/employees/${selectedEnrollment.employeePk}/`, { method: "GET", auth: true });
        } else if (selectedEnrollment.empNo) {
          const list = await apiFetch(`/organizations/employees/?emp_no=${encodeURIComponent(selectedEnrollment.empNo)}`, { method: "GET", auth: true });
          if (Array.isArray(list?.results) && list.results.length) employeeData = list.results[0];
          else if (Array.isArray(list) && list.length) employeeData = list[0];
        }
        if (!ignore) {
          setEmployeeDetail(employeeData ?? {
            name: selectedEnrollment.name,
            dept: selectedEnrollment.dept,
            emp_no: selectedEnrollment.empNo ?? "-",
          });
        }
      } catch (e) {
        console.error(e);
        if (!ignore) setDetailError("직원 상세 정보를 불러오는 중 오류가 발생했습니다.");
      }

      // AI 평가 정보 조회
      if (selectedEnrollment.empNo) {
        try {
          const evaluation = await apiFetch(
            `/organizations/${encodeURIComponent(selectedEnrollment.empNo)}/`,
            { method: "GET", auth: false }
          );
          if (!ignore) {
            setEvaluationDetail(evaluation);
          }
        } catch (err) {
          console.error("Failed to fetch AI evaluation in modal", err);
          if (!ignore) setDetailError((prev) => prev || "AI 평가 정보를 불러오는 데 실패했습니다.");
        }
      }

      if (!ignore) {
        setDetailLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [detailOpen, selectedEnrollment]);

  function handleCloseDetail() {
    setDetailOpen(false);
    setSelectedEnrollment(null);
    setEmployeeDetail(null);
    setEvaluationDetail(null);
    setDetailError("");
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
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
                  <th className="py-2 pr-4">수강 현황</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        className="text-left text-slate-700 hover:text-slate-900 hover:underline focus:outline-none focus-visible:ring focus-visible:ring-gray-400 rounded"
                        onClick={() => {
                          setSelectedEnrollment(e);
                          setDetailOpen(true);
                        }}
                      >
                        {e.name}
                      </button>
                    </td>
                    <td className="py-2 pr-4">{e.dept}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${e.status === 'completed' ? STATUS_MAP.completed.className : STATUS_MAP.not_started.className}`}>
                        {e.status === 'completed' ? STATUS_MAP.completed.label : STATUS_MAP.not_started.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상태별 분류 섹션 (수강중 제거) */}
      <div className="grid sm:grid-cols-2 gap-4">
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseDetail} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <div className="text-sm text-gray-500">수강자 상세</div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedEnrollment?.name ?? "수강자"}
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={handleCloseDetail}
              >
                닫기
              </button>
            </div>
            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {detailLoading && (
                <div className="text-sm text-gray-500">상세 정보를 불러오는 중입니다…</div>
              )}
              {detailError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {detailError}
                </div>
              )}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">직원 정보</h3>
                <div className="rounded-xl border border-slate-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                  <div>
                    <span className="text-gray-500">사번</span>
                    <div className="font-medium text-gray-800">
                      {employeeDetail?.emp_no ?? selectedEnrollment?.empNo ?? "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">부서</span>
                    <div className="font-medium text-gray-800">
                      {employeeDetail?.dept ?? selectedEnrollment?.dept ?? "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">이름</span>
                    <div className="font-medium text-gray-800">
                      {employeeDetail?.name ?? selectedEnrollment?.name ?? "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">수강 현황</span>
                    <div className="font-medium text-gray-800">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedEnrollment?.status === 'completed' ? STATUS_MAP.completed.className : STATUS_MAP.not_started.className}`}>
                        {selectedEnrollment?.status === 'completed' ? STATUS_MAP.completed.label : STATUS_MAP.not_started.label}
                      </span>
                    </div>
                  </div>
                  {employeeDetail?.phone && (
                    <div>
                      <span className="text-gray-500">연락처</span>
                      <div className="font-medium text-gray-800">{employeeDetail.phone}</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">AI 평가</h3>
                {evaluationDetail ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">모션</span>
                      <span className="font-medium text-gray-800">
                        {evaluationDetail.motion_type ??
                          "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">점수</span>
                      <span className="font-semibold text-gray-900">
                        {evaluationDetail?.evaluation?.score ?? evaluationDetail?.score ?? "-"}
                      </span>
                    </div>

                    {evaluationDetail?.evaluation?.normalized_distance !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">정규화 거리</span>
                        <span className="text-gray-800">
                          {evaluationDetail.evaluation.normalized_distance}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-gray-500 text-center">
                    {detailLoading
                      ? "평가 정보를 불러오는 중입니다…"
                      : selectedEnrollment?.empNo
                        ? "평가 데이터가 없습니다."
                        : "사번 정보가 없어 평가 데이터를 조회할 수 없습니다."}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
