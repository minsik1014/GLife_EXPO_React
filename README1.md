# GLife API 명세서

## 1. 인증 (Authentication)

본 API는 두 가지 종류의 엔드포인트 그룹이 있으며, 각각 다른 인증 정책을 가집니다.

### 1.1. 웹 대시보드 API
- **대상:** `/api/organizations/`, `/api/courses/`, `/api/enrollments/` 등 회사 관리자가 사용하는 API
- **방식:** **JWT 인증**이 필요합니다. 로그인 API를 통해 발급받은 Access Token을 모든 요청의 헤더에 포함해야 합니다.
- **Header:** `Authorization: Bearer <your_jwt_access_token>`

### 1.2. AI 평가 API
- **대상:** `/api/ai/` 하위의 모든 API
- **방식:** 현재는 전시용으로 단일 회사만 사용한다고 가정하므로, 별도의 **인증이 필요 없습니다.**

---

## 2. Organizations (회사 & 직원)

### 2.1. 회사 로그인
- **Endpoint:** `POST /api/organizations/login/`
- **설명:** 사업자등록번호와 비밀번호로 로그인하여 JWT(Access Token, Refresh Token)를 발급받습니다.
- **인증:** 필요 없음
- **요청 본문 (Request Body):**
  ```json
  {
      "biz_no": "0123456789",
      "password": "sms"
  }
  ```
- **성공 응답 (Success Response `200 OK`):**
  ```json
  {
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "company": {
          "biz_no": "0123456789",
          "name": "테스트 회사"
      }
  }
  ```

### 2.2. Access Token 재발급
- **Endpoint:** `POST /api/organizations/refresh/`
- **설명:** 만료된 Access Token을 재발급 받기 위해 Refresh Token을 사용합니다.
- **인증:** 필요 없음
- **요청 본문 (Request Body):**
  ```json
  {
      "refresh": "저장해두었던_리프레시_토큰"
  }
  ```
- **성공 응답 (Success Response `200 OK`):**
  ```json
  {
      "access": "새로_발급된_액세스_토큰"
  }
  ```

### 2.3. 직원 목록 조회 및 생성
- **Endpoint:** `GET, POST /api/organizations/employees/`
- **설명:** `GET`으로 회사 전체 직원 목록을 조회하거나, `POST`로 새 직원을 등록합니다.
- **인증:** JWT 인증 필요
- **쿼리 파라미터 (Query Parameters for `GET`):**
  - `emp_no` (optional): 특정 사원번호로 직원을 필터링합니다. (예: `?emp_no=EMP001`)
  - `name` (optional): 특정 이름을 포함하는 직원을 필터링합니다. (예: `?name=홍길동`)
- **`POST` 요청 본문 (Request Body):**
  ```json
  {
      "emp_no": "EMP001",
      "name": "홍길동",
      "dept": "개발팀",
      "phone": "010-1234-5678",
      "email": "gildong@example.com"
  }
  ```
- **`POST` 성공 응답 (Success Response `201 Created`):**
  ```json
  {
      "id": 1,
      "emp_no": "EMP001",
      "name": "홍길동",
      "dept": "개발팀",
      "phone": "010-1234-5678",
      "email": "gildong@example.com",
      "company": 1
  }
  ```

### 2.4. 직원 정보 상세 조회, 수정, 삭제
- **Endpoint:** `GET, PUT, DELETE /api/organizations/employees/{id}/`
- **설명:** 특정 `id`를 가진 직원의 정보를 조회, 수정, 삭제합니다.
- **인증:** JWT 인증 필요

### 2.5. 직원 대량 등록
- **Endpoint:** `POST /api/organizations/employees/bulk/`
- **설명:** JSON 배열 형태로 여러 직원을 한 번에 등록하거나 업데이트합니다.
- **인증:** JWT 인증 필요
- **요청 본문 (Request Body):**
  ```json
  {
      "employees": [
          {
              "emp_no": "EMP002",
              "name": "이순신",
              "dept": "전략기획팀"
          },
          {
              "emp_no": "EMP003",
              "name": "강감찬",
              "dept": "디자인팀",
              "email": "gamchan@example.com"
          }
      ]
  }
  ```
- **성공 응답 (Success Response `200 OK`):**
  ```json
  {
      "message": "직원 정보 대량 처리가 완료되었습니다.",
      "created": 2,
      "updated": 0
  }
  ```

---

## 3. Courses (교육 과정)

**참고:** 현재 URL 구조상 교육 과정 관련 API는 모두 `/api/courses/courses/` 경로로 시작합니다.

### 3.1. 교육 과정 목록 조회 및 생성
- **Endpoint:** `GET, POST /api/courses/courses/`
- **설명:** `GET`으로 회사의 모든 교육 과정을 조회하고, `POST`로 새 과정을 생성합니다.
- **인증:** JWT 인증 필요
- **`POST` 요청 본문 (Request Body):**
  ```json
  {
      "title": "2025년 3분기 정기 안전 교육",
      "description": "화학 물질 취급 및 보관에 대한 안전 수칙 교육",
      "year": 2025,
      "quarter": 3
  }
  ```
