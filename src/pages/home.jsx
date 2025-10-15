// src/pages/home.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/http";

/**
 * 상태 문자열 → 표시 레이블
 */
function statusLabelFrom(value) {
  const normalized = (value ?? "").toString().toLowerCase();
  if (!normalized) return "미정";
  if (normalized.includes("done") || normalized.includes("complete") || normalized.includes("완료")) return "완료";
  if (normalized.includes("progress") || normalized.includes("진행")) return "교육중";
  if (normalized.includes("plan") || normalized.includes("대기")) return "예정";
  if (normalized.includes("not") || normalized.includes("미수강") || normalized.includes("미완")) return "미완료";
  return value;
}

/**
 * 상태 문자열 → 뱃지 클래스
 */
function statusBadgeClass(value) {
  const normalized = (value ?? "").toString().toLowerCase();
  if (normalized.includes("done") || normalized.includes("complete") || normalized.includes("완료")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("progress") || normalized.includes("진행")) {
    return "bg-amber-100 text-amber-700";
  }
  if (normalized.includes("plan") || normalized.includes("예정")) {
    return "bg-sky-100 text-sky-700";
  }
  return "bg-rose-100 text-rose-700";
}

/**
 * 과정 데이터 → UI에서 쓰기 편한 형태로 정규화
 * 서버 응답 예시: { id, title, year, quarter, status }
 */
function normalizeCourse(item) {
  const year = Number(item.year ?? item.course_year ?? new Date().getFullYear());
  const quarter = Number(item.quarter ?? item.term ?? 1);
  const statusRaw = item.status ?? item.state ?? item.progress_state ?? "";
  return {
    id: item.id ?? item.course_id ?? item.pk ?? `${year}-${quarter}-${item.title ?? "course"}`,
    title: item.title ?? item.course ?? item.name ?? "제목 미정",
    year,
    quarter,
    statusLabel: statusLabelFrom(statusRaw),
    badgeClass: statusBadgeClass(statusRaw),
  };
}

/**
 * 수강 정보 → UI 형태로 정규화
 * 서버 응답 예시: { id, employee: { emp_no, name }, progress, status }
 */
function normalizeEnrollment(item) {
  const employee =
    item.employee ?? item.user ?? item.trainee ?? item.member ?? item.account ?? {};
  const employeeId =
    employee.emp_no ??
    employee.employee_id ??
    employee.id ??
    item.employee_id ??
    item.emp_no ??
    item.id ??
    "";
  const name = employee.name ?? item.name ?? "이름없음";
  const progressRaw =
    item.progress ??
    item.completion ??
    item.percent ??
    item.progress_percent ??
    (typeof item.completed_ratio === "number" ? item.completed_ratio * 100 : 0);
  const progress = Math.round(Math.max(0, Math.min(100, Number(progressRaw) || 0)));
  const statusRaw = (item.status ?? item.state ?? "").toString().toLowerCase();

  let statusKey = "not_started";
  if (progress >= 100 || statusRaw.includes("complete") || statusRaw.includes("완료")) statusKey = "completed";
  else if (progress > 0 || statusRaw.includes("progress") || statusRaw.includes("진행")) statusKey = "in_progress";

  const statusLabelMap = {
    completed: "완료",
    in_progress: "교육중",
    not_started: "미완료",
  };
  const statusColorMap = {
    completed: "bg-emerald-500",
    in_progress: "bg-amber-400",
    not_started: "bg-rose-400",
  };

  return {
    id: item.id ?? item.enrollment_id ?? `${employeeId}-${Math.random().toString(16).slice(2)}`,
    employeeId: employeeId ? String(employeeId) : "-",
    name,
    dept: employee.dept ?? employee.department ?? "",
    statusKey,
    statusLabel: statusLabelMap[statusKey] ?? statusLabelFrom(statusRaw),
    statusColor: statusColorMap[statusKey] ?? "bg-slate-400",
    progress,
  };
}

/**
 * 분기별 그룹 구성
 */
