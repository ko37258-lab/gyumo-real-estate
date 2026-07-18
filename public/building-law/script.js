const PERSONA = `당신은 대한민국 부동산공법 전문가 '고상철'(별칭 MR.K)입니다.
역할: 건축법, 건축법 시행령, 건축법 시행규칙에 근거하여 일반인이 이해하기 쉽게 설명하는 상담가입니다.
고상철 대표는 미스터홈즈 FC 대표이사, 인하대학교 정책대학원 부동산학과 초빙교수, 건국대학교 미래지식교육원 디벨로퍼 과정 대표강사, 서울사이버대학교 부동산AI학과 교수입니다.
답변 원칙:
- 반드시 한국어로, 전문적이되 친절하고 명확한 '-입니다/-합니다' 체로 답합니다.
- 핵심 결론을 먼저 말하고, 필요하면 근거 조문(예: 건축법 제11조, 시행령 별표 1)을 간단히 덧붙입니다.
- 과장이나 단정은 피하고, 규모·용도·지자체 조례에 따라 달라질 수 있음을 안내합니다.
- 답변은 4~7문장 이내로 간결하게 정리합니다.
- 사안이 복잡하면 마지막에 '정확한 판단은 관할 행정청 또는 전문가 상담을 권합니다.'라고 안내합니다.
- 건축법과 무관한 질문에는 정중히 건축 관련 질문을 요청합니다.`;

const concepts = [
  { tag: "01", term: "건축물", desc: "토지에 정착하는 공작물 중 지붕과 기둥(또는 벽)이 있는 것. 부속 시설물과 지하·고가 구조물도 포함됩니다." },
  { tag: "02", term: "건축", desc: "건축물을 신축·증축·개축·재축하거나 같은 대지의 다른 위치로 이전하는 행위를 말합니다." },
  { tag: "03", term: "대수선", desc: "내력벽·기둥·보·지붕틀·주계단 등 주요 구조부를 증설·해체하거나 수선·변경하는 것으로, 일정 규모 이상이면 허가·신고 대상입니다." },
  { tag: "04", term: "용도변경", desc: "건축물을 다른 용도로 사용하는 것. 시설군의 상·하위 이동에 따라 허가·신고·건축물대장 기재변경으로 나뉩니다." },
  { tag: "05", term: "대지", desc: "건축할 수 있는 토지의 단위로, 원칙적으로 「공간정보관리법」상 한 필지를 말합니다." },
  { tag: "06", term: "건폐율 · 용적률", desc: "건폐율은 대지면적 대비 건축면적, 용적률은 대지면적 대비 지상 연면적의 비율로, 용도지역마다 상한이 정해집니다." }
];

const tiers = [
  { level: "Act", kr: "건축법", maker: "법률 · 국회 제정", no: "제21035호", desc: "건축물의 안전·기능·환경·미관에 관한 기본 원칙과 국민·행정청의 권리·의무를 정합니다." },
  { level: "Decree", kr: "시행령", maker: "대통령령", no: "제35717호", desc: "법에서 위임한 사항을 구체화합니다. 용도별 건축물의 종류(별표 1)와 각종 기준이 여기에 담깁니다." },
  { level: "Rule", kr: "시행규칙", maker: "국토교통부령", no: "제01567호", desc: "신청 절차·제출 서류·서식 등 실무에 필요한 세부 사항을 정합니다." }
];

const uses = [
  { n: "1", name: "단독주택", ex: "단독·다중·다가구주택, 공관" },
  { n: "2", name: "공동주택", ex: "아파트·연립·다세대주택, 기숙사" },
  { n: "3", name: "제1종 근린생활시설", ex: "소매점, 의원, 이용원, 마을회관" },
  { n: "4", name: "제2종 근린생활시설", ex: "음식점, 학원, 사무소, 노래연습장" },
  { n: "5", name: "문화 및 집회시설", ex: "공연장, 전시장, 관람장, 동·식물원" },
  { n: "6", name: "종교시설", ex: "교회, 성당, 사찰, 봉안당" },
  { n: "7", name: "판매시설", ex: "도매시장, 소매시장, 상점" },
  { n: "8", name: "운수시설", ex: "여객터미널, 철도역사, 공항시설" },
  { n: "9", name: "의료시설", ex: "병원, 격리병원" },
  { n: "10", name: "교육연구시설", ex: "학교, 연구소, 도서관, 직업훈련소" },
  { n: "11", name: "노유자시설", ex: "아동·노인·사회복지시설" },
  { n: "12", name: "수련시설", ex: "청소년수련관, 유스호스텔" },
  { n: "13", name: "운동시설", ex: "체육관, 운동장, 골프연습장" },
  { n: "14", name: "업무시설", ex: "공공업무시설, 오피스텔" },
  { n: "15", name: "숙박시설", ex: "호텔, 여관, 생활숙박시설" },
  { n: "16", name: "위락시설", ex: "단란주점, 유흥주점, 카지노" },
  { n: "17", name: "공장", ex: "물품 제조·가공·수리 시설" },
  { n: "18", name: "창고시설", ex: "창고, 하역장, 물류터미널" },
  { n: "19", name: "위험물 저장 및 처리 시설", ex: "주유소, 액화석유가스 충전소" },
  { n: "20", name: "자동차 관련 시설", ex: "주차장, 정비공장, 운전학원" },
  { n: "21", name: "동물 및 식물 관련 시설", ex: "축사, 도축장, 온실" },
  { n: "22", name: "자원순환 관련 시설", ex: "고물상, 폐기물 처리시설" },
  { n: "23", name: "교정시설", ex: "교도소, 구치소, 소년원" },
  { n: "24", name: "방송통신시설", ex: "방송국, 전신전화국, 데이터센터" },
  { n: "25", name: "발전시설", ex: "발전소(집회·판매 용도 제외)" },
  { n: "26", name: "묘지 관련 시설", ex: "화장시설, 봉안당, 묘지 부속건축물" },
  { n: "27", name: "관광 휴게시설", ex: "휴게소, 야외음악당, 관망탑" },
  { n: "28", name: "장례시설", ex: "장례식장, 동물 전용 장례식장" },
  { n: "29", name: "야영장 시설", ex: "관광진흥법상 야영장(연면적 300㎡ 이상)" }
];

const steps = [
  { n: "1", title: "사전 검토", desc: "용도지역·지구, 건폐율·용적률, 도로 등 입지 조건을 확인합니다." },
  { n: "2", title: "설계 · 도서 작성", desc: "건축사가 설계도서를 작성하고 관계 법령 적합성을 검토합니다." },
  { n: "3", title: "허가 신청 / 신고", desc: "규모·용도에 따라 건축허가를 신청하거나 건축신고를 합니다." },
  { n: "4", title: "허가 · 수리", desc: "행정청이 심사 후 허가하거나 신고를 수리합니다." },
  { n: "5", title: "착공신고", desc: "공사 착수 전 착공신고를 하고 감리자를 지정합니다." },
  { n: "6", title: "시공 · 감리", desc: "설계도서대로 시공하고, 감리자가 품질·안전을 확인합니다." },
  { n: "7", title: "사용승인 신청", desc: "공사 완료 후 사용승인(준공)을 신청합니다." },
  { n: "8", title: "사용승인 · 사용", desc: "검사에 합격하면 사용승인을 받고 건축물을 사용합니다." }
];

const suggestions = [
  "용도변경 허가·신고 판단 기준은?",
  "같은 시설군도 신고가 필요한 경우는?",
  "면적에 따라 분류가 바뀌는 시설은?",
  "건축신고와 건축허가의 차이는?"
];

const facilityGroups = [
  { no: 1, name: "자동차 관련 시설군", color: "#374151", usages: ["자동차 관련 시설 (20호)"] },
  { no: 2, name: "산업 등 시설군", color: "#78350F", usages: ["운수시설 (8호)", "창고시설 (18호)", "공장 (17호)", "위험물저장 및 처리시설 (19호)", "자원순환 관련 시설 (22호)", "묘지 관련 시설 (26호)", "장례시설 (28호)"] },
  { no: 3, name: "전기통신시설군", color: "#5B21B6", usages: ["방송통신시설 (24호)", "발전시설 (25호)"] },
  { no: 4, name: "문화집회시설군", color: "#9F1239", usages: ["문화 및 집회시설 (5호)", "종교시설 (6호)", "위락시설 (16호)", "관광휴게시설 (27호)"] },
  { no: 5, name: "영업시설군", color: "#9A3412", usages: ["판매시설 (7호)", "운동시설 (13호)", "숙박시설 (15호)", "제2종 근린생활시설 중 다중생활시설"] },
  { no: 6, name: "교육 및 복지시설군", color: "#92400E", usages: ["의료시설 (9호)", "교육연구시설 (10호)", "노유자시설 (11호)", "수련시설 (12호)", "야영장 시설 (29호)"] },
  { no: 7, name: "근린생활시설군", color: "#166534", usages: ["제1종 근린생활시설 (3호)", "제2종 근린생활시설 (4호) — 다중생활시설 제외"] },
  { no: 8, name: "주거업무시설군", color: "#1E40AF", usages: ["단독주택 (1호)", "공동주택 (2호)", "업무시설 (14호)", "교정시설 (23호)", "국방·군사시설 (23의2호)"] },
  { no: 9, name: "그 밖의 시설군", color: "#4B5563", usages: ["동물 및 식물 관련 시설 (21호)"] }
];

