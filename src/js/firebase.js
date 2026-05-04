// ════════════════════════════════════
// firebase.js — Firebase 초기화 · 인증
// ════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// ── 앱 초기화 ──────────────────────────────────
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

// ── 현재 유저 (앱 전역에서 참조) ──────────────────
export let currentUser = null;

// ── 앱 진입점 ──────────────────────────────────
export function initApp() {
  // 인증 상태 감시 — 로그인/로그아웃 시 자동 호출
  onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
      // 로그인 상태
      onUserSignedIn(user);
    } else {
      // 비로그인 상태
      onUserSignedOut();
    }
  });

  // 버튼 이벤트 등록
  document
    .getElementById("btn-google-login")
    ?.addEventListener("click", signInWithGoogle);

  document
    .getElementById("btn-guest")
    ?.addEventListener("click", continueAsGuest);

  document
    .getElementById("btn-logout")
    ?.addEventListener("click", handleSignOut);
}

// ── Google 로그인 ──────────────────────────────
async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged 가 자동으로 onUserSignedIn 호출
  } catch (err) {
    // 팝업 닫은 경우는 무시
    if (err.code !== "auth/popup-closed-by-user") {
      console.error("로그인 실패:", err);
      showToast("로그인에 실패했어요. 다시 시도해줘요.");
    }
  }
}

// ── 로그아웃 ───────────────────────────────────
async function handleSignOut() {
  try {
    await signOut(auth);
    showToast("로그아웃 됐어요.");
  } catch (err) {
    console.error("로그아웃 실패:", err);
  }
}

// ── 비로그인으로 계속 ──────────────────────────
function continueAsGuest() {
  hideAuthOverlay();
  showApp();
  updateUIForGuest();
}

// ── 로그인 후 UI 처리 ──────────────────────────
function onUserSignedIn(user) {
  hideAuthOverlay();
  showApp();
  updateUIForUser(user);

  // sync.js 에서 Firestore 데이터 불러오기 (나중에 연결)
  // loadUserData(user.uid);
}

// ── 로그아웃 후 UI 처리 ──────────────────────
function onUserSignedOut() {
  hideApp();
  showAuthOverlay();
  resetUI();
}

// ── UI 헬퍼 ───────────────────────────────────
function showAuthOverlay() {
  document.getElementById("auth-overlay")?.classList.remove("hidden");
}

function hideAuthOverlay() {
  document.getElementById("auth-overlay")?.classList.add("hidden");
}

function showApp() {
  document.getElementById("app")?.classList.remove("hidden");
}

function hideApp() {
  document.getElementById("app")?.classList.add("hidden");
}

function updateUIForUser(user) {
  // 상단 아바타 이니셜
  const initial = user.displayName?.[0]?.toUpperCase() ?? "U";
  const el = document.getElementById("user-initial");
  if (el) el.textContent = initial;

  // 설정 패널 계정 정보
  const info = document.getElementById("account-info");
  if (info) {
    info.innerHTML = `
      <div style="font-weight:500;margin-bottom:2px">${user.displayName ?? "사용자"}</div>
      <div>${user.email ?? ""}</div>
    `;
  }

  // 최근 책 목록 표시 (sync.js 연결 후 활성화)
  const recentSection = document.getElementById("recent-books");
  if (recentSection) recentSection.style.display = "block";
}

function updateUIForGuest() {
  const el = document.getElementById("user-initial");
  if (el) el.textContent = "G";

  const info = document.getElementById("account-info");
  if (info) info.textContent = "비로그인 상태 — 동기화 안 됨";
}

function resetUI() {
  const el = document.getElementById("user-initial");
  if (el) el.textContent = "?";

  const info = document.getElementById("account-info");
  if (info) info.textContent = "";

  const recentSection = document.getElementById("recent-books");
  if (recentSection) recentSection.style.display = "none";
}

// ── 토스트 알림 (전역 유틸) ────────────────────
export function showToast(message, duration = 2500) {
  const wrap = document.getElementById("toast-wrap");
  if (!wrap) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