function buildQuarterSections(courses) {
  const groups = new Map();
  for (const course of courses) {
    const key = course.quarter;
    if (!groups.has(key)) {
      groups.set(key, {
        name: `${course.quarter}분기`,
        items: [],
      });
    }
    groups.get(key).items.push({
      id: course.id,
      title: course.title,
      statusLabel: course.statusLabel,
      badgeClass: course.badgeClass,
    });
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => value);
}

/**
 * 완료/진행/미완료 비율을 백분율로 변환
 */
function buildRateDistribution(counts) {
  const total = counts.completed + counts.in_progress + counts.not_started;
  if (!total) return [];

  const raw = [
    { key: "completed", label: "완료", color: "#34d399", value: (counts.completed / total) * 100 },
    { key: "in_progress", label: "교육중", color: "#facc15", value: (counts.in_progress / total) * 100 },
    { key: "not_started", label: "미완료", color: "#f87171", value: (counts.not_started / total) * 100 },
  ];

  const rounded = raw.map((entry) => ({
    ...entry,
    value: Math.round(entry.value),
  }));

  const diff = 100 - rounded.reduce((acc, item) => acc + item.value, 0);
  if (rounded.length && diff !== 0) {
    let lastIndex = rounded.length - 1;
    for (let i = rounded.length - 1; i >= 0; i -= 1) {
      if (rounded[i].value > 0) {
        lastIndex = i;
        break;
      }
    }
    rounded[lastIndex] = {
      ...rounded[lastIndex],
      value: Math.max(0, rounded[lastIndex].value + diff),
    };
  }

  return rounded;
}

