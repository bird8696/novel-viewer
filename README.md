# 📖 소설 뷰어

> TXT 파일을 편하게 읽는 웹 기반 소설 뷰어.  
> 기기 간 읽기 위치 자동 동기화, 북마크, 메모, 하이라이트 지원.

<br>

## ✨ 주요 기능

- **TXT 파일 업로드** — 드래그 앤 드롭, UTF-8 / EUC-KR 자동 감지
- **기기 간 동기화** — Google 로그인 시 폰 ↔ PC 읽기 위치 자동 동기화
- **챕터 자동 파싱** — 목차 사이드바 자동 생성
- **3가지 테마** — 다크 / 라이트 / 세피아
- **북마크 & 메모** — 하이라이트 + 메모, 기기 간 공유
- **텍스트 검색** — Ctrl+F 스타일 인라인 검색
- **읽기 진행률** — 프로그레스바 + 남은 시간 표시
- **PWA 지원** — 홈화면 추가, 오프라인 마지막 챕터 캐시
- **반응형** — 모바일 / 태블릿 / 데스크탑 전부 지원

<br>

## 🛠 기술 스택

| 분류         | 기술                                   |
| ------------ | -------------------------------------- |
| 프론트엔드   | Vanilla JS, HTML5, CSS3                |
| 인증         | Firebase Authentication (Google OAuth) |
| 데이터베이스 | Cloud Firestore                        |
| 호스팅       | Firebase Hosting                       |
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
3. Firestore Database 생성 (테스트 모드로 시작)
4. 프로젝트 설정 → 웹 앱 추가 → SDK 설정 복사

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

### 4. 로컬 실행

별도 설치 없이 `index.html` 을 브라우저에서 바로 열면 돼요.  
단, Firebase 모듈 방식(`type="module"`)을 사용하므로 로컬 서버가 필요해요.

```bash
# VS Code Live Server 확장 사용 (추천)
# 또는 npx로 간단히 실행
npx serve .
```

<br>

## 📁 프로젝트 구조

```
novel-viewer/
├── docs/
│   └── PLAN.html              # 프로젝트 계획서
├── src/
│   ├── js/
│   │   ├── firebase.js        # Firebase 초기화 · Auth
│   │   ├── firebase-config.example.js  # 설정 템플릿 (키 없음)
│   │   ├── parser.js          # 챕터 파싱
│   │   ├── viewer.js          # 렌더링 · 스크롤
│   │   ├── sync.js            # Firestore 동기화
│   │   ├── bookmark.js        # 북마크 관리
│   │   ├── highlight.js       # 하이라이트 · 메모
│   │   ├── search.js          # 텍스트 검색
│   │   ├── tts.js             # TTS 읽어주기
│   │   └── settings.js        # 테마 · 폰트 설정
│   ├── css/
│   │   ├── base.css           # 리셋 · 변수
│   │   ├── layout.css         # 반응형 레이아웃
│   │   ├── themes.css         # 다크 · 라이트 · 세피아
│   │   └── components.css     # UI 컴포넌트
│   └── assets/                # 아이콘 · 폰트
├── index.html                 # 메인 진입점
├── manifest.json              # PWA 설정
├── sw.js                      # Service Worker
├── firebase.json              # Firebase 호스팅 설정
├── .firebaserc                # Firebase 프로젝트 ID
├── firestore.rules            # DB 보안 규칙
└── README.md
```

<br>

## 📋 개발 현황

| 단계    | 내용                                           | 상태         |
| ------- | ---------------------------------------------- | ------------ |
| Phase 0 | Firebase 셋업 · Google 로그인 · Firestore 연동 | 🔲 진행 예정 |
| Phase 1 | TXT 업로드 · 챕터 파싱 · 뷰어 렌더링 · 테마    | 🔲 진행 예정 |
| Phase 2 | 기기 간 동기화 · 북마크 · 검색 · 진행률 · 메모 | 🔲 진행 예정 |
| Phase 3 | TTS · PWA · 읽기 통계 · 내보내기               | 🔲 진행 예정 |

<br>

## 📄 라이선스

MIT
