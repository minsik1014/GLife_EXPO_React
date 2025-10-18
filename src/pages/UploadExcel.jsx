import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";

const API = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.1.102:8000"}`;
const REQUIRED = ["emp_no","name","dept","phone","email"]; // 필수 헤더


export default function UploadExcel(){
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState("");
  const [success, setSuccess] = useState("");

  // 파일 선택
  const onFileChange = (e) => {
    setErr(""); setSuccess(""); setRows([]);
    const f = e.target.files?.[0] || null;
    setFile(f);
    setFileName(f?.name || "");
  };

  // 파싱
  useEffect(() => {
    if (!file) return;
    let canceled = false;

    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const wb  = XLSX.read(buf, { type: "array" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

        if (canceled) return;
        if (json.length === 0) return setErr("시트에 데이터가 없습니다.");

        const headers = Object.keys(json[0]);
        const missing = REQUIRED.filter(h => !headers.includes(h));
        if (missing.length) return setErr(`필수 컬럼 누락: ${missing.join(", ")}`);

        setRows(json);
      } catch {
        if (!canceled) setErr("엑셀을 읽는 중 오류가 발생했습니다.");
      }
    })();

    return () => { canceled = true; };
  }, [file]);

  // 서버 업로드
  const upload = async () => {
    if (rows.length === 0) return setErr("업로드할 데이터가 없습니다.");
    setErr(""); setSuccess(""); setLoading(true);
    console.log(rows)
    try {
      // ❗ 백엔드 업로드 엔드포인트/바디에 맞게 수정하세요.
      // 예: POST /api/employees/upload/  body: { employees: [...] }
      if(!localStorage.getItem("token")){
        setErr("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      const res = await axios.post(
        `${API}/organizations/employees/bulk/`,
        { employees: rows },
        {
          withCredentials: true,
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
          timeout: 30000,
        }
      );
      setSuccess(res?.data?.message || "업로드가 완료되었습니다.");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || "업로드에 실패했습니다.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setFile(null); setFileName(""); setRows([]); setErr(""); setSuccess("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">사원 엑셀 업로드</h2>
          <p className="text-sm text-gray-500 mt-1">
            헤더는{" "}
            <code className="bg-gray-100 rounded px-2 py-0.5">
              emp_no, name, dept, phone, email
            </code>{" "}
            형식이어야 합니다.
          </p>
        </div>
        <a className="text-sm underline" href="/employee_upload_template.xlsx" download>
          템플릿 받기
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <label
          htmlFor="excel-upload-input"
          className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-sm transition ${
            fileName ? "border-gray-400 bg-gray-50" : "border-gray-200 hover:border-gray-400"
          }`}
        >
          <span className="text-gray-600 font-medium">
            {fileName ? "파일이 선택되었습니다." : "엑셀 파일을 선택하세요"}
          </span>
          <span className="rounded-full bg-gray-900 px-4 py-1 text-xs font-semibold text-white">
            파일 선택
          </span>
          <span className="text-xs text-gray-500">
            지원 형식: .xlsx, .xls
          </span>
          {fileName && (
            <span className="mt-2 text-xs text-gray-500">
              현재 파일: {fileName}
            </span>
          )}
        </label>
        <input
          id="excel-upload-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileChange}
          className="sr-only"
        />

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
        )}
        {success && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">{success}</div>
        )}

        {rows.length > 0 && (
          <>
            <div className="mt-4 text-sm text-gray-600">
              미리보기 ({rows.length}행) — 최대 50행 표시
            </div>
            <div className="overflow-auto mt-2 border rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {REQUIRED.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t">
                      {REQUIRED.map(h => (
                        <td key={h} className="px-3 py-2">{String(r[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={upload}
                disabled={loading}
                className="px-4 py-2 rounded-xl border bg-gray-900 text-white hover:bg-black disabled:opacity-60"
              >
                {loading ? "업로드 중..." : "서버로 업로드"}
              </button>
              <button onClick={resetAll} className="px-4 py-2 rounded-xl border">초기화</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
