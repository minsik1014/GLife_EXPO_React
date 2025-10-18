
# GLife_EXPO_React 프로젝트 상세 요약

GLife_EXPO_React는 산업안전 교육 관리 플랫폼으로, 기업의 교육 일정, 수강생 등록, 진도 관리, 사원 데이터 업로드 등 다양한 기능을 제공합니다. React와 Vite 기반의 SPA로, 직관적인 UI와 효율적인 데이터 흐름을 갖추고 있습니다.

## 주요 기능 및 페이지 역할

- **대시보드(Home)**: 전체 교육 일정, 분기별 프로그램, 수강 현황, 이수율, 통계 카드, 실시간 수강자 테이블을 한눈에 제공합니다.
- **로그인(Login)**: 사업자번호와 비밀번호 기반 JWT 인증. 토큰 저장 및 자동 만료/재발급 처리.
- **교육 일정 관리(Schedule)**: 연도/분기별 교육 프로그램 등록, 수정, 상태(예정/진행/완료) 관리. 모달 UI로 일정 추가/편집.
- **수강생 등록(Enrollments)**: 과정별로 여러 사원을 한 번에 등록. 행 추가/삭제, 입력값 검증, 등록 결과 메시지 제공.
- **진도 현황(CourseProgress)**: 과정별 수강생의 진도율, 상태(완료/진행/미완료) 표시. 상세 정보 및 평가 내역 조회.
- **엑셀 업로드(UploadExcel)**: 사원 정보를 엑셀 파일로 대량 업로드. 필수 컬럼 체크, 업로드 결과 메시지, 템플릿 다운로드 지원.

## 인증 및 보안
- JWT 기반 인증(사업자번호/비밀번호)
- 토큰 만료 시 자동 재발급 및 로그인 페이지로 리다이렉트
- 보호된 라우트(ProtectedRoute)로 인증된 사용자만 주요 기능 접근 가능

## 데이터 흐름
- 모든 API 통신은 `src/lib/http.js`의 래퍼 함수(apiFetch)로 처리
- 토큰 만료/재발급, 에러 핸들링, 로딩 상태 관리 등 공통 로직 내장
- 주요 엔드포인트 예시:
	- `/courses/courses/` : 교육 과정 목록
	- `/enrollments/?course={id}` : 과정별 수강생 현황
	- `/organizations/employees/bulk/` : 사원 엑셀 업로드
	- `/organizations/login/` : 로그인

## 폴더 구조 및 컴포넌트
- `src/components/AppLayout.jsx` : 전체 레이아웃, 사이드바/헤더/로그아웃
- `src/components/ProtectedRoute.jsx` : 인증 라우트 보호
- `src/pages/` : 각 기능별 페이지(Home, Login, Schedule, Enrollments, CourseProgress, UploadExcel)
- `src/lib/auth.js` : 로그인/로그아웃, 토큰 관리
- `src/lib/http.js` : API 통신, 토큰 재발급, 에러 처리
- `public/` : 정적 파일, 엑셀 템플릿 등

## 기술 스택 및 주요 라이브러리
- React 19, Vite, React Router
- TailwindCSS (스타일링)
- Axios, XLSX (엑셀 처리)
- ESLint, @tanstack/react-query, FullCalendar 등

## 사용법
1. 의존성 설치: `npm install`
2. 개발 서버 실행: `npm run dev`
3. 브라우저에서 `http://localhost:5173` 접속
4. 사업자번호(10자리)와 비밀번호로 로그인

## 기타
- 모든 주요 기능은 사이드바에서 바로 접근 가능
- 분기별 교육 일정, 실시간 수강 현황, 대시보드 통계 등 기업 교육 관리에 최적화
- 자세한 API 명세 및 커스텀 기능은 코드 내 주석 참고

---
자세한 내용과 API 명세는 `README.md` 및 각 소스 파일의 주석을 참고하세요.