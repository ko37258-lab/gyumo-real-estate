"use client";

// 한장 보고서 하단 띠에 들어가는 "만든 사람" 인적사항 (2026-09-21)
//
// 브랜드(BrandConfig)와 분리한 이유:
//  - 브랜드는 회사 정체성(정회원 이상만 변경) — 여러 사람이 같은 상호를 쓴다.
//  - 인적사항은 사람마다 다르다. 한 대의 PC를 여러 명이 쓰는 경우가 아니라면
//    브라우저(localStorage)에 각자 저장해 두고 자기 이름으로 출력하는 게 맞다.
//  - 서버에 저장하지 않으므로 기존 회원 데이터에 영향이 없고, 지우면 그대로 원복된다.

import { useSyncExternalStore } from "react";

export interface ReporterProfile {
  /** 사무소·회사 상호 (1줄) */
  officeName: string;
  /** 소속·지점 (2줄째, 선택) */
  officeBranch: string;
  /** 직함·자격 — "대표 / 공인중개사 / 토지분석사" 처럼 슬래시로 나열 */
  titles: string;
  /** 이름 */
  name: string;
  /** 연락처 */
  phone: string;
  /** 이메일 (선택) */
  email: string;
  /** 등록번호·사업자번호 (선택) */
  regNo: string;
  /** 사무소 주소 (선택) */
  officeAddress: string;
}

export const EMPTY_REPORTER: ReporterProfile = {
  officeName: "",
  officeBranch: "",
  titles: "",
  name: "",
  phone: "",
  email: "",
  regNo: "",
  officeAddress: "",
};

const STORAGE_KEY = "gyumo_reporter_profile";
const CHANGE_EVENT = "gyumo:reporter-changed";

export function getReporterProfile(): ReporterProfile {
  if (typeof window === "undefined") return EMPTY_REPORTER;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_REPORTER;
    const parsed = JSON.parse(raw) as Partial<ReporterProfile>;
    return { ...EMPTY_REPORTER, ...parsed };
  } catch {
    return EMPTY_REPORTER;
  }
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveReporterProfile(patch: Partial<ReporterProfile>): void {
  if (typeof window === "undefined") return;
  const merged = { ...getReporterProfile(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  emitChange();
}

export function clearReporterProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

/** 입력이 하나라도 있는지 — 비어 있으면 보고서 하단 띠에 안내 문구를 띄운다 */
export function hasReporterInfo(p: ReporterProfile): boolean {
  return Object.values(p).some((v) => v.trim().length > 0);
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

export function useReporterProfile(): ReporterProfile {
  return useSyncExternalStore(subscribe, getReporterProfile, () => EMPTY_REPORTER);
}
