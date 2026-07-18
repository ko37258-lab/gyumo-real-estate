import { CreditRequestTable } from "./CreditRequestTable";

export const metadata = { title: "크레딧 신청 관리 | 규모검토" };

export default function AdminCreditsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">크레딧 신청 관리</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        입금이 확인되면 <b>승인·지급</b>을 누르세요. 크레딧이 지급(승인 후 2개월 유효)되고 일반회원은 정회원으로 승격됩니다.
      </p>
      <CreditRequestTable />
    </div>
  );
}
