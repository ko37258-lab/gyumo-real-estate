import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VworldKeyError, vworldKeyFailCode } from "@/lib/vworld-fail";
import { fetchVworldLandUseAttr, fetchVworldZone } from "@/lib/vworld-data";
import { GET } from "@/app/api/landarea/route";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const KEY_DEAD = { resultCode: "INVALID_KEY", resultMsg: "등록되지 않은 인증키입니다." };

type Scene = {
  ledgerArea?: number;
  landChar?: unknown;
  landUses?: unknown;
  data?: unknown;
};

/** 외부 API 를 상황별로 흉내 낸다 — 호출 수는 fetchMock 으로 잰다 */
const fetchMock = vi.fn();
function stage(scene: Scene) {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("apis.data.go.kr")) {
      return json({
        response: scene.ledgerArea
          ? { header: { resultCode: "00" }, body: { items: { item: [{ platArea: scene.ledgerArea }] } } }
          : { header: { resultCode: "03" } },
      });
    }
    if (url.includes("getLandCharacteristics")) return json({ landCharacteristicss: scene.landChar });
    if (url.includes("getLandUseAttr")) return json({ landUses: scene.landUses });
    return json(scene.data ?? { response: { status: "NOT_FOUND" } });
  });
}
const call = (pnu: string) => GET(new Request(`https://gyumo.test/api/landarea?pnu=${pnu}`));

const JEJU_CHAR = {
  field: [{ stdrYear: "2026", lndpclAr: "736", lndcgrCodeNm: "전", prposArea1Nm: "계획관리지역", pblntfPclnd: "46100" }],
};
const JEJU_USES = {
  field: [
    { prposAreaDstrcCodeNm: "자연취락지구", cnflcAtNm: "포함" },
    { prposAreaDstrcCodeNm: "계획관리지역", cnflcAtNm: "포함" },
    { prposAreaDstrcCodeNm: "소로2류", cnflcAtNm: "저촉" },
    { prposAreaDstrcCodeNm: "자연녹지지역", cnflcAtNm: "접함" },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DATAGO_KEY", "datago");
  vi.stubEnv("VWORLD_KEY", "vworld");
  vi.stubEnv("VWORLD_DOMAIN", "example.test");
  fetchMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("키 오류 판정", () => {
  it("NED·req/data 응답 모두 잡는다", () => {
    expect(vworldKeyFailCode({ landUses: KEY_DEAD })).toBe("INVALID_KEY");
    expect(vworldKeyFailCode({ response: { status: "ERROR", error: { code: "INCORRECT_KEY" } } })).toBe("INCORRECT_KEY");
    expect(vworldKeyFailCode({ response: { status: "ERROR", error: { code: "OVER_REQUEST_LIMIT" } } })).toBe("OVER_REQUEST_LIMIT");
  });
  it("정상·자료 없음은 키 오류가 아니다", () => {
    expect(vworldKeyFailCode({ landUses: { field: [], resultCode: "" } })).toBeNull();
    expect(vworldKeyFailCode({ response: { status: "NOT_FOUND" } })).toBeNull();
    expect(vworldKeyFailCode(null)).toBeNull();
  });
  it("best-effort 조회도 키 오류는 숨기지 않는다", async () => {
    stage({ data: { response: { status: "ERROR", error: { code: "INVALID_KEY" } } } });
    await expect(fetchVworldZone(127, 37)).rejects.toBeInstanceOf(VworldKeyError);
  });
  it("토지이용계획 표기 — 포함·저촉·접함", async () => {
    stage({ landUses: JEJU_USES });
    await expect(fetchVworldLandUseAttr("5011031026003640003")).resolves.toEqual([
      "자연취락지구",
      "계획관리지역",
      "소로2류(저촉)",
      "자연녹지지역(접함)",
    ]);
  });
});

describe("/api/landarea", () => {
  it("정상이면 면적·용도지역·지역지구를 주고 24시간 캐시한다", async () => {
    stage({ landChar: JEJU_CHAR, landUses: JEJU_USES });
    const body = await (await call("5011031026003640003")).json();
    expect(body).toMatchObject({ area: 736, source: "vworld", zone: "계획관리지역" });
    expect(body.useAttrs).toContain("자연취락지구");

    fetchMock.mockClear();
    const again = await (await call("5011031026003640003")).json();
    expect(again.cached).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("키가 죽으면 503 + keyError 이고 나대지라고 말하지 않는다", async () => {
    stage({ landChar: KEY_DEAD, landUses: KEY_DEAD, data: { response: { status: "ERROR", error: { code: "INVALID_KEY" } } } });
    const res = await call("5011031026003640001");
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.keyError).toBe(true);
    expect(body.message).not.toContain("나대지");
  });

  it("키 오류는 캐시하지 않는다 — 키가 살아나면 바로 나온다", async () => {
    stage({ landChar: KEY_DEAD, landUses: KEY_DEAD });
    expect((await call("5011031026003640002")).status).toBe(503);

    stage({ landChar: JEJU_CHAR, landUses: JEJU_USES });
    const res = await call("5011031026003640002");
    expect(res.status).toBe(200);
    expect((await res.json()).area).toBe(736);
  });

  it("건축물대장만 받았으면 그 값과 keyError 를 함께 주고 캐시하지 않는다", async () => {
    stage({ ledgerArea: 201.6, landChar: KEY_DEAD, landUses: KEY_DEAD });
    const res = await call("5011031026003640004");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ area: 201.6, source: "building", keyError: true });

    stage({ ledgerArea: 201.6, landChar: JEJU_CHAR, landUses: JEJU_USES });
    const next = await (await call("5011031026003640004")).json();
    expect(next.zone).toBe("계획관리지역");
    expect(next.keyError).toBeUndefined();
  });

  it("지역·지구만 키 오류여도 알린다", async () => {
    stage({ landChar: JEJU_CHAR, landUses: KEY_DEAD });
    const body = await (await call("5011031026003640005")).json();
    expect(body).toMatchObject({ area: 736, keyError: true });
  });

  it("진짜 자료 없음은 10분만 캐시한다", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-04T00:00:00Z"), toFake: ["Date"] });
    stage({ landChar: { field: [], totalCount: "0" }, landUses: { field: [] } });
    const first = await (await call("5011031026003640006")).json();
    expect(first.area).toBeNull();
    expect(first.keyError).toBeUndefined();

    expect((await (await call("5011031026003640006")).json()).cached).toBe(true);

    vi.setSystemTime(new Date("2026-11-04T00:11:00Z"));
    stage({ landChar: JEJU_CHAR, landUses: JEJU_USES });
    expect((await (await call("5011031026003640006")).json()).area).toBe(736);
  });

  it("지역·지구를 못 받은 결과는 10분만 캐시한다", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-04T00:00:00Z"), toFake: ["Date"] });
    stage({ landChar: JEJU_CHAR, landUses: { field: [] } });
    expect((await (await call("5011031026003640007")).json()).useAttrs).toBeUndefined();

    vi.setSystemTime(new Date("2026-11-04T00:11:00Z"));
    stage({ landChar: JEJU_CHAR, landUses: JEJU_USES });
    expect((await (await call("5011031026003640007")).json()).useAttrs).toContain("자연취락지구");
  });
});
