// ════════════════════════════════════
// sync.js — Firestore 기기 간 동기화
// 경로: src/js/sync.js
// ════════════════════════════════════

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, currentUser } from "./firebase.js";

// ── 활성 리스너 정리용 ─────────────────────────
let unsubscribeProgress = null;

// ════════════════════════════════════
// 읽기 위치
// ════════════════════════════════════

// 읽기 위치 저장 (debounce 는 viewer.js 에서 처리)
export async function saveProgress({ bookId, chapterIdx, scrollY }) {
  if (!currentUser) {
    // 비로그인 → localStorage 저장
    localStorage.setItem(
      `progress-${bookId}`,
      JSON.stringify({ chapterIdx, scrollY }),
    );
    return;
  }

  try {
    const ref = doc(
      db,
      "users",
      currentUser.uid,
      "books",
      bookId,
      "progress",
      "current",
    );
    await setDoc(ref, {
      chapterIdx,
      scrollY,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("읽기 위치 저장 실패:", err);
    // Firestore 실패 시 localStorage 에 fallback
    localStorage.setItem(
      `progress-${bookId}`,
      JSON.stringify({ chapterIdx, scrollY }),
    );
  }
}

// 읽기 위치 불러오기 (1회성)
export async function loadProgress(bookId) {
  if (!currentUser) {
    // 비로그인 → localStorage
    try {
      const saved = localStorage.getItem(`progress-${bookId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  try {
    const ref = doc(
      db,
      "users",
      currentUser.uid,
      "books",
      bookId,
      "progress",
      "current",
    );
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("읽기 위치 불러오기 실패:", err);
    return null;
  }
}

// 다른 기기에서 저장 시 실시간 감지
export function watchProgress(bookId, onUpdate) {
  // 이전 리스너 정리
  if (unsubscribeProgress) {
    unsubscribeProgress();
    unsubscribeProgress = null;
  }

  if (!currentUser) return;

  const ref = doc(
    db,
    "users",
    currentUser.uid,
    "books",
    bookId,
    "progress",
    "current",
  );

  unsubscribeProgress = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();

    // 방금 내가 저장한 건 무시 (updatedAt 기준 3초 이내)
    const updatedAt = data.updatedAt?.toMillis?.() ?? 0;
    if (Date.now() - updatedAt < 3000) return;

    onUpdate({ chapterIdx: data.chapterIdx, scrollY: data.scrollY });
  });
}

// ════════════════════════════════════
// 책 메타데이터
// ════════════════════════════════════

// 책 정보 저장 (처음 불러올 때 1회)
export async function saveBookMeta({ bookId, title, totalChars }) {
  if (!currentUser) return;

  try {
    const ref = doc(db, "users", currentUser.uid, "books", bookId);
    const snap = await getDoc(ref);

    // 이미 있으면 스킵
    if (snap.exists()) return;

    await setDoc(ref, {
      title,
      totalChars,
      bookId,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("책 메타 저장 실패:", err);
  }
}

// 최근 읽은 책 목록
export async function loadRecentBooks() {
  if (!currentUser) return [];

  try {
    const ref = collection(db, "users", currentUser.uid, "books");
    const snap = await getDocs(ref);
    const books = [];

    for (const bookDoc of snap.docs) {
      const meta = bookDoc.data();
      const progRef = doc(
        db,
        "users",
        currentUser.uid,
        "books",
        bookDoc.id,
        "progress",
        "current",
      );
      const progSnap = await getDoc(progRef);
      const progress = progSnap.exists() ? progSnap.data() : null;

      books.push({
        bookId: bookDoc.id,
        title: meta.title ?? "제목 없음",
        totalChars: meta.totalChars ?? 0,
        chapterIdx: progress?.chapterIdx ?? 0,
        scrollY: progress?.scrollY ?? 0,
        updatedAt: progress?.updatedAt?.toMillis?.() ?? 0,
      });
    }

    // 최근 읽은 순서로 정렬
    return books.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error("최근 책 불러오기 실패:", err);
    return [];
  }
}

// ════════════════════════════════════
// 북마크
// ════════════════════════════════════

// 북마크 저장
export async function saveBookmark({
  bookId,
  bookmarkId,
  chapterIdx,
  scrollY,
  label,
}) {
  if (!currentUser) {
    // 비로그인 → localStorage
    const key = `bookmarks-${bookId}`;
    const saved = getLocalBookmarks(bookId);
    saved[bookmarkId] = {
      bookmarkId,
      chapterIdx,
      scrollY,
      label,
      createdAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(saved));
    return;
  }

  try {
    const ref = doc(
      db,
      "users",
      currentUser.uid,
      "books",
      bookId,
      "bookmarks",
      bookmarkId,
    );
    await setDoc(ref, {
      chapterIdx,
      scrollY,
      label,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("북마크 저장 실패:", err);
  }
}

// 북마크 삭제
export async function deleteBookmark({ bookId, bookmarkId }) {
  if (!currentUser) {
    const saved = getLocalBookmarks(bookId);
    delete saved[bookmarkId];
    localStorage.setItem(`bookmarks-${bookId}`, JSON.stringify(saved));
    return;
  }

  try {
    const ref = doc(
      db,
      "users",
      currentUser.uid,
      "books",
      bookId,
      "bookmarks",
      bookmarkId,
    );
    await deleteDoc(ref);
  } catch (err) {
    console.error("북마크 삭제 실패:", err);
  }
}

// 북마크 목록 불러오기
export async function loadBookmarks(bookId) {
  if (!currentUser) {
    return Object.values(getLocalBookmarks(bookId)).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }

  try {
    const ref = collection(
      db,
      "users",
      currentUser.uid,
      "books",
      bookId,
      "bookmarks",
    );
    const snap = await getDocs(ref);
    return snap.docs
      .map((d) => ({ bookmarkId: d.id, ...d.data() }))
      .sort(
        (a, b) =>
          (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0),
      );
  } catch (err) {
    console.error("북마크 불러오기 실패:", err);
    return [];
  }
}

// ════════════════════════════════════
// 전역 독자 설정 동기화
// ════════════════════════════════════

// 설정 저장 (Firestore)
export async function saveUserSettings(settings) {
  if (!currentUser) return;

  try {
    const ref = doc(db, "users", currentUser.uid, "settings", "reader");
    await setDoc(
      ref,
      { ...settings, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    console.error("설정 저장 실패:", err);
  }
}

// 설정 불러오기 (Firestore)
export async function loadUserSettings() {
  if (!currentUser) return null;

  try {
    const ref = doc(db, "users", currentUser.uid, "settings", "reader");
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("설정 불러오기 실패:", err);
    return null;
  }
}

// ── localStorage 북마크 헬퍼 ───────────────────
function getLocalBookmarks(bookId) {
  try {
    return JSON.parse(localStorage.getItem(`bookmarks-${bookId}`) ?? "{}");
  } catch {
    return {};
  }
}

// ── 리스너 전체 정리 (책 닫을 때) ──────────────
export function cleanupSync() {
  if (unsubscribeProgress) {
    unsubscribeProgress();
    unsubscribeProgress = null;
  }
}
