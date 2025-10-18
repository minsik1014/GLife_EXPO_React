import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo } from "react";

const NAV_ITEMS = [
  { to: "/home", label: "Dashboard" },
  { to: "/schedule", label: "Schedule" },
  { to: "/upload", label: "Upload Excel" },
  { to: "/enroll", label: "Enrollments" },
  { to: "/progress", label: "Progress" },
];

function navClassName(isActive) {
  return [
    "flex items-center gap-3 px-4 py-2 rounded-xl transition",
    isActive ? "bg-white/15 text-white font-medium" : "text-white/70 hover:text-white hover:bg-white/10",
  ].join(" ");
}

export default function AppLayout() {
  const location = useLocation();
  const current = useMemo(
    () => NAV_ITEMS.find((item) => location.pathname.startsWith(item.to)),
    [location.pathname],
  );

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:z-40 w-64 shrink-0 bg-slate-900 text-white px-6 py-8 flex-col gap-8 overflow-y-auto">
        <NavLink to="/home" className="flex items-center gap-3 group transition hover:text-white">
          <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-semibold group-hover:bg-white/20">
            GL
          </div>
          <div>
            <div className="text-sm text-white/60 group-hover:text-white/80">안전·교육 관리</div>
            <div className="text-lg font-semibold">GLife Dashboard</div>
          </div>
        </NavLink>

        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navClassName(isActive)}>
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto text-xs text-white/40 space-y-1">
          <div>© {new Date().getFullYear()} GLife</div>
          <div>산업안전 교육 관리 플랫폼</div>
        </div>
      </aside>

      <div className="lg:hidden fixed inset-x-4 top-4 z-50">
        <div className="rounded-2xl bg-slate-900/95 backdrop-blur px-4 py-3 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <NavLink to="/home" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-white/10 flex items-center justify-center text-base font-semibold">
                GL
              </div>
              <div>
                <div className="text-xs text-white/50">GLife</div>
                <div className="text-sm font-medium text-white">안전·교육 관리</div>
              </div>
            </NavLink>
            <NavLink to="/home" className="text-xs text-white/60 hover:text-white">
              홈으로
            </NavLink>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "text-xs px-3 py-1.5 rounded-lg border border-white/10 transition",
                    isActive ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-screen bg-slate-100 lg:ml-64 pt-20 lg:pt-0">
        <header className="hidden lg:flex items-center justify-between px-10 py-6 bg-slate-900/5 backdrop-blur">
          <div>
            <div className="text-sm text-slate-500">안전 교육 현황</div>
            <div className="text-2xl font-semibold text-slate-800">{current?.label ?? "Dashboard"}</div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
            onClick={() => {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              window.location.href = "/login";
            }}
          >
            로그아웃
          </button>
        </header>

        <main className="relative z-0 px-4 sm:px-6 md:px-10 py-6 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
