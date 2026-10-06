import { describe, it, expect, afterEach } from "vitest";
import {
  captureReportImages,
  describeCaptureFailure,
  locationMapUnavailableReason,
  type ImageCaptureResult,
} from "@/lib/report/captureImages";
import { useSimulatorStore } from "@/store/simulator";

afterEach(() => {
  useSimulatorStore.setState({ capture3D: null, parcelShape: null });
});

describe("describeCaptureFailure", () => {
  it("실패가 없으면 null(대화상자를 띄우지 않는다)", () => {
    const r: ImageCaptureResult = {
      visualization3D: { iso: "x" },
      locationMap: "y",
      attemptedLocation: true,
      failed3D: false,
      failedLocation: false,
    };
    expect(describeCaptureFailure(r)).toBeNull();
  });

  it("3D만 실패하면 3D만 언급", () => {
    const r: ImageCaptureResult = {
      visualization3D: null,
      locationMap: "y",
      attemptedLocation: true,
      failed3D: true,
      failedLocation: false,
    };
    const msg = describeCaptureFailure(r);
    expect(msg).toContain("3D 매스");
    expect(msg).not.toContain("위치도");
  });

  it("위치도만 시도했다가 실패하면 위치도만 언급(미조회로 애초에 시도 안 한 건 실패가 아니다)", () => {
    const r: ImageCaptureResult = {
      visualization3D: null,
      locationMap: null,
      attemptedLocation: true,
      failed3D: false,
      failedLocation: true,
    };
    const msg = describeCaptureFailure(r);
    expect(msg).toContain("위치도");
    expect(msg).not.toContain("3D");
  });
});

describe("locationMapUnavailableReason", () => {
  it("위치도를 원하지 않으면 안내 없음", () => {
    expect(locationMapUnavailableReason(false)).toBeNull();
  });

  it("조회 전(parcelShape 없음)이면 '지번 조회 후' 안내", () => {
    useSimulatorStore.setState({ parcelShape: null });
    expect(locationMapUnavailableReason(true)).toContain("지번 조회");
  });

  it("실형상이 있으면 안내 없음", () => {
    useSimulatorStore.setState({
      parcelShape: {
        ringLonLat: [
          [127.0, 37.5],
          [127.001, 37.5],
          [127.001, 37.501],
        ],
      } as never,
    });
    expect(locationMapUnavailableReason(true)).toBeNull();
  });
});

describe("captureReportImages", () => {
  it("3D를 원하지 않으면 시도하지 않고 failed3D=false", async () => {
    const r = await captureReportImages({ want3D: false, wantLocation: false });
    expect(r.visualization3D).toBeNull();
    expect(r.failed3D).toBe(false);
  });

  it("위치도를 원해도 지번 조회 전이면 '시도하지 않음'(attemptedLocation=false) — 실패로 안내하지 않는다", async () => {
    useSimulatorStore.setState({ parcelShape: null });
    const r = await captureReportImages({ want3D: false, wantLocation: true });
    expect(r.attemptedLocation).toBe(false);
    expect(r.failedLocation).toBe(false);
  });

  it("실형상이 있어 위치도를 시도했지만(이 테스트 환경엔 DOM이 없어) 실패하면 failedLocation=true", async () => {
    useSimulatorStore.setState({
      parcelShape: {
        ringLonLat: [
          [127.0, 37.5],
          [127.001, 37.5],
          [127.001, 37.501],
        ],
        centerLon: 127.0005,
        centerLat: 37.5005,
      } as never,
    });
    const r = await captureReportImages({ want3D: false, wantLocation: true });
    expect(r.attemptedLocation).toBe(true);
    expect(r.failedLocation).toBe(true);
  });

  it("capture3D 함수가 등록돼 있으면 3D 캡쳐에 성공한다", async () => {
    useSimulatorStore.setState({
      capture3D: (view?: string) => `data:image/png;base64,FAKE-${view ?? "iso"}`,
    });
    const r = await captureReportImages({ want3D: true, wantLocation: false });
    expect(r.failed3D).toBe(false);
    expect(r.visualization3D?.iso).toContain("FAKE-iso");
  });
});