- **`POST` 성공 응답 (Success Response `201 Created`):**
  ```json
  {
      "id": 1,
      "title": "2025년 3분기 정기 안전 교육",
      "description": "화학 물질 취급 및 보관에 대한 안전 수칙 교육",
      "company": 1,
      "created_at": "2025-10-08T12:00:00Z",
      "year": 2025,
      "quarter": 3
  }
  ```

### 3.2. 교육 과정 상세 조회, 수정, 삭제
- **Endpoint:** `GET, PUT, DELETE /api/courses/courses/{id}/`
- **설명:** 특정 `id`를 가진 교육 과정의 정보를 조회, 수정, 삭제합니다.
- **인증:** JWT 인증 필요

### 3.3. 과정별 대량 수강 등록
- **Endpoint:** `POST /api/courses/courses/{id}/enroll/`
- **설명:** 특정 교육 과정(`id`)에 여러 직원을 한 번에 수강 등록하거나, 기존 수강 상태를 업데이트합니다.
- **인증:** JWT 인증 필요
- **요청 본문 (Request Body):**
  ```json
  {
      "employee_ids": [15, 23, 42],
      "status": "enrolled"
  }
  ```
- **성공 응답 (Success Response `200 OK`):**
  ```json
  {
      "message": "대량 수강 신청 처리가 완료되었습니다.",
      "course_title": "2025년 3분기 정기 안전 교육",
      "created": 3,
      "updated": 0
  }
  ```

---

## 4. Enrollments (수강 신청)

### 4.1. 수강 신청 목록 조회 및 생성
- **Endpoint:** `GET, POST /api/enrollments/`
- **설명:** `GET`으로 회사의 모든 수강 신청 내역을 조회하고, `POST`로 직원을 특정 과정에 등록합니다.
- **인증:** JWT 인증 필요
- **`POST` 요청 본문 (Request Body):**
  ```json
  {
      "employee": 1,
      "course": 1,
      "status": "enrolled"
  }
  ```
- **`POST` 성공 응답 (Success Response `201 Created`):**
  ```json
  {
      "id": 1,
      "employee": 1,
      "course": 1,
      "enrolled_at": "2025-10-08T13:00:00Z",
      "status": "enrolled"
  }
  ```

### 4.2. 수강 신청 상세 조회, 수정, 삭제
- **Endpoint:** `GET, PUT, DELETE /api/enrollments/{id}/`
- **설명:** 특정 `id`를 가진 수강 신청 정보를 조회, 수정, 삭제합니다.
- **인증:** JWT 인증 필요

---

## 5. AI (동작 인식 & 평가)

### 5.1. 동작 유형 목록 조회 및 생성
- **Endpoint:** `GET, POST /api/ai/motion-types/`
- **설명:** 평가할 동작의 종류(`MotionType`)를 조회하거나 새로 등록합니다.
- **인증:** 필요 없음
- **`POST` 요청 본문 (Request Body):**
  ```json
  {
      "motionType": "fire_extinguisher_lift",
      "description": "소화기 들기 동작"
  }
  ```

### 5.2. 기준 동작 데이터 등록
- **Endpoint:** `POST /api/ai/recordings/`
- **설명:** AI 평가의 기준이 되는 모범(`reference`) 동작 또는 0점(`zero_score`) 동작의 센서 데이터를 등록합니다. 이 API가 호출될 때마다 점수 산출의 기준이 되는 `max_dtw_distance`가 자동으로 재계산될 수 있습니다.
- **인증:** 필요 없음
- **요청 본문 (Request Body):**
  ```json
  {
      "motionName": "fire_extinguisher_lift",
      "scoreCategory": "reference",
      "sensorData": [
          {"flex1": 10.0, "gyro_x": -0.5, "..."},
          {"flex1": 12.0, "gyro_x": -0.6, "..."}
      ]
  }
  ```

### 5.3. 사용자 동작 평가
- **Endpoint:** `POST /api/ai/evaluate/`
- **설명:** Unity 클라이언트로부터 받은 센서 데이터를 실시간으로 평가하여 점수를 반환합니다. 백엔드는 내부적으로 미리 지정된 회사 소속의 직원으로 간주하여 평가를 진행합니다.
- **인증:** 필요 없음
- **요청 본문 (Request Body):**
  ```json
  {
      "motionName": "fire_extinguisher_lift",
      "empNo": "EMP001",
      "sensorData": [
          {"flex1": 10.5, "gyro_x": -0.5, "..."},
          {"flex1": 12.1, "gyro_x": -0.6, "..."}
      ]
  }
  ```
- **성공 응답 (Success Response `200 OK`):**
  ```json
  {
      "ok": true,
      "detail": "평가가 완료되었습니다.",
      "evaluation": {
          "evaluator_motion_name": "fire_extinguisher_lift",
          "score": 87.5,
          "avg_dtw_distance": 150.45,
          "normalized_distance": 0.125
      }
  }
  ```