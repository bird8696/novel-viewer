# 📖 소설 뷰어

> TXT 파일을 편하게 읽는 웹 기반 소설 뷰어.  
> 기기 간 읽기 위치 자동 동기화, 북마크, 메모, 하이라이트, TTS 지원.

<br>

## ✨ 주요 기능

- **TXT 파일 업로드** — 드래그 앤 드롭, UTF-8 / EUC-KR 자동 감지
- **챕터 자동 파싱** — N화, 제N장 등 다양한 패턴 자동 인식, 목차 사이드바 생성
- **기기 간 동기화** — Google 로그인 시 폰 ↔ PC 읽기 위치 자동 동기화
- **3가지 테마** — 다크 / 라이트 / 세피아 (상단바 버튼으로 즉시 전환)
- **읽기 설정** — 글꼴, 글자 크기, 줄간격, 텍스트 너비 실시간 조절
- **북마크** — B키로 추가, 기기 간 공유, 클릭으로 바로 이동
- **텍스트 검색** — Ctrl+F, 실시간 하이라이트, 이전/다음 이동
- **하이라이트 & 메모** — 드래그로 형광펜 (4색), 메모 달기, 우클릭 삭제
- **TTS 읽어주기** — 음성 선택, 속도 조절, 읽는 위치 자동 스크롤
- **PWA 지원** — 홈화면 추가, 오프라인 캐시
- **반응형** — 모바일 / 태블릿 / 데스크탑 전부 지원

<br>

## 🛠 기술 스택

| 분류         | 기술                                   |
| ------------ | -------------------------------------- |
| 프론트엔드   | Vanilla JS, HTML5, CSS3                |
| 인증         | Firebase Authentication (Google OAuth) |
| 데이터베이스 | Cloud Firestore                        |
| 호스팅       | Firebase Hosting                       |
| PWA          | Service Worker, Web App Manifest       |
| TTS          | Web Speech API                         |
| 빌드 도구    | 없음 (단일 HTML)                       |

<br>

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/bird8696/novel-viewer.git
cd novel-viewer
```

### 2. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication → Google 로그인 활성화
3. Authentication → 설정 → 승인된 도메인에 `127.0.0.1` 추가 (로컬 개발용)
4. Firestore Database 생성
5. 프로젝트 설정 → 웹 앱 추가 → SDK 설정 복사

### 3. Firebase 설정 파일 생성

```bash
cp src/js/firebase-config.example.js src/js/firebase-config.js
```

`src/js/firebase-config.js` 를 열고 Firebase 콘솔에서 복사한 값으로 교체:

```js
export const firebaseConfig = {
  apiKey: "실제-API-KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxx",
};
```

> ⚠️ `firebase-config.js` 는 `.gitignore` 에 포함되어 있어 GitHub에 올라가지 않아요.

### 4. Firestore 보안 규칙 배포

```bash
firebase login
firebase init   # Firestore + Hosting 선택
firebase deploy --only firestore:rules
```

### 5. 로컬 실행

```bash
# VS Code Live Server 확장 사용 (추천)
# 또는
npx serve .
```

<br>

## 📁 프로젝트 구조

```
novel-viewer/
├── docs/
│   └── PLAN.html                    # 프로젝트 계획서
├── src/
│   ├── js/
│   │   ├── firebase.js              # Firebase 초기화 · Auth
│   │   ├── firebase-config.js       # 실제 키 (gitignore)
│   │   ├── firebase-config.example.js  # 설정 템플릿
│   │   ├── parser.js                # TXT 파일 파싱 · 챕터 분리
│   │   ├── viewer.js                # 렌더링 · 스크롤 · 진행률
│   │   ├── sync.js                  # Firestore 동기화
│   │   ├── bookmark.js              # 북마크 관리
│   │   ├── highlight.js             # 하이라이트 · 메모
│   │   ├── search.js                # 텍스트 검색
│   │   ├── tts.js                   # TTS 읽어주기
│   │   └── settings.js              # 테마 · 폰트 설정
│   ├── css/
│   │   ├── base.css                 # 리셋 · 변수
│   │   ├── layout.css               # 반응형 레이아웃
│   │   ├── themes.css               # 다크 · 라이트 · 세피아
│   │   └── components.css           # UI 컴포넌트
│   └── assets/
│       ├── icon-192.png             # PWA 아이콘
│       └── icon-512.png             # PWA 아이콘
├── index.html                       # 메인 진입점
├── manifest.json                    # PWA 설정
├── sw.js                            # Service Worker
├── firebase.json                    # Firebase 호스팅 설정
├── .firebaserc                      # Firebase 프로젝트 ID
├── firestore.rules                  # DB 보안 규칙
├── firestore.indexes.json           # Firestore 인덱스
└── README.md
```

<br>

## 📋 개발 현황

### Phase 0 — Firebase 셋업

| 기능                             | 상태    |
| -------------------------------- | ------- |
| Google OAuth 로그인              | ✅ 완료 |
| Firestore DB 연동                | ✅ 완료 |
| 보안 규칙 배포                   | ✅ 완료 |
| 비로그인 fallback (localStorage) | ✅ 완료 |

### Phase 1 — 뷰어 기반

| 기능                             | 상태    |
| -------------------------------- | ------- |
| TXT 업로드 (드래그 앤 드롭)      | ✅ 완료 |
| UTF-8 / EUC-KR 인코딩 자동 감지  | ✅ 완료 |
| 챕터 자동 파싱 (N화, 제N장 등)   | ✅ 완료 |
| 목차 사이드바                    | ✅ 완료 |
| 다크 / 라이트 / 세피아 테마      | ✅ 완료 |
| 글꼴 · 크기 · 줄간격 · 너비 설정 | ✅ 완료 |
| 설정 초기화 버튼                 | ✅ 완료 |
| 읽기 진행률 바                   | ✅ 완료 |

### Phase 2 — 읽기 편의 기능

| 기능                                  | 상태    |
| ------------------------------------- | ------- |
| 기기 간 읽기 위치 동기화              | ✅ 완료 |
| 이어읽기 팝업                         | ✅ 완료 |
| 북마크 (추가 · 삭제 · 이동)           | ✅ 완료 |
| 텍스트 검색 (실시간 하이라이트)       | ✅ 완료 |
| 하이라이트 4색 + 메모                 | ✅ 완료 |
| TTS 읽어주기                          | ✅ 완료 |
| TTS 따라읽기 하이라이트 + 자동 스크롤 | ✅ 완료 |
| 키보드 단축키 (T·B·Ctrl+F·ESC 등)     | ✅ 완료 |

### Phase 3 — 고급 기능

| 기능                                 | 상태    |
| ------------------------------------ | ------- |
| PWA (Service Worker · 오프라인 캐시) | ✅ 완료 |
| 홈화면 추가 (Web App Manifest)       | ✅ 완료 |
| 읽기 통계                            | 🔲 예정 |
| 메모 · 북마크 내보내기 (JSON)        | 🔲 예정 |
| Firebase Hosting 배포                | 🔲 예정 |

<br>

## ⌨️ 단축키

| 키             | 기능               |
| -------------- | ------------------ |
| `T`            | 목차 사이드바 토글 |
| `B`            | 북마크 추가        |
| `Ctrl+F`       | 검색 열기/닫기     |
| `ESC`          | 패널 닫기          |
| `↑↓` / `Space` | 스크롤             |

<br>

## 📄 라이선스

MIT
