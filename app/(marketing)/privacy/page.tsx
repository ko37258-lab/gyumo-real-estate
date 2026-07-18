import Link from "next/link";

export const metadata = { title: "개인정보처리방침 | 건축가능 규모검토" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm" style={{ color: "var(--info)" }}>← 홈으로</Link>
      </div>

      <h1 className="text-2xl font-semibold mb-2">개인정보처리방침</h1>
      <p className="text-sm mb-10" style={{ color: "var(--muted-foreground)" }}>
        시행일: 2026년 6월 27일 | 미스터홈즈 (주식회사 홈즈레드)
      </p>

      <div className="space-y-10 text-sm leading-7" style={{ color: "var(--foreground)" }}>

        <section>
          <h2 className="text-base font-semibold mb-3">제1조 (개인정보 처리 목적)</h2>
          <p className="mb-2">미스터홈즈 건축가능 규모검토 서비스(이하 &ldquo;회사&rdquo;)는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
          <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--muted-foreground)" }}>
            <li>회원 가입 및 관리, 본인 확인</li>
            <li>서비스 제공 (지번 조회, 규모 검토 시뮬레이션)</li>
            <li>결제 처리 및 유료 플랜 관리</li>
            <li>고객 상담 및 민원 처리</li>
            <li>서비스 개선을 위한 통계 분석</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제2조 (처리하는 개인정보 항목)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: "var(--secondary)" }}>
                  <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--border)" }}>구분</th>
                  <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--border)" }}>항목</th>
                  <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--border)" }}>목적</th>
                  <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--border)" }}>보유 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>필수</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>이메일, 비밀번호(암호화), 이름</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>회원 인증·서비스 제공</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>선택</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>전화번호, 소속 회사</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>고객 맞춤 서비스</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>자동</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>IP 주소, 접속 로그, 서비스 이용 기록</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>부정이용 방지·통계</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>3개월</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제3조 (개인정보의 제3자 제공)</h2>
          <p style={{ color: "var(--muted-foreground)" }}>
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만, 법령에 의한 경우 또는 이용자의 동의가 있는 경우에 한하여 제공할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제4조 (개인정보 처리 위탁)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: "var(--secondary)" }}>
                  <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--border)" }}>수탁업체</th>
                  <th className="border px-3 py-2 text-left" style={{ borderColor: "var(--border)" }}>위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>Supabase Inc.</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>인증 및 데이터베이스 관리 (미국 소재, 표준계약조항 적용)</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>토스페이먼츠(주)</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>결제 처리</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>Vercel Inc.</td>
                  <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>서버 호스팅 (서울 리전)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제5조 (정보주체의 권리·의무)</h2>
          <p className="mb-2" style={{ color: "var(--muted-foreground)" }}>이용자는 아래 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--muted-foreground)" }}>
            <li>개인정보 열람 요구</li>
            <li>오류 등 정정 요구</li>
            <li>삭제 요구 (탈퇴)</li>
            <li>처리 정지 요구</li>
          </ul>
          <p className="mt-3" style={{ color: "var(--muted-foreground)" }}>
            권리 행사는 <strong>scko@mrhomes.co.kr</strong>로 요청하시거나 서비스 내 계정 설정에서 직접 처리할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제6조 (개인정보 보호책임자)</h2>
          <div className="rounded-lg p-4" style={{ background: "var(--secondary)" }}>
            <p>책임자: 고상철 (대표이사)</p>
            <p>이메일: scko@mrhomes.co.kr</p>
            <p>소속: 미스터홈즈 / 주식회사 홈즈레드</p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제7조 (개인정보 파기)</h2>
          <p style={{ color: "var(--muted-foreground)" }}>
            회원 탈퇴 시 즉시 개인정보를 파기합니다. 단, 관계 법령에 의해 보존이 필요한 정보는
            법정 기간 동안 별도 보관 후 파기합니다.
            (전자상거래법: 계약·청약철회 5년 / 대금결제 5년 / 분쟁처리 3년)
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">제8조 (개인정보 침해 신고)</h2>
          <ul className="space-y-1" style={{ color: "var(--muted-foreground)" }}>
            <li>개인정보 침해신고센터: privacy.kisa.or.kr / 국번없이 118</li>
            <li>개인정보 분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
            <li>대검찰청 사이버수사과: 국번없이 1301</li>
            <li>경찰청 사이버안전국: 국번없이 182</li>
          </ul>
        </section>
      </div>

      <div className="mt-12 pt-6 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
        본 방침은 2026년 6월 27일부터 적용됩니다.
        변경 시 서비스 내 공지를 통해 사전 안내합니다.
      </div>
    </div>
  );
}