const thresholdRules = [
  { name: "소매점 (일용품)", items: [{ area: "1,000㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "1,000㎡ 이상", cat: "판매시설", sg: 5 }] },
  { name: "휴게음식점·제과점", items: [{ area: "300㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "300㎡ 이상", cat: "제2종 근린생활시설", sg: 7 }] },
  { name: "동물병원·동물미용실", items: [{ area: "300㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "300㎡ 이상", cat: "제2종 근린생활시설", sg: 7 }] },
  { name: "탁구장·체육도장", items: [{ area: "500㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "운동시설", sg: 5 }] },
  { name: "테니스장·볼링장·당구장 등", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "운동시설", sg: 5 }] },
  { name: "공연장 (극장·영화관 등)", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "문화 및 집회시설", sg: 4 }] },
  { name: "종교집회장 (교회·성당 등)", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "종교시설", sg: 4 }] },
  { name: "자동차영업소", items: [{ area: "1,000㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "1,000㎡ 이상", cat: "판매시설", sg: 5 }] },
  { name: "게임·체험 관련 시설", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "판매시설", sg: 5 }] },
  { name: "학원·교습소", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "교육연구시설", sg: 6 }] },
  { name: "제조업소·수리점", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "공장", sg: 2 }] },
  { name: "단란주점", items: [{ area: "150㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "150㎡ 이상", cat: "위락시설", sg: 4 }] },
  { name: "다중생활시설 (고시원)", items: [{ area: "500㎡ 미만", cat: "제2종 근린생활시설 (영업5군)", sg: 5 }, { area: "500㎡ 이상", cat: "숙박시설", sg: 5 }] },
  { name: "금융업소·사무소", items: [{ area: "30㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "30~500㎡ 미만", cat: "제2종 근린생활시설", sg: 7 }, { area: "500㎡ 이상", cat: "업무시설", sg: 8 }] },
  { name: "공공업무시설 (우체국·파출소 등)", items: [{ area: "1,000㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "1,000㎡ 이상", cat: "업무시설", sg: 8 }] },
  { name: "통신용 시설", items: [{ area: "1,000㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "1,000㎡ 이상", cat: "방송통신시설", sg: 3 }] },
  { name: "전기자동차 충전소", items: [{ area: "1,000㎡ 미만", cat: "제1종 근린생활시설", sg: 7 }, { area: "1,000㎡ 이상", cat: "자동차 관련 시설", sg: 1 }] },
  { name: "야영장 시설", items: [{ area: "300㎡ 미만", cat: "야영장 시설 (29호)", sg: 6 }, { area: "300㎡ 이상", cat: "수련시설 (12호)", sg: 6 }] }
];

const changeCaseGroups = [
  {
    key: "permit",
    label: "허가",
    title: "상위 시설군으로 변경",
    cases: [
      { from: "주거업무 8군", to: "근린생활 7군", example: "다가구주택 → 소매점·음식점", note: "주택을 상가로 바꾸는 흔한 허가 사례입니다." },
      { from: "근린생활 7군", to: "영업 5군", example: "소매점 1,000㎡ 이상 → 판매시설", note: "면적 초과로 판매시설에 해당하면 상위군 허가를 봅니다." },
      { from: "근린생활 7군", to: "문화집회 4군", example: "음식점 → 단란주점 150㎡ 이상", note: "위락시설로 바뀌면 허가 검토가 필요합니다." }
    ]
  },
  {
    key: "report",
    label: "신고",
    title: "하위 시설군으로 변경",
    cases: [
      { from: "문화집회 4군", to: "근린생활 7군", example: "공연장 500㎡ 이상 → 일반음식점", note: "문화집회시설에서 근린생활시설로 내려가는 사례입니다." },
      { from: "영업 5군", to: "교육복지 6군", example: "판매시설 → 학원 500㎡ 이상", note: "상업적 이용에서 교육시설로 하향 변경하는 흐름입니다." },
      { from: "교육복지 6군", to: "근린생활 7군", example: "병원 → 의원", note: "병원급에서 의원급으로 내려가면 신고를 우선 검토합니다." }
    ]
  },
  {
    key: "register",
    label: "대장기재",
    title: "같은 시설군 안에서 변경",
    cases: [
      { from: "1종 근린 7군", to: "2종 근린 7군", example: "소매점·의원 → 일반음식점", note: "같은 7군이지만 세부 용도와 예외를 확인합니다." },
      { from: "주거업무 8군", to: "주거업무 8군", example: "단독주택 → 사무소", note: "같은 8군 안의 변경으로 대장기재를 봅니다." },
      { from: "2종 근린 7군", to: "2종 근린 7군", example: "독서실 → 학원 500㎡ 미만", note: "학원은 같은 군이어도 신고 예외 여부를 확인해야 합니다." }
    ]
  }
];

const compassModules = [
  { key: "home", label: "홈", sub: "정보 허브" },
  { key: "usechange", label: "용도분류·변경", sub: "허가·신고 판단" },
  { key: "permit", label: "허가절차", sub: "9단계 프로세스" },
  { key: "calculator", label: "건폐율·용적률", sub: "기준 초과 계산" },
  { key: "zones", label: "제한 기준표", sub: "21개 용도지역" },
  { key: "compare", label: "신고 vs 허가", sub: "실무 비교" },
  { key: "enforcement", label: "이행강제금", sub: "부과율 계산" },
  { key: "penalties", label: "벌칙·과태료", sub: "처벌 기준" },
  { key: "qa", label: "Q&A", sub: "MR.K 질문 연결" }
];

const compassZones = [
  { cat: "주거", name: "제1종전용주거지역", bc: 50, farMin: 50, farMax: 100 },
  { cat: "주거", name: "제2종전용주거지역", bc: 50, farMin: 100, farMax: 150 },
  { cat: "주거", name: "제1종일반주거지역", bc: 60, farMin: 100, farMax: 200 },
  { cat: "주거", name: "제2종일반주거지역", bc: 60, farMin: 150, farMax: 250 },
  { cat: "주거", name: "제3종일반주거지역", bc: 50, farMin: 200, farMax: 300 },
  { cat: "주거", name: "준주거지역", bc: 70, farMin: 200, farMax: 500 },
  { cat: "상업", name: "중심상업지역", bc: 90, farMin: 400, farMax: 1500 },
  { cat: "상업", name: "일반상업지역", bc: 80, farMin: 300, farMax: 1300 },
  { cat: "상업", name: "근린상업지역", bc: 70, farMin: 200, farMax: 900 },
  { cat: "상업", name: "유통상업지역", bc: 80, farMin: 200, farMax: 1100 },
  { cat: "공업", name: "전용공업지역", bc: 70, farMin: 150, farMax: 300 },
  { cat: "공업", name: "일반공업지역", bc: 70, farMin: 200, farMax: 350 },
  { cat: "공업", name: "준공업지역", bc: 70, farMin: 200, farMax: 400 },
  { cat: "녹지", name: "보전녹지지역", bc: 20, farMin: 50, farMax: 80 },
  { cat: "녹지", name: "생산녹지지역", bc: 20, farMin: 50, farMax: 100 },
  { cat: "녹지", name: "자연녹지지역", bc: 20, farMin: 50, farMax: 100 },
  { cat: "관리", name: "계획관리지역", bc: 40, farMin: 50, farMax: 100 },
  { cat: "관리", name: "생산관리지역", bc: 20, farMin: 50, farMax: 80 },
  { cat: "관리", name: "보전관리지역", bc: 20, farMin: 50, farMax: 80 },
  { cat: "기타", name: "농림지역", bc: 20, farMin: 50, farMax: 80 },
  { cat: "기타", name: "자연환경보전지역", bc: 20, farMin: 50, farMax: 80 }
];

const compassPermitSteps = [
  { no: 1, title: "사전 검토", desc: "용도지역 확인, 건폐율·용적률 확인, 도로·일조·인접건물 기준 검토" },
  { no: 2, title: "설계도서 작성", desc: "건축사 설계. 연면적 200㎡ 이상 또는 3층 이상은 원칙적으로 건축사 설계가 필요합니다." },
  { no: 3, title: "건축허가 신청", desc: "허가신청서, 건축계획서, 토지이용계획확인서, 등기사항증명서 등을 관할 행정청에 제출합니다." },
  { no: 4, title: "서류 검토·협의", desc: "건축법, 국토계획법, 소방·주차 등 관계 법령 적합성을 함께 검토합니다." },
  { no: 5, title: "허가증 수령", desc: "허가 유효기간은 원칙적으로 2년이며, 착공 전 연장 신청 가능 여부를 확인합니다." },
  { no: 6, title: "착공신고", desc: "공사 착수 전 착공신고를 하고 감리자 지정 등 필요한 절차를 진행합니다." },
  { no: 7, title: "공사 감리", desc: "설계도서대로 시공되는지 확인하고 공정별 감리보고서를 작성합니다." },
  { no: 8, title: "사용승인 신청", desc: "공사 완료 후 사용승인을 신청하고 현장 검사 및 관계 서류를 확인합니다." },
  { no: 9, title: "사용승인·대장 정리", desc: "사용승인 후 건축물 사용이 가능하며 건축물대장에 최종 현황을 반영합니다." }
];

const compassCompareRows = [
  { label: "대상", permit: "연면적 200㎡ 이상 또는 3층 이상 등", report: "소규모 건축, 일정 요건 충족 시" },
  { label: "처리기간", permit: "통상 15일 내외", report: "통상 3~5일 내외" },
  { label: "건축사 설계", permit: "필수 검토 대상이 많음", report: "일부 소규모는 불필요 가능" },
  { label: "수리 여부", permit: "행정청 심사 후 허가", report: "요건 충족 시 신고 수리" },
  { label: "유효기간", permit: "2년 안 착공 원칙", report: "신고 수리 후 착공" },
  { label: "사용승인", permit: "필요", report: "필요" },
  { label: "위반 시", permit: "형사처벌·이행강제금 가능", report: "벌금·과태료·이행강제금 가능" }
];

const compassViolationRates = [
  { type: "illegalBuild", label: "허가받지 않은 신축·증축·개축", rate: 50 },
  { type: "usechange", label: "허가받지 않은 용도변경", rate: 10 },
  { type: "bcfar", label: "건폐율·용적률 초과 또는 건축선 위반", rate: 10 },
  { type: "noreport", label: "신고하지 않은 건축", rate: 5 },
  { type: "noapproval", label: "사용승인 전 건축물 사용", rate: 5 }
];

const compassPenalties = [
  { violation: "허가 없이 건축", penalty: "5년 이하 징역 또는 5억원 이하 벌금", law: "제106조①", type: "형사처벌" },
  { violation: "허가 없이 용도변경", penalty: "3년 이하 징역 또는 2억원 이하 벌금", law: "제108조", type: "형사처벌" },
  { violation: "설계·감리 의무위반", penalty: "2년 이하 징역 또는 1억원 이하 벌금", law: "제107조", type: "형사처벌" },
  { violation: "사용승인 전 사용", penalty: "2년 이하 징역 또는 1억원 이하 벌금", law: "제110조", type: "형사처벌" },
  { violation: "구조안전 미이행", penalty: "2년 이하 징역 또는 1억원 이하 벌금", law: "제107조", type: "형사처벌" },
  { violation: "건축물대장 허위 기재", penalty: "2년 이하 징역 또는 1억원 이하 벌금", law: "제112조", type: "형사처벌" },
  { violation: "신고 없이 건축", penalty: "200만원 이하 벌금", law: "제111조①", type: "벌금" },
  { violation: "착공신고 미이행", penalty: "200만원 이하 과태료", law: "제113조", type: "과태료" },
  { violation: "감리일지 미작성", penalty: "100만원 이하 과태료", law: "제114조", type: "과태료" },
  { violation: "대장 기재변경 미신청", penalty: "50만원 이하 과태료", law: "제113조", type: "과태료" }
];

const compassQuickQuestions = [
  "용도변경 허가와 신고는 어떻게 구분하나요?",
  "건축신고와 허가 대상을 구분해주세요",
  "이행강제금은 어떻게 계산하나요?",
  "학원 500㎡ 이상이면 어떤 용도로 분류되나요?",
  "용도변경 시 사용승인이 필요한 경우는?"
];

const messages = [];
let loading = false;
let changeFrom = null;
let changeTo = null;
const ordinanceData = window.ORDINANCE_DATA || { records: [], useZones: [], buildingCategories: [], status: {} };
const ordinanceState = { query: "", province: "", selectedId: "" };
const priorityProvinceOrder = ["\uAD11\uC5ED\u00B7\uD2B9\uBCC4\u00B7\uC138\uC885\u00B7\uC81C\uC8FC"];
const priorityMunicipalityOrder = [
  "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC",
  "\uBD80\uC0B0\uAD11\uC5ED\uC2DC",
  "\uB300\uAD6C\uAD11\uC5ED\uC2DC",
  "\uC778\uCC9C\uAD11\uC5ED\uC2DC",
  "\uAD11\uC8FC\uAD11\uC5ED\uC2DC",
  "\uB300\uC804\uAD11\uC5ED\uC2DC",
  "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC",
  "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC",
  "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4"
];
const compassState = { module: "home", from: null, to: null, zoneCategory: "전체", calcLand: "", calcBuild: "", calcFloor: "", calcZone: "제2종일반주거지역", violationType: "illegalBuild", standardValue: "" };
const STYLE_STORAGE_KEY = "mrkStylePreferences";
const themeOptions = ["toss", "claude", "stripe", "dark"];
const fontOptions = ["pretendard", "noto", "suit", "ibm"];

const $ = (selector) => document.querySelector(selector);

function readStylePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STYLE_STORAGE_KEY) || "{}");
    return {
      theme: themeOptions.includes(saved.theme) ? saved.theme : "",
      font: fontOptions.includes(saved.font) ? saved.font : "pretendard"
    };
  } catch {
    return { theme: "", font: "pretendard" };
  }
}

function saveStylePreferences(preferences) {
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Local file previews can occasionally block storage; the live selection still applies.
  }
}

function applyStylePreferences(preferences, persist = true) {
  const theme = themeOptions.includes(preferences.theme) ? preferences.theme : "";
  const font = fontOptions.includes(preferences.font) ? preferences.font : "pretendard";

  if (theme) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  document.documentElement.dataset.font = font;

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.themeOption === theme);
    button.setAttribute("aria-pressed", button.dataset.themeOption === theme ? "true" : "false");
  });

  document.querySelectorAll("[data-font-option]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.fontOption === font);
    button.setAttribute("aria-pressed", button.dataset.fontOption === font ? "true" : "false");
  });

  if (persist) {
    saveStylePreferences({ theme, font });
  }
}

function bindStyleControls() {
  const current = readStylePreferences();
  applyStylePreferences(current, false);
  const styleSwitcher = document.querySelector(".style-switcher");
  const styleToggle = document.querySelector("[data-style-toggle]");

  if (styleSwitcher && styleToggle) {
    styleToggle.addEventListener("click", () => {
      const isOpen = styleSwitcher.classList.toggle("is-open");
      styleToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      styleToggle.setAttribute("aria-label", isOpen ? "스타일과 글씨체 설정 닫기" : "스타일과 글씨체 설정 열기");
    });
  }

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.themeOption;
      const nextTheme = document.documentElement.dataset.theme === selected ? "" : selected;
      applyStylePreferences({ theme: nextTheme, font: document.documentElement.dataset.font || "pretendard" });
    });
  });

  document.querySelectorAll("[data-font-option]").forEach((button) => {
    button.addEventListener("click", () => {
      applyStylePreferences({ theme: document.documentElement.dataset.theme || "", font: button.dataset.fontOption });
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * 조례 원문 스니펫 정제 — 법제처 자동 수집 원문에 섞인 노이즈 제거.
 *  ① HWP 표 괘선(│ ─ └ ┘ ┴ ┬ ├ ┤ ┌ ┐ 등 U+2500~257F)
 *  ② 첨부파일 다운로드 URL·퍼센트 인코딩 파일명
 *  ③ 법제처 API 메타(조례ID·시행일자 숫자열·전화번호·부서코드·hwp)
 *  ④ 항·호 기호(①⑴가.) 앞에서 줄바꿈해 조문처럼 읽히게
 */
function cleanOrdinanceSnippet(raw) {
  if (!raw) return "";
  let t = String(raw);

  // ① 표 괘선 → 공백 (연속은 한 번에)
  t = t.replace(/[─-╿]+/g, " ");
  // ② URL + 인코딩 파일명 + 확장자 꼬리표
  t = t.replace(/https?:\/\/\S+/g, " ");
  t = t.replace(/(?:%[0-9A-Fa-f]{2}){2,}/g, " ");
  t = t.replace(/\b(?:hwp|hwpx|pdf|docx?|xlsx?)\b/gi, " ");
  // ③ 법제처 메타 — 전화번호·8자리 시행일·6자리 이상 ID·부서코드
  t = t.replace(/\b0\d{1,2}-\d{3,4}-\d{4}\b/g, " ");
  t = t.replace(/\b(?:19|20)\d{6}\b/g, " ");
  t = t.replace(/\b\d{6,10}\b/g, " ");
  t = t.replace(/\b[A-Z]\d{4}\b/g, " ");
  // ④ 항·호 기호 앞 줄바꿈 (조문 가독성)
  t = t.replace(/\s*(?=[①-⑳])/g, "\n");
  t = t.replace(/\s*(?=⑴|⑵|⑶|⑷|⑸|⑹|⑺|⑻|⑼|⑽)/g, "\n");
  t = t.replace(/\s*(제\s?\d+조(?:의\s?\d+)?)/g, "\n$1");
  // 공백·줄바꿈 정리
  t = t.replace(/[ \t ]{2,}/g, " ");
  t = t.replace(/\n{2,}/g, "\n");
  t = t.replace(/^\s+|\s+$/g, "");
  // 앞이 잘려 시작하는 문장이면 말줄임 표시
  if (t && /^[가-힣]/.test(t) && !/^[제①-⑳「【]/.test(t)) t = "… " + t;
  return t;
}

function getGroupColor(no) {
  const group = facilityGroups.find((item) => item.no === Number(no));
  return group ? group.color : "#6F614F";
}

function getChangeDecision() {
  if (changeFrom === null || changeTo === null) return null;
  if (changeFrom === changeTo) {
    return {
      key: "register",
      label: "대장기재변경",
      eyebrow: "동일 시설군",
      desc: `같은 ${changeFrom}군 안의 변경입니다.`,
      detail: "건축물대장 기재내용 변경을 신청하는 것이 기본입니다. 다만 시행령 제14조 제4항 단서에 해당하는 용도는 같은 시설군 안에서도 신고가 필요할 수 있습니다.",
      steps: ["현재 건축물대장 용도 확인", "동일 시설군 및 신고 예외 여부 확인", "건축물대장 기재내용 변경 신청", "처리 후 변경 용도 반영"]
    };
  }
  if (changeTo < changeFrom) {
    return {
      key: "permit",
      label: "허가",
      eyebrow: "상위 시설군으로 변경",
      desc: `${changeFrom}군에서 ${changeTo}군으로 올라가는 변경입니다.`,
      detail: "관할 시·군·구청장의 허가를 받아야 합니다. 바닥면적 합계 500㎡ 이상이면 건축사 설계가 필요하고, 100㎡ 이상인 허가 대상 용도변경은 사용승인 절차가 준용됩니다.",
      steps: ["현황 용도와 대지 규제 확인", "변경 용도의 건축기준 적합성 검토", "용도변경 허가 신청", "허가 후 공사·감리 진행", "사용승인 및 건축물대장 정리"]
    };
  }
  return {
    key: "report",
    label: "신고",
    eyebrow: "하위 시설군으로 변경",
    desc: `${changeFrom}군에서 ${changeTo}군으로 내려가는 변경입니다.`,
    detail: "관할 시·군·구청장에게 신고하는 절차를 봅니다. 바닥면적 합계 100㎡ 이상인 신고 대상 용도변경은 사용승인 절차가 준용되며, 500㎡ 미만이고 대수선을 수반하지 않는 경우에는 예외가 있을 수 있습니다.",
    steps: ["현황 용도와 대지 규제 확인", "변경 용도의 건축기준 적합성 검토", "용도변경 신고 제출", "수리 확인", "사용승인 및 건축물대장 정리"]
  };
}

function renderFacilityLadder() {
  const result = getChangeDecision();
  const minNo = changeFrom !== null && changeTo !== null ? Math.min(changeFrom, changeTo) : null;
  const maxNo = changeFrom !== null && changeTo !== null ? Math.max(changeFrom, changeTo) : null;
  const ladder = $("#facilityLadder");

  ladder.innerHTML = facilityGroups.map((group) => {
    const isFrom = changeFrom === group.no;
    const isTo = changeTo === group.no;
    const isBetween = minNo !== null && group.no > minNo && group.no < maxNo;
    const classes = ["facility-row"];
    if (isFrom) classes.push("is-from");
    if (isTo) classes.push(`is-to`, result ? `is-${result.key}` : "");
    if (isBetween) classes.push(result && result.key === "permit" ? "is-permit-path" : "is-report-path");

    return `
      <article class="${classes.join(" ")}" style="--group-color:${group.color}">
        <div class="facility-main">
          <span>${group.no}군</span>
          <div>
            <strong>${escapeHtml(group.name)}</strong>
            <p>${group.usages.map(escapeHtml).join(" · ")}</p>
          </div>
        </div>
        <div class="facility-actions">
          <button type="button" class="${isFrom ? "active-from" : ""}" data-change-action="from" data-group="${group.no}">출발</button>
          <button type="button" class="${isTo ? "active-to" : ""}" data-change-action="to" data-group="${group.no}">도착</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderChangeResult() {
  const target = $("#changeResult");
  const result = getChangeDecision();

  if (!result) {
    target.className = "change-result";
    target.innerHTML = `
      <p class="eyebrow">RESULT</p>
      <h3>출발과 도착 시설군을 선택하세요</h3>
      <div class="empty-result">왼쪽 사다리에서 현재 용도를 출발로, 바꾸려는 용도를 도착으로 누르면 허가·신고·대장기재 여부가 바로 표시됩니다.</div>
    `;
    return;
  }

  target.className = `change-result result-${result.key}`;
  target.innerHTML = `
    <p class="eyebrow">${escapeHtml(result.eyebrow)}</p>
    <h3>${escapeHtml(result.label)}</h3>
    <strong>${escapeHtml(result.desc)}</strong>
    <div>${escapeHtml(result.detail)}</div>
    <ol>
      ${result.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
    </ol>
  `;
}

function renderThresholdGrid() {
  $("#thresholdGrid").innerHTML = thresholdRules.map((rule) => `
    <article class="threshold-card" style="--threshold-accent:${getGroupColor(rule.items[0].sg)}">
      <h4>${escapeHtml(rule.name)}</h4>
      <div>
        ${rule.items.map((item) => `
          <p>
            <span>${escapeHtml(item.area)}</span>
            <strong style="color:${getGroupColor(item.sg)}">${escapeHtml(item.cat)}</strong>
          </p>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderFacilityReference() {
  $("#facilityReference").innerHTML = facilityGroups.map((group) => `
    <article class="facility-ref-card" style="--group-color:${group.color}">
      <div>
        <span>${group.no}군</span>
        <strong>${escapeHtml(group.name)}</strong>
      </div>
      <p>${group.usages.map(escapeHtml).join(" · ")}</p>
    </article>
  `).join("");
}

function renderChangeCases() {
  $("#changeCases").innerHTML = changeCaseGroups.map((group) => `
    <article class="case-column case-${group.key}">
      <div class="case-title">
        <span>${escapeHtml(group.label)}</span>
        <h4>${escapeHtml(group.title)}</h4>
      </div>
      ${group.cases.map((item) => `
        <div class="case-item">
          <p>${escapeHtml(item.from)} → ${escapeHtml(item.to)}</p>
          <strong>${escapeHtml(item.example)}</strong>
          <span>${escapeHtml(item.note)}</span>
        </div>
      `).join("")}
    </article>
  `).join("");
}

function renderChangeTools() {
  renderFacilityLadder();
  renderChangeResult();
  renderThresholdGrid();
  renderFacilityReference();
  renderChangeCases();
}

function getOrdinanceRecords() {
  return Array.isArray(ordinanceData.records) ? ordinanceData.records : [];
}

function setupOrdinanceProvinceSelect() {
  const select = $("#ordinanceProvinceSelect");
  if (!select) return;
  const provinces = [...new Set(getOrdinanceRecords().map((item) => item.province).filter(Boolean))].sort(compareOrdinanceProvinces);
  select.innerHTML = `<option value="">전국 전체</option>${provinces.map((province) => `<option value="${escapeHtml(province)}">${escapeHtml(province)}</option>`).join("")}`;
}

function compareOrdinanceProvinces(a, b) {
  const aRank = priorityProvinceOrder.includes(a) ? priorityProvinceOrder.indexOf(a) : 50;
  const bRank = priorityProvinceOrder.includes(b) ? priorityProvinceOrder.indexOf(b) : 50;
  if (aRank !== bRank) return aRank - bRank;
  return String(a).localeCompare(String(b), "ko-KR");
}

function ordinanceMunicipalityRank(record) {
  const name = record.displayName || "";
  const index = priorityMunicipalityOrder.indexOf(name);
  return index === -1 ? 100 : index;
}

function compareOrdinanceRecords(a, b) {
  const provinceCompare = compareOrdinanceProvinces(a.province || "기타", b.province || "기타");
  if (provinceCompare !== 0) return provinceCompare;
  const aRank = ordinanceMunicipalityRank(a);
  const bRank = ordinanceMunicipalityRank(b);
  if (aRank !== bRank) return aRank - bRank;
  return String(a.displayName || a.shortName || "").localeCompare(String(b.displayName || b.shortName || ""), "ko-KR");
}

function filteredOrdinanceRecords() {
  const q = ordinanceState.query.trim().toLowerCase();
  return getOrdinanceRecords().filter((record) => {
    if (ordinanceState.province && record.province !== ordinanceState.province) return false;
    if (!q) return true;
    const text = [record.displayName, record.shortName, record.province, record.ordinance?.name].filter(Boolean).join(" ").toLowerCase();
    return text.includes(q);
  }).sort(compareOrdinanceRecords);
}

function zoneTone(zone) {
  if (zone.includes("주거")) return "zone-tone-housing";
  if (zone.includes("상업")) return "zone-tone-commerce";
  if (zone.includes("공업")) return "zone-tone-industry";
  if (zone.includes("녹지")) return "zone-tone-green";
  if (zone.includes("관리") || zone.includes("농림")) return "zone-tone-management";
  return "";
}

function formatOrdinanceDate(value) {
  if (!value) return "-";
  const text = String(value);
  if (text.length === 8) return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
  return text;
}

function countUsefulValues(map) {
  return Object.values(map || {}).filter((value) => value && value !== "확인필요" && value !== "해당없음" && value !== "-").length;
}

function ordinanceMarkHtml(value) {
  const mark = value || "확인필요";
  const cls = mark === "○" ? "ordinance-mark-ok" : mark === "◐" ? "ordinance-mark-partial" : mark === "✕" ? "ordinance-mark-no" : mark === "해당없음" ? "ordinance-mark-na" : "ordinance-mark-need";
  const label = mark === "확인필요" ? "확인" : mark;
  return `<span class="ordinance-mark ${cls}">${escapeHtml(label)}</span>`;
}

function renderOrdinanceStatus() {
  const target = $("#ordinanceDataStatus");
  if (!target) return;
  const records = getOrdinanceRecords();
  const done = records.filter((item) => item.collectionStatus === "원문조회완료").length;
  const generated = ordinanceData.generatedAt ? new Date(ordinanceData.generatedAt).toLocaleDateString("ko-KR") : "-";
  target.innerHTML = `<strong>${records.length}개 지자체</strong> · 원문조회완료 ${done}개 · 데이터 생성 ${escapeHtml(generated)} · 자동판정 값은 원문 대조 필요`;
}

function renderOrdinanceList() {
  const list = filteredOrdinanceRecords();
  const count = $("#ordinanceCount");
  const wrap = $("#ordinanceMunicipalityList");
  if (!count || !wrap) return;

  count.textContent = `${list.length}개`;
  if (!list.length) {
    wrap.innerHTML = `<div class="ordinance-empty">검색 결과가 없습니다.</div>`;
    renderOrdinanceReport(null);
    return;
  }

  if (!list.some((record) => record.targetId === ordinanceState.selectedId)) {
    ordinanceState.selectedId = list[0].targetId;
  }

  const groups = new Map();
  list.forEach((record) => {
    const key = record.province || "기타";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  wrap.innerHTML = [...groups.entries()].map(([province, items]) => `
    <div class="municipality-group">
      <div class="municipality-group-title">${escapeHtml(province)} (${items.length})</div>
      ${items.map((record) => `
        <button class="municipality-button ${record.targetId === ordinanceState.selectedId ? "is-active" : ""}" type="button" data-ordinance-id="${escapeHtml(record.targetId)}">
          <span>
            <strong>${escapeHtml(record.displayName)}</strong>
            <span>${escapeHtml(record.ordinance?.name || "조례명 확인필요")}</span>
          </span>
          <em>${record.slope?.value ? `${escapeHtml(record.slope.value)}°` : escapeHtml(record.type || "")}</em>
        </button>
      `).join("")}
    </div>
  `).join("");

  renderOrdinanceReport(list.find((record) => record.targetId === ordinanceState.selectedId) || list[0]);
}

function renderOrdinanceReport(record) {
  const target = $("#ordinanceReport");
  if (!target) return;
  if (!record) {
    target.innerHTML = `<div class="ordinance-empty">지자체를 선택하면 전국 건축제한 정보가 표시됩니다.</div>`;
    return;
  }

  const zones = Array.isArray(ordinanceData.useZones) ? ordinanceData.useZones : [];
  const categories = Array.isArray(ordinanceData.buildingCategories) ? ordinanceData.buildingCategories : [];
  const ordinance = record.ordinance || {};
  const slope = record.slope || {};
  const covDone = countUsefulValues(record.coverageRates);
  const farDone = countUsefulValues(record.floorAreaRatios);

  const coverageCards = zones.map((zone) => {
    const coverage = record.coverageRates?.[zone] || "-";
    const far = record.floorAreaRatios?.[zone] || "-";
    if (coverage === "해당없음" && far === "해당없음") return "";
    return `
      <article class="coverage-cell">
        <strong>${escapeHtml(zone)}</strong>
        <div class="coverage-pair">
          <span class="cov-badge">건폐율 ${escapeHtml(coverage === "확인필요" ? "?" : coverage)}</span>
          <span class="far-badge">용적률 ${escapeHtml(far === "확인필요" ? "?" : far)}</span>
        </div>
      </article>
    `;
  }).join("");

  const categoryHeader = categories.map((category) => `<th>${escapeHtml(category.name)}<br><small>${escapeHtml(category.ordinanceNo || "")}</small></th>`).join("");
  const rows = zones.map((zone) => {
    const restrictions = record.restrictions?.[zone] || {};
    const coverage = record.coverageRates?.[zone] || "-";
    const far = record.floorAreaRatios?.[zone] || "-";
    return `
      <tr class="${zoneTone(zone)}">
        <td class="sticky-zone">${escapeHtml(zone)}</td>
        <td><span class="cov-badge">${escapeHtml(coverage === "해당없음" ? "-" : coverage)}</span></td>
        <td><span class="far-badge">${escapeHtml(far === "해당없음" ? "-" : far)}</span></td>
        ${categories.map((category) => `<td>${ordinanceMarkHtml(restrictions[category.id])}</td>`).join("")}
      </tr>
    `;
  }).join("");

  const notes = (record.sourceNotes || []).length
    ? record.sourceNotes.map((note) => `
      <div class="note-item">
        <strong>${escapeHtml(note.topic || "근거")}${note.status ? ` · ${escapeHtml(note.status)}` : ""}</strong>
        <p>${escapeHtml(cleanOrdinanceSnippet(note.snippet) || "근거 문구 확인필요")}</p>
      </div>
    `).join("")
    : `<div class="note-item"><strong>근거 조문</strong><p>원문 조회 후 근거 메모가 표시됩니다.</p></div>`;

  target.innerHTML = `
    <div class="ordinance-report-head">
      <div class="ordinance-report-head-row">
        <div>
          <h3>${escapeHtml(record.displayName)} 건축제한</h3>
          <p>${escapeHtml(ordinance.name || "도시계획 조례")} 기준의 건폐율·용적률·용도지역별 행위제한 자동 정리입니다.</p>
        </div>
        <span class="province-pill">${escapeHtml(record.province || "")} · ${escapeHtml(record.type || "")}</span>
      </div>
    </div>

    <div class="ordinance-meta-grid">
      <div class="ordinance-meta-cell">
        <p>개발행위 경사도</p>
        <strong>${slope.value ? `${escapeHtml(slope.value)}${escapeHtml(slope.unit || "도")}` : "확인필요"}</strong>
        <small>${escapeHtml(slope.status || "자동추출-검증필요")}</small>
      </div>
      <div class="ordinance-meta-cell">
        <p>건폐율 확인</p>
        <strong>${covDone} / ${zones.length}개</strong>
        <small>용도지역별 상한</small>
      </div>
      <div class="ordinance-meta-cell">
        <p>용적률 확인</p>
        <strong>${farDone} / ${zones.length}개</strong>
        <small>용도지역별 상한</small>
      </div>
      <div class="ordinance-meta-cell">
        <p>조례 시행일</p>
        <strong>${escapeHtml(formatOrdinanceDate(ordinance.effectiveDate))}</strong>
        <small>MST ${escapeHtml(ordinance.mst || "-")}</small>
      </div>
    </div>

    <div class="ordinance-report-section">
      <h4>용도지역별 건폐율·용적률</h4>
      <div class="coverage-grid">${coverageCards || `<div class="ordinance-empty">건폐율·용적률 데이터가 없습니다.</div>`}</div>
    </div>

    <div class="ordinance-report-section">
      <h4>21개 용도지역 × 16개 건축물 행위제한</h4>
      <div class="restriction-table-wrap">
        <table class="restriction-table">
          <thead>
            <tr>
              <th class="sticky-zone">용도지역</th>
              <th>건폐율</th>
              <th>용적률</th>
              ${categoryHeader}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div class="ordinance-report-section">
      <h4>근거 조문 메모</h4>
      <div class="note-list">${notes}</div>
    </div>
  `;
}

function renderOrdinanceTools() {
  if (!$("#ordinanceReport")) return;
  setupOrdinanceProvinceSelect();
  renderOrdinanceStatus();
  renderOrdinanceList();
}

function parseNumber(value) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatMoney(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function getCompassDecision() {
  const { from, to } = compassState;
  if (!from || !to) return null;
  if (from === to) {
    return {
      key: "register",
      label: "대장기재변경",
      title: "같은 시설군 안에서 변경",
      desc: "건축물대장 기재내용 변경 신청이 기본입니다. 다만 시행령 제14조 제4항 단서 용도는 같은 시설군 안에서도 신고가 필요할 수 있습니다."
    };
  }
  if (to < from) {
    return {
      key: "permit",
      label: "허가",
      title: "상위 시설군으로 변경",
      desc: "관할 시·군·구청장의 허가를 받아야 합니다. 바닥면적 500㎡ 이상이면 건축사 설계 필요 여부도 함께 확인합니다."
    };
  }
  return {
    key: "report",
    label: "신고",
    title: "하위 시설군으로 변경",
    desc: "관할 시·군·구청장에게 용도변경 신고를 합니다. 바닥면적 100㎡ 이상이면 사용승인 준용 여부를 함께 확인합니다."
  };
}

function renderCompassNav() {
  const target = $("#compassNav");
  if (!target) return;
  target.innerHTML = compassModules.map((item) => `
    <button type="button" class="${compassState.module === item.key ? "is-active" : ""}" data-compass-target="${escapeHtml(item.key)}" role="tab" aria-selected="${compassState.module === item.key ? "true" : "false"}">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.sub)}</span>
    </button>
  `).join("");
}

function renderCompassHome() {
  const cards = compassModules.filter((item) => item.key !== "home").map((item) => `
    <button type="button" class="compass-feature" data-compass-target="${escapeHtml(item.key)}">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.sub)}</span>
    </button>
  `).join("");

  return `
    <div class="compass-hero">
      <p>건축법 제21035호 · 시행령 제35717호 · 2026.2.27 시행 기준</p>
      <h3>부동산 중개사용 건축법 가이드</h3>
      <div>용도변경 허가·신고·대장기재 판단부터 건축허가 절차, 건폐율·용적률, 이행강제금과 벌칙까지 첨부 자료의 핵심 흐름을 현재 홈페이지 안에 통합했습니다.</div>
      <button type="button" data-compass-target="usechange">용도변경 판단기 열기</button>
    </div>
    <div class="compass-feature-grid">${cards}</div>
    <div class="compass-warning">지자체별 건축조례, 지구단위계획, 특별건축구역 등에 따라 실제 기준이 강화될 수 있으므로 최종 업무 전 관할 시·군·구청 건축과 확인이 필요합니다.</div>
  `;
}

function renderCompassUsechange() {
  const minNo = compassState.from && compassState.to ? Math.min(compassState.from, compassState.to) : null;
  const maxNo = compassState.from && compassState.to ? Math.max(compassState.from, compassState.to) : null;
  const decision = getCompassDecision();
  const ladder = facilityGroups.map((group) => {
    const isFrom = compassState.from === group.no;
    const isTo = compassState.to === group.no;
    const isBetween = minNo !== null && group.no > minNo && group.no < maxNo;
    const rowClass = ["compass-ladder-row", isFrom ? "is-from" : "", isTo ? "is-to" : "", isBetween ? "is-between" : ""].filter(Boolean).join(" ");
    return `
      <div class="${rowClass}">
        <div>
          <span>${group.no}군</span>
          <strong>${escapeHtml(group.name)}</strong>
          <p>${group.usages.map(escapeHtml).join(" · ")}</p>
        </div>
        <div class="compass-ladder-actions">
          <button type="button" class="${isFrom ? "is-active" : ""}" data-compass-action="from" data-group="${group.no}">출발</button>
          <button type="button" class="${isTo ? "is-active" : ""}" data-compass-action="to" data-group="${group.no}">도착</button>
        </div>
      </div>
    `;
  }).join("");
  const result = decision
    ? `<div class="compass-result result-${decision.key}"><p>${escapeHtml(decision.title)}</p><h3>${escapeHtml(decision.label)}</h3><div>${escapeHtml(decision.desc)}</div></div>`
    : `<div class="compass-result"><p>출발·도착 선택</p><h3>판단 대기</h3><div>시설군 사다리에서 현재 용도와 바꿀 용도를 선택하면 허가·신고·대장기재 여부가 표시됩니다.</div></div>`;
  const cases = changeCaseGroups.map((group) => `
    <article class="compass-case">
      <p>${escapeHtml(group.label)}</p>
      <strong>${escapeHtml(group.title)}</strong>
      <span>${group.cases.map((item) => escapeHtml(item.example)).join(" / ")}</span>
    </article>
  `).join("");
  const thresholds = thresholdRules.map((rule) => `
    <article class="compass-threshold">
      <strong>${escapeHtml(rule.name)}</strong>
      ${rule.items.map((item) => `<span><b>${escapeHtml(item.area)}</b>${escapeHtml(item.cat)}</span>`).join("")}
    </article>
  `).join("");

  return `
    <div class="compass-two-col">
      <div>
        <div class="compass-section-head">
          <p>건축법 제19조 · 시행령 제14조</p>
          <h3>용도변경 허가·신고·대장기재 판단기</h3>
        </div>
        <div class="ladder-guide"><span class="permit-direction">상위군 방향: 허가</span><span class="report-direction">하위군 방향: 신고</span></div>
        <div class="compass-ladder">${ladder}</div>
      </div>
      <aside>
        ${result}
        <button type="button" class="compass-reset" data-compass-action="reset">초기화</button>
      </aside>
    </div>
    <div class="compass-case-grid">${cases}</div>
    <div class="compass-subhead">
      <p>별표1 면적 기준</p>
      <h4>면적에 따라 용도분류가 달라지는 시설</h4>
    </div>
    <div class="compass-threshold-grid">${thresholds}</div>
    <div class="compass-warning">핵심 주의사항: 바닥면적 100㎡ 이상은 사용승인 절차를 준용할 수 있고, 500㎡ 이상 허가 대상은 건축사 설계 필요 여부를 확인해야 합니다. 1종·2종 근린생활시설 상호 변경도 예외 신고 대상 여부를 반드시 봅니다.</div>
  `;
}

function renderCompassPermit() {
  return `
    <div class="compass-section-head">
      <p>건축법 제11조 · 제14조</p>
      <h3>건축허가 절차 가이드</h3>
    </div>
    <div class="compass-summary-grid">
      <article><p>건축허가 대상</p><strong>연면적 200㎡ 이상 또는 3층 이상</strong><span>특수구조·특수용도 건축물은 별도 검토가 필요합니다. 처리기간은 통상 15일 내외입니다.</span></article>
      <article><p>건축신고 대상</p><strong>소규모 건축 또는 표준설계도서 사용</strong><span>요건을 갖춘 신고는 비교적 간소하게 처리되며 통상 3~5일 내외로 봅니다.</span></article>
    </div>
    <div class="compass-timeline">
      ${compassPermitSteps.map((step) => `<article><span>${step.no}</span><div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.desc)}</p></div></article>`).join("")}
    </div>
    <div class="compass-info">주요 첨부서류: 건축허가신청서, 건축계획서, 설계도서, 토지이용계획확인서, 등기사항증명서, 구조·설비 관련 서류 등을 사안별로 준비합니다.</div>
  `;
}

function renderCompassCalculator() {
  const options = compassZones.map((zone) => `<option value="${escapeHtml(zone.name)}" ${compassState.calcZone === zone.name ? "selected" : ""}>${escapeHtml(zone.name)}</option>`).join("");
  return `
    <div class="compass-section-head">
      <p>국토계획법 제77조·제78조</p>
      <h3>건폐율·용적률 계산기</h3>
    </div>
    <div class="compass-form-grid">
      <label>대지면적(㎡)<input data-compass-calc="land" type="text" inputmode="decimal" value="${escapeHtml(compassState.calcLand)}" placeholder="예: 330"></label>
      <label>건축면적(㎡)<input data-compass-calc="build" type="text" inputmode="decimal" value="${escapeHtml(compassState.calcBuild)}" placeholder="예: 180"></label>
      <label>연면적(㎡)<input data-compass-calc="floor" type="text" inputmode="decimal" value="${escapeHtml(compassState.calcFloor)}" placeholder="예: 620"></label>
      <label>용도지역<select data-compass-calc="zone">${options}</select></label>
    </div>
    <div class="compass-result-grid">
      <div id="compassCoverageResult" class="compass-metric"></div>
      <div id="compassFarResult" class="compass-metric"></div>
    </div>
    <div id="compassLimitHint" class="compass-info"></div>
  `;
}

function renderCompassCalculatorResult() {
  const coverageTarget = $("#compassCoverageResult");
  const farTarget = $("#compassFarResult");
  const hintTarget = $("#compassLimitHint");
  if (!coverageTarget || !farTarget || !hintTarget) return;
  const land = parseNumber(compassState.calcLand);
  const build = parseNumber(compassState.calcBuild);
  const floor = parseNumber(compassState.calcFloor);
  const zone = compassZones.find((item) => item.name === compassState.calcZone) || compassZones[0];
  const coverage = land > 0 && build > 0 ? (build / land) * 100 : 0;
  const far = land > 0 && floor > 0 ? (floor / land) * 100 : 0;
  const coverageStatus = coverage ? (coverage <= zone.bc ? "적합" : "초과") : "미입력";
  const farStatus = far ? (far <= zone.farMax ? "적합" : "초과") : "미입력";
  coverageTarget.className = `compass-metric ${coverageStatus === "초과" ? "is-danger" : coverageStatus === "적합" ? "is-good" : ""}`;
  farTarget.className = `compass-metric ${farStatus === "초과" ? "is-danger" : farStatus === "적합" ? "is-good" : ""}`;
  coverageTarget.innerHTML = `<p>건폐율</p><strong>${coverage ? `${formatNumber(coverage)}%` : "-"}</strong><span>한도 ${zone.bc}% · ${coverageStatus}</span>`;
  farTarget.innerHTML = `<p>용적률</p><strong>${far ? `${formatNumber(far)}%` : "-"}</strong><span>한도 ${zone.farMin}~${zone.farMax}% · ${farStatus}</span>`;
  hintTarget.innerHTML = `계산 방식: 건폐율 = 건축면적 ÷ 대지면적 × 100, 용적률 = 연면적 ÷ 대지면적 × 100. 선택 지역은 ${escapeHtml(zone.name)}입니다.`;
}

function renderCompassZones() {
  const categories = ["전체", "주거", "상업", "공업", "녹지", "관리", "기타"];
  const filters = categories.map((cat) => `<button type="button" class="${compassState.zoneCategory === cat ? "is-active" : ""}" data-zone-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join("");
  const rows = compassZones
    .filter((zone) => compassState.zoneCategory === "전체" || zone.cat === compassState.zoneCategory)
    .map((zone) => `
      <tr>
        <td><span class="compass-zone-pill">${escapeHtml(zone.cat)}</span></td>
        <td>${escapeHtml(zone.name)}</td>
        <td>${zone.bc}%</td>
        <td>${zone.farMin}~${zone.farMax}%</td>
      </tr>
    `).join("");
  return `
    <div class="compass-section-head">
      <p>용도지역별 기준</p>
      <h3>21개 용도지역 건축제한 기준표</h3>
    </div>
    <div class="compass-filter-row">${filters}</div>
    <div class="compass-table-wrap">
      <table class="compass-table">
        <thead><tr><th>구분</th><th>용도지역</th><th>건폐율</th><th>용적률 범위</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="compass-warning">위 기준은 국토계획법상 최대 한도이며 시·군 조례로 더 강화될 수 있습니다. 지구단위계획, 특별건축구역 등도 함께 확인하세요.</div>
  `;
}

function renderCompassCompare() {
  return `
    <div class="compass-section-head">
      <p>건축법 제11조 · 제14조</p>
      <h3>건축신고 vs 건축허가 비교</h3>
    </div>
    <div class="compass-table-wrap">
      <table class="compass-table">
        <thead><tr><th>구분</th><th>건축허가</th><th>건축신고</th></tr></thead>
        <tbody>
          ${compassCompareRows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.permit)}</td><td>${escapeHtml(row.report)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="compass-info">용도변경은 상위 시설군으로 올라가면 허가, 하위 시설군으로 내려가면 신고, 같은 시설군 안에서는 대장기재변경을 기본으로 봅니다. 바닥면적 100㎡·500㎡ 기준은 별도로 확인합니다.</div>
  `;
}

function renderCompassEnforcement() {
  const buttons = compassViolationRates.map((item) => `<button type="button" class="${compassState.violationType === item.type ? "is-active" : ""}" data-violation-type="${escapeHtml(item.type)}"><strong>${item.rate}%</strong>${escapeHtml(item.label)}</button>`).join("");
  return `
    <div class="compass-section-head">
      <p>건축법 제80조</p>
      <h3>이행강제금 계산기</h3>
    </div>
    <div class="compass-rate-row">${buttons}</div>
    <div class="compass-form-grid compact">
      <label>시가표준액(원)<input data-compass-enforcement="standard" type="text" inputmode="numeric" value="${escapeHtml(compassState.standardValue)}" placeholder="예: 120000000"></label>
    </div>
    <div id="compassEnforcementResult" class="compass-enforcement-result"></div>
    <div class="compass-info">연 2회, 최대 5회까지 반복 부과될 수 있습니다. 시가표준액은 지자체 고시 건축물 기준가액과 건축물대장 등으로 확인합니다.</div>
  `;
}

function renderCompassEnforcementResult() {
  const target = $("#compassEnforcementResult");
  if (!target) return;
  const rate = compassViolationRates.find((item) => item.type === compassState.violationType) || compassViolationRates[0];
  const standard = parseNumber(compassState.standardValue);
  const amount = standard * (rate.rate / 100);
  target.innerHTML = `
    <p>${escapeHtml(rate.label)}</p>
    <strong>${standard ? formatMoney(amount) : "-"}</strong>
    <span>1회 이행강제금 = 시가표준액 × ${rate.rate}%</span>
  `;
}

function renderCompassPenalties() {
  return `
    <div class="compass-section-head">
      <p>건축법 제106조~제115조의2</p>
      <h3>벌칙·과태료 기준</h3>
    </div>
    <div class="compass-table-wrap">
      <table class="compass-table">
        <thead><tr><th>위반 사항</th><th>처벌</th><th>근거 조문</th><th>구분</th></tr></thead>
        <tbody>
          ${compassPenalties.map((row) => `<tr><td>${escapeHtml(row.violation)}</td><td>${escapeHtml(row.penalty)}</td><td>${escapeHtml(row.law)}</td><td><span class="penalty-pill">${escapeHtml(row.type)}</span></td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="compass-warning">형사처벌, 벌금, 과태료, 이행강제금은 사안에 따라 병과될 수 있습니다. 위반 건축물은 공사중지·시정명령·원상복구명령 대상이 될 수 있습니다.</div>
  `;
}

function renderCompassQa() {
  const questions = compassQuickQuestions.map((question) => `<button type="button" data-compass-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`).join("");
  return `
    <div class="compass-section-head">
      <p>건축법 Q&A</p>
      <h3>MR.K에게 바로 질문하기</h3>
    </div>
    <div class="compass-qa-box">
      <p>첨부 자료의 Q&A 기능은 현재 홈페이지의 MR.K 상담 화면과 연결했습니다. 아래 빠른 질문을 누르면 질문창으로 이동합니다.</p>
      <div class="compass-question-list">${questions}</div>
      <button type="button" class="compass-primary" data-compass-target="ask">MR.K 질문 화면 열기</button>
    </div>
  `;
}

function renderCompassPanel() {
  const target = $("#compassPanel");
  if (!target) return;
  const renderers = {
    home: renderCompassHome,
    usechange: renderCompassUsechange,
    permit: renderCompassPermit,
    calculator: renderCompassCalculator,
    zones: renderCompassZones,
    compare: renderCompassCompare,
    enforcement: renderCompassEnforcement,
    penalties: renderCompassPenalties,
    qa: renderCompassQa
  };
  target.innerHTML = (renderers[compassState.module] || renderCompassHome)();
  renderCompassCalculatorResult();
  renderCompassEnforcementResult();
}

function renderCompassTools() {
  if (!$("#compassPanel")) return;
  renderCompassNav();
  renderCompassPanel();
}

function renderStaticLists() {
  $("#conceptGrid").innerHTML = concepts.map((item) => `
    <article class="concept-card">
      <span class="number">${item.tag}</span>
      <h3>${escapeHtml(item.term)}</h3>
      <p>${escapeHtml(item.desc)}</p>
    </article>
  `).join("");

  $("#tierGrid").innerHTML = tiers.map((item) => `
    <article class="tier-card">
      <span class="level">${escapeHtml(item.level)}</span>
      <h3>${escapeHtml(item.kr)}</h3>
      <div class="maker">${escapeHtml(item.maker)}</div>
      <span class="statute">${escapeHtml(item.no)}</span>
      <p>${escapeHtml(item.desc)}</p>
    </article>
  `).join("");

  $("#useGrid").innerHTML = uses.map((item) => `
    <article class="use-card">
      <span class="use-index">${escapeHtml(item.n)}</span>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.ex)}</span>
      </div>
    </article>
  `).join("");

  $("#stepGrid").innerHTML = steps.map((item) => `
    <article class="step-card">
      <span class="step-number">${escapeHtml(item.n)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.desc)}</p>
    </article>
  `).join("");

  $("#suggestionList").innerHTML = suggestions.map((label) => `
    <button type="button" data-question="${escapeHtml(label)}">${escapeHtml(label)}</button>
  `).join("");

  renderChangeTools();
  renderOrdinanceTools();
  renderCompassTools();
}

function scrollToBottom() {
  const list = $("#messageList");
  list.scrollTop = list.scrollHeight;
}

function renderMessages() {
  const list = $("#messageList");
  const greeting = list.querySelector(".greeting");
  list.innerHTML = "";
  list.appendChild(greeting);

  messages.forEach((message) => {
    const row = document.createElement("div");
    row.className = message.role === "user" ? "message user-message" : "message bot-message";
    if (message.role === "assistant") {
      row.innerHTML = `<span class="mini-avatar">K</span><div>${escapeHtml(message.text)}</div>`;
    } else {
      row.innerHTML = `<div>${escapeHtml(message.text)}</div>`;
    }
    list.appendChild(row);
  });

  if (loading) {
    const row = document.createElement("div");
    row.className = "message bot-message";
    row.innerHTML = `<span class="mini-avatar">K</span><div class="typing-bubble"><span></span><span></span><span></span></div>`;
    list.appendChild(row);
  }

  scrollToBottom();
}

function setLoading(next) {
  loading = next;
  $("#sendButton").disabled = next;
  $("#chatInput").disabled = next;
  document.querySelectorAll("#suggestionList button").forEach((button) => {
    button.disabled = next;
  });
  renderMessages();
}

async function sendQuestion(rawQuestion) {
  const input = $("#chatInput");
  const question = (rawQuestion ?? input.value).trim();
  if (!question || loading) return;

  messages.push({ role: "user", text: question });
  input.value = "";
  setLoading(true);

  let answer;
  try {
    answer = await requestAnswer(question);
  } catch (error) {
    answer = "죄송합니다, 일시적인 오류로 답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  messages.push({ role: "assistant", text: answer || "죄송합니다, 답변을 생성하지 못했습니다. 질문을 조금 더 구체적으로 적어주시겠어요?" });
  setLoading(false);
  input.focus();
}

async function requestAnswer(question) {
  if (window.claude && typeof window.claude.complete === "function") {
    const history = messages.map((message, index) => ({
      role: message.role,
      content: (index === 0 ? `${PERSONA}\n\n사용자 질문: ` : "") + message.text
    }));
    return window.claude.complete({ messages: history });
  }

  await new Promise((resolve) => setTimeout(resolve, 450));
  return localAnswer(question);
}

function localAnswer(question) {
  const q = question.replace(/\s+/g, "");

  if (q.includes("용도변경")) {
    return "결론부터 말씀드리면, 용도변경은 9개 시설군의 번호 이동으로 1차 판단합니다. 도착 시설군 번호가 현재보다 작아지는 상위군 이동은 허가, 번호가 커지는 하위군 이동은 신고, 같은 시설군 안의 변경은 건축물대장 기재변경이 기본입니다. 다만 같은 군 안에서도 목욕장, 학원, 단란주점, 노래연습장, 생활숙박시설, 유흥주점 등은 신고 예외를 확인해야 합니다. 바닥면적 100㎡ 이상이면 사용승인 준용, 500㎡ 이상 허가 대상이면 건축사 설계를 함께 검토합니다. 정확한 판단은 관할 행정청 또는 전문가 상담을 권합니다.";
  }

  if (q.includes("같은시설군") || (q.includes("같은") && q.includes("신고"))) {
    return "같은 시설군 안의 변경은 원칙적으로 건축물대장 기재내용 변경 신청 대상입니다. 그러나 시행령 제14조 제4항 단서에 따라 목욕장, 의원 등, 공연장, 게임시설, 학원, 골프연습장·놀이형시설, 단란주점, 안마시술소, 노래연습장, 주문배송시설, 생활숙박시설, 유흥주점 등으로 바꾸는 경우에는 신고가 필요할 수 있습니다. 따라서 같은 7군 근린생활시설 안의 변경이라도 세부 업종을 반드시 확인해야 합니다.";
  }

  if (q.includes("시설군")) {
    return "시설군은 용도변경 허가·신고를 판단하기 위한 9단계 분류입니다. 1군 자동차 관련, 2군 산업 등, 3군 전기통신, 4군 문화집회, 5군 영업, 6군 교육·복지, 7군 근린생활, 8군 주거업무, 9군 그 밖의 시설군 순서입니다. 번호가 작아지는 방향은 허가, 번호가 커지는 방향은 신고, 같은 번호 안에서는 대장기재변경을 우선 봅니다. 다만 면적과 세부 용도에 따라 별표1 분류가 달라질 수 있습니다.";
  }

  if (q.includes("면적") || q.includes("분류")) {
    return "면적 기준에 따라 별표1 용도분류가 바뀌는 시설이 많습니다. 예를 들어 소매점은 1,000㎡ 미만이면 제1종 근린생활시설, 1,000㎡ 이상이면 판매시설입니다. 휴게음식점·제과점은 300㎡, 학원·공연장·종교집회장·제조업소는 500㎡, 단란주점은 150㎡가 중요한 기준입니다. 금융업소·사무소는 30㎡ 미만, 30~500㎡ 미만, 500㎡ 이상으로 나뉘므로 면적 확인이 먼저입니다.";
  }

  if (q.includes("건폐율") || q.includes("용적률")) {
    return "건폐율은 대지면적에 대한 건축면적의 비율이고, 용적률은 대지면적에 대한 지상층 연면적의 비율입니다. 쉽게 말해 건폐율은 땅 위에 얼마나 넓게 덮을 수 있는지, 용적률은 전체 바닥면적을 얼마나 쌓을 수 있는지를 보는 기준입니다. 두 비율은 용도지역과 지구, 조례에 따라 상한이 다릅니다. 토지 매입 전에는 토지이용계획과 지자체 조례를 함께 확인해야 합니다.";
  }

  if (q.includes("전국건축제한") || q.includes("조례") || q.includes("경사도")) {
    return "전국 건축제한은 지자체 도시계획 조례마다 달라지는 건폐율, 용적률, 용도지역별 건축 가능 여부, 개발행위허가 경사도 기준을 함께 보는 영역입니다. 같은 자연녹지지역이라도 지자체 조례에 따라 경사도, 표고, 입목축적, 건축물 용도 제한이 달라질 수 있습니다. 따라서 토지 검토 시에는 국토계획법 기준과 함께 해당 시·군·구 도시계획 조례 원문을 반드시 대조해야 합니다. 화면의 자동 추출 값은 빠른 검토용으로 보고, 최종 판단은 조례 원문과 관할 행정청 확인을 권합니다.";
  }

  if (q.includes("증축") || q.includes("대수선")) {
    return "증축은 기존 건축물의 건축면적, 연면적, 층수 또는 높이를 늘리는 행위입니다. 대수선은 내력벽, 기둥, 보, 지붕틀, 주계단처럼 주요 구조부를 해체·수선·변경하는 행위를 말합니다. 증축은 규모가 늘어나는 문제이고, 대수선은 구조 안전과 관련된 변경이라는 점이 핵심 차이입니다. 두 행위 모두 규모와 위치, 용도에 따라 허가나 신고 대상이 될 수 있습니다.";
  }

  if ((q.includes("건축신고") || q.includes("신고")) && (q.includes("건축허가") || q.includes("허가"))) {
    return "건축허가는 행정청이 법령 적합성을 심사해 승인하는 절차이고, 건축신고는 일정 소규모 건축에 대해 요건을 갖춰 신고하면 수리되는 간소 절차입니다. 허가 대상은 규모가 크거나 용도·입지상 검토가 필요한 경우가 많습니다. 신고 대상이라도 착공신고와 사용승인 절차는 별도로 필요할 수 있습니다. 지자체 조례와 대지 조건에 따라 달라지므로 사전 검토가 중요합니다.";
  }

  if (q.includes("대지") || q.includes("도로")) {
    return "건축에서 대지와 도로 조건은 출발점입니다. 대지는 원칙적으로 한 필지를 기준으로 보고, 건축하려면 건축법상 도로에 일정 길이 이상 접해야 하는 접도 요건을 확인해야 합니다. 도로 폭, 지목, 현황도로 여부, 사도 여부에 따라 허가 가능성이 달라질 수 있습니다. 토지 개발이나 매입 전에는 토지이용계획확인서와 지적도, 현황도로를 함께 확인해야 합니다.";
  }

  if (q.includes("건축물") || q.includes("건축법")) {
    return "건축법은 건축물의 안전·기능·환경·미관을 확보하기 위한 기본 법령입니다. 건축물은 토지에 정착하고 지붕과 기둥 또는 벽이 있는 공작물을 중심으로 판단합니다. 실제 검토에서는 건축법뿐 아니라 시행령, 시행규칙, 국토계획법, 주차장법, 소방 관계 법령, 지자체 조례까지 함께 보아야 합니다. 질문하신 사안의 위치, 용도, 규모를 알려주시면 더 구체적으로 설명드릴 수 있습니다.";
  }

  return "핵심은 위치, 용도, 규모를 먼저 정리한 뒤 건축법·시행령·시행규칙을 함께 보는 것입니다. 건축법은 큰 원칙을, 시행령은 용도별 건축물과 세부 기준을, 시행규칙은 신청 서류와 절차를 다룹니다. 같은 건축행위라도 용도지역, 대지 조건, 연면적, 구조, 지자체 조례에 따라 허가·신고 여부가 달라질 수 있습니다. 질문하신 건의 소재지, 현재 용도, 변경하려는 용도, 면적을 알려주시면 더 정확히 풀어드리겠습니다.";
}

function bindChat() {
  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    sendQuestion();
  });

  $("#suggestionList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-question]");
    if (!button) return;
    sendQuestion(button.dataset.question);
  });
}

function bindChangeTools() {
  $("#facilityLadder").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-change-action]");
    if (!button) return;
    const groupNo = Number(button.dataset.group);
    if (button.dataset.changeAction === "from") {
      changeFrom = groupNo;
    } else {
      changeTo = groupNo;
    }
    renderFacilityLadder();
    renderChangeResult();
  });

  $("#resetChange").addEventListener("click", () => {
    changeFrom = null;
    changeTo = null;
    renderFacilityLadder();
    renderChangeResult();
  });
}

function bindOrdinanceTools() {
  const search = $("#ordinanceSearchInput");
  const province = $("#ordinanceProvinceSelect");
  const list = $("#ordinanceMunicipalityList");
  const printButton = $("#ordinancePrintButton");
  const imageButton = $("#ordinanceImageButton");
  if (!search || !province || !list) return;

  search.addEventListener("input", (event) => {
    ordinanceState.query = event.target.value;
    renderOrdinanceList();
  });

  province.addEventListener("change", (event) => {
    ordinanceState.province = event.target.value;
    renderOrdinanceList();
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-ordinance-id]");
    if (!button) return;
    ordinanceState.selectedId = button.dataset.ordinanceId;
    renderOrdinanceList();
  });

  if (printButton) {
    printButton.addEventListener("click", () => {
      document.body.classList.add("print-ordinance");
      window.print();
      setTimeout(() => document.body.classList.remove("print-ordinance"), 800);
    });
  }

  if (imageButton) {
    imageButton.addEventListener("click", downloadOrdinanceImage);
  }
}

function bindCompassTools() {
  const nav = $("#compassNav");
  const panel = $("#compassPanel");
  if (!nav || !panel) return;

  function openCompassModule(moduleKey) {
    if (!compassModules.some((item) => item.key === moduleKey)) return;
    compassState.module = moduleKey;
    renderCompassTools();
  }

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-compass-target]");
    if (!button) return;
    openCompassModule(button.dataset.compassTarget);
  });

  panel.addEventListener("click", (event) => {
    const moduleButton = event.target.closest("button[data-compass-target]");
    if (moduleButton) {
      const target = moduleButton.dataset.compassTarget;
      if (target === "ask") {
        showView("askmrk");
        return;
      }
      openCompassModule(target);
      return;
    }

    const questionButton = event.target.closest("button[data-compass-question]");
    if (questionButton) {
      const input = $("#chatInput");
      showView("askmrk");
      if (input) {
        input.value = questionButton.dataset.compassQuestion;
        input.focus();
      }
      return;
    }

    const actionButton = event.target.closest("button[data-compass-action]");
    if (actionButton) {
      const action = actionButton.dataset.compassAction;
      const groupNo = Number(actionButton.dataset.group);
      if (action === "from") compassState.from = groupNo;
      if (action === "to") compassState.to = groupNo;
      if (action === "reset") {
        compassState.from = null;
        compassState.to = null;
      }
      renderCompassPanel();
      return;
    }

    const categoryButton = event.target.closest("button[data-zone-category]");
    if (categoryButton) {
      compassState.zoneCategory = categoryButton.dataset.zoneCategory;
      renderCompassPanel();
      return;
    }

    const violationButton = event.target.closest("button[data-violation-type]");
    if (violationButton) {
      compassState.violationType = violationButton.dataset.violationType;
      renderCompassPanel();
    }
  });

  panel.addEventListener("input", (event) => {
    const calcField = event.target.closest("[data-compass-calc]");
    if (calcField) {
      const key = calcField.dataset.compassCalc;
      if (key === "land") compassState.calcLand = calcField.value;
      if (key === "build") compassState.calcBuild = calcField.value;
      if (key === "floor") compassState.calcFloor = calcField.value;
      renderCompassCalculatorResult();
      return;
    }

    const standardField = event.target.closest("[data-compass-enforcement]");
    if (standardField) {
      compassState.standardValue = standardField.value;
      renderCompassEnforcementResult();
    }
  });

  panel.addEventListener("change", (event) => {
    const calcField = event.target.closest("[data-compass-calc]");
    if (!calcField) return;
    if (calcField.dataset.compassCalc === "zone") {
      compassState.calcZone = calcField.value;
      renderCompassCalculatorResult();
    }
  });
}

function inlineComputedStyles(source, clone) {
  const computed = window.getComputedStyle(source);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed[index];
    clone.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }

  Array.from(source.children).forEach((child, index) => {
    if (clone.children[index]) inlineComputedStyles(child, clone.children[index]);
  });
}

async function downloadOrdinanceImage() {
  const report = $("#ordinanceReport");
  if (!report) return;

  const tableWraps = Array.from(report.querySelectorAll(".restriction-table-wrap"));
  const width = Math.ceil(Math.max(report.scrollWidth, 1120, ...tableWraps.map((node) => node.scrollWidth + 80)));
  const height = Math.ceil(report.scrollHeight + tableWraps.reduce((sum, node) => sum + Math.max(0, node.scrollHeight - node.clientHeight), 0) + 12);
  const clone = report.cloneNode(true);
  inlineComputedStyles(report, clone);
  clone.querySelectorAll(".restriction-table-wrap").forEach((node) => {
    node.style.maxHeight = "none";
    node.style.overflow = "visible";
  });
  clone.style.width = `${width}px`;
  clone.style.height = "auto";
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const activeName = $("#ordinanceReport h3")?.textContent?.trim() || "전국-건축제한";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${activeName.replace(/[\\/:*?"<>|]/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1200);
    }, "image/png");
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert("이미지 생성에 실패했습니다. PDF 저장/프린트를 이용해 주세요.");
  };
  image.src = url;
}

function showView(viewId, options = {}) {
  const targetId = document.getElementById(viewId) ? viewId : "top";
  document.querySelectorAll("main > section[id]").forEach((section) => {
    const isActive = section.id === targetId;
    section.classList.toggle("view-hidden", !isActive);
    section.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const hrefId = link.getAttribute("href").slice(1);
    link.classList.toggle("is-active", hrefId === targetId);
  });

  if (options.updateHash !== false) {
    const nextHash = `#${targetId}`;
    if (window.location.hash !== nextHash) {
      history.pushState({ viewId: targetId }, "", nextHash);
    }
  }

  if (options.scrollTop !== false) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}

function bindViewNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const viewId = link.getAttribute("href").slice(1);
    if (!document.getElementById(viewId)) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showView(viewId);
    });
  });

  window.addEventListener("popstate", () => {
    showView((window.location.hash || "#top").slice(1), { updateHash: false });
  });

  showView((window.location.hash || "#top").slice(1), { updateHash: false });
}

renderStaticLists();
bindStyleControls();
bindChat();
bindChangeTools();
bindOrdinanceTools();
bindCompassTools();
bindViewNavigation();