export default function Home() {
  const [quarterSections, setQuarterSections] = useState([]);
  const [statusCards, setStatusCards] = useState([]);
  const [rateDistribution, setRateDistribution] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [tableCourseTitle, setTableCourseTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        // 1) 교육 과정 목록 조회
        //    실제 API 엔드포인트로 변경하세요. (예: GET /api/courses/courses/?year=2025)
        //    예상 응답 형식: [{ id, title, year, quarter, status }, ...]
        const courseRes = await apiFetch("/courses/courses/", {
          method: "GET",
          auth: true,
        });
        const courseList = Array.isArray(courseRes)
          ? courseRes
          : Array.isArray(courseRes?.results)
          ? courseRes.results
          : [];
        const normalizedCourses = courseList.map(normalizeCourse);

        if (!ignore) {
          setQuarterSections(buildQuarterSections(normalizedCourses));
        }

        // 2) 수강 현황 요약/상세 데이터 조회
        //    - 전체 대시보드 요약 API가 있다면 그 응답을 사용하세요.
        //    - 예: GET /api/dashboard/overview → { status_cards: [...], rate_summary: {...}, enrollments: [...] }
        //    현재 구현은 "첫 번째 과정"에 대한 수강자 목록으로 예시를 구성합니다.
        const primaryCourse = normalizedCourses[0];
        if (!primaryCourse) {
          if (!ignore) {
            setStatusCards([]);
            setRateDistribution([]);
            setTableRows([]);
            setTableCourseTitle("");
          }
          return;
        }

        let enrollmentRaw = [];
        try {
          // 기본 시도: /courses/enrollments?course_id=ID
          enrollmentRaw = await apiFetch(`/courses/enrollments?course_id=${primaryCourse.id}`, {
            method: "GET",
            auth: true,
          });
        } catch (firstError) {
          try {
            // 대체 경로: /courses/courses/{id}/enrollments
            enrollmentRaw = await apiFetch(`/courses/courses/${primaryCourse.id}/enrollments`, {
              method: "GET",
              auth: true,
            });
          } catch (secondError) {
            console.error("대시보드 수강자 조회 실패", secondError);
            enrollmentRaw = [];
          }
        }

        const enrollmentList = Array.isArray(enrollmentRaw)
          ? enrollmentRaw
          : Array.isArray(enrollmentRaw?.results)
          ? enrollmentRaw.results
          : [];

        const normalizedEnrollments = enrollmentList.map(normalizeEnrollment);

        const counts = normalizedEnrollments.reduce(
          (acc, curr) => {
            acc[curr.statusKey] = (acc[curr.statusKey] || 0) + 1;
            return acc;
          },
          { completed: 0, in_progress: 0, not_started: 0 },
        );

        const total = counts.completed + counts.in_progress + counts.not_started;

        if (!ignore) {
          setStatusCards([
            {
              title: "완료 인원",
              figure: `${counts.completed}명`,
              description: total ? `전체 ${total}명 중 완료` : "대상자 없음",
              tone: "from-emerald-100 to-emerald-200 text-emerald-700",
            },
            {
              title: "미완료 인원",
              figure: `${counts.not_started}명`,
              description: total ? `추가 학습 필요` : "대상자 없음",
              tone: "from-rose-100 to-rose-200 text-rose-700",
            },
            {
              title: "진행 중 과정",
              figure: `${counts.in_progress}명`,
              description: total ? `현재 교육 참여 중` : "대상자 없음",
              tone: "from-indigo-100 to-indigo-200 text-indigo-700",
            },
          ]);

          setRateDistribution(buildRateDistribution(counts));
          setTableRows(normalizedEnrollments);
          setTableCourseTitle(primaryCourse.title);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setError("대시보드 데이터를 불러오는 중 문제가 발생했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const chartBackground = useMemo(() => {
    if (!rateDistribution.length) {
      return "conic-gradient(#e2e8f0 0% 100%)";
    }
    let cursor = 0;
    const segments = rateDistribution.map((item) => {
      const start = cursor;
      cursor += Number(item.value) || 0;
      return `${item.color} ${start}% ${Math.min(100, cursor)}%`;
    });
    if (cursor < 100) {
      segments.push(`#e2e8f0 ${cursor}% 100%`);
    }
    return `conic-gradient(${segments.join(", ")})`;
  }, [rateDistribution]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">안전 · 교육 대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">이번 분기의 교육 일정과 수강 현황을 한 눈에 확인하세요.</p>
        </div>
        <Link
          to="/progress"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm shadow border border-slate-200 hover:bg-slate-100"
        >
          수강현황보기
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-[32px] bg-gradient-to-br from-sky-100 via-rose-100 to-indigo-100 p-6 sm:p-8 shadow-xl space-y-8">
        {loading && (
          <div className="text-sm text-slate-600 bg-white/70 border border-white/50 rounded-2xl px-4 py-3 shadow-sm">
            대시보드 데이터를 불러오는 중입니다…
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-4">
          <section className="space-y-5 xl:col-span-2">
            <h2 className="text-base font-semibold text-slate-800">교육 일정</h2>
            <div className="space-y-4">
              {quarterSections.length === 0 ? (
                <div className="rounded-2xl bg-white/60 p-5 text-sm text-slate-500">
                  등록된 교육 일정이 없습니다. <br />
                  {/* TODO: 다른 연도의 일정을 보여주려면 API 요청 파라미터(year 등)를 조정하세요. */}
                </div>
              ) : (
                quarterSections.map((quarter) => (
                  <div key={quarter.name} className="rounded-2xl bg-white/70 shadow-sm p-4 sm:p-5 space-y-3">
                    <div className="text-sm font-semibold text-slate-600">{quarter.name}</div>
                    <div className="grid gap-3">
                      {quarter.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="font-medium text-slate-800">{item.title}</div>
                          <div
                            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full ${item.badgeClass}`}
                          >
                            {item.statusLabel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="xl:col-span-1 rounded-2xl bg-white/70 shadow-sm p-5 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">전체 교육 이수율</h2>
              <p className="text-xs text-slate-500 mt-1">
                {/* TODO: 다른 기준(예: 특정 기간)을 사용하려면 rateDistribution 계산 구간을 수정하세요. */}
                최근 데이터 기준
              </p>
            </div>
            <div className="flex flex-col items-center gap-5">
              <div className="h-40 w-40 rounded-full shadow-inner" style={{ background: chartBackground }} />
              <div className="grid gap-2 text-xs text-slate-600 w-full">
                {rateDistribution.length === 0 ? (
                  <div className="text-slate-500">표시할 이수율 정보가 없습니다.</div>
                ) : (
                  rateDistribution.map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-medium text-slate-800">{item.value}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="xl:col-span-1 grid gap-4">
            {statusCards.length === 0 ? (
              <div className="rounded-2xl bg-white/70 border border-white/40 p-4 text-sm text-slate-500 shadow-sm">
                수강자 통계가 없습니다.
                <br />
                {/* TODO: 상태 카드가 별도 API에서 내려오면 setStatusCards 호출 구간을 수정하세요. */}
              </div>
            ) : (
              statusCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl bg-gradient-to-br ${card.tone} p-4 shadow-sm border border-white/40`}
                >
                  <div className="text-sm font-semibold">{card.title}</div>
                  <div className="text-2xl font-bold mt-2">{card.figure}</div>
                  <div className="text-xs mt-2">{card.description}</div>
                </div>
              ))
            )}
          </section>
        </div>

        <section className="rounded-2xl bg-white/75 shadow-sm border border-white/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/60">
            <div>
              <div className="text-base font-semibold text-slate-800">실시간 수강 현황</div>
              <div className="text-xs text-slate-500 mt-1">
                {tableCourseTitle ? `${tableCourseTitle} 과정 대상` : "표시할 과정이 없습니다."}
              </div>
            </div>
            <Link to="/progress" className="text-xs text-slate-500 hover:text-slate-700">
              대시보드 보기
            </Link>
          </div>
          <div className="overflow-x-auto">
            {tableRows.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 text-sm text-slate-500">표시할 수강자 정보가 없습니다.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/60 text-left text-slate-500">
                  <tr>
                    <th className="py-3 px-4 sm:px-6 font-medium">사번</th>
                    <th className="py-3 px-4 sm:px-6 font-medium">이름</th>
                    <th className="py-3 px-4 sm:px-6 font-medium">상태</th>
                    <th className="py-3 px-4 sm:px-6 font-medium text-right">수강률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.slice(0, 8).map((row) => (
                    <tr key={row.id} className="bg-white/60 hover:bg-white/80 transition">
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-700">{row.employeeId}</td>
                      <td className="py-3 px-4 sm:px-6 text-slate-600">{row.name}</td>
                      <td className="py-3 px-4 sm:px-6">
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                          <span className={`h-2.5 w-2.5 rounded-full ${row.statusColor}`} />
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right font-semibold text-slate-800">
                        {row.progress}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/schedule"
            className="rounded-2xl bg-white/70 border border-white/40 px-4 py-3 hover:bg-white/90 transition shadow-sm"
          >
            <div className="text-xs text-slate-500">바로가기</div>
            <div className="text-base font-semibold text-slate-800 mt-1">교육 일정 편집</div>
            <div className="text-xs text-slate-500 mt-2">분기별 교육 프로그램 수정</div>
          </Link>
          <Link
            to="/upload"
            className="rounded-2xl bg-white/70 border border-white/40 px-4 py-3 hover:bg-white/90 transition shadow-sm"
          >
            <div className="text-xs text-slate-500">바로가기</div>
            <div className="text-base font-semibold text-slate-800 mt-1">사원 데이터 업로드</div>
            <div className="text-xs text-slate-500 mt-2">엑셀 파일로 인원 관리</div>
          </Link>
          <Link
            to="/enroll"
            className="rounded-2xl bg-white/70 border border-white/40 px-4 py-3 hover:bg-white/90 transition shadow-sm"
          >
            <div className="text-xs text-slate-500">바로가기</div>
            <div className="text-base font-semibold text-slate-800 mt-1">과정별 수강자 등록</div>
            <div className="text-xs text-slate-500 mt-2">여러 사원을 한 번에 등록</div>
          </Link>
          <Link
            to="/progress"
            className="rounded-2xl bg-white/70 border border-white/40 px-4 py-3 hover:bg-white/90 transition shadow-sm"
          >
            <div className="text-xs text-slate-500">바로가기</div>
            <div className="text-base font-semibold text-slate-800 mt-1">수강 현황 리포트</div>
            <div className="text-xs text-slate-500 mt-2">진행률·미이수 상태 확인</div>
          </Link>
        </section>
      </div>
    </div>
  );
}
