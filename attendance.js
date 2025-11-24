// 전역 변수로 전체 데이터 저장
let allAttendees = [];
let currentPage = 1;
const itemsPerPage = 50;

// 날짜 포맷팅 함수
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 테이블 렌더링 함수
function renderTable(page = 1) {
  const tbody = document.getElementById("attendance-tbody");
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const paginationControls = document.getElementById("paginationControls");

  // 데이터가 없으면 페이지네이션 숨기기
  if (allAttendees.length === 0) {
    paginationControls.style.display = "none";
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">등록된 스터디 참석자가 없습니다.</td>
      </tr>`;
    return;
  }

  paginationControls.style.display = "flex";

  // 페이지 계산
  const totalPages = Math.ceil(allAttendees.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, allAttendees.length);
  const pageData = allAttendees.slice(startIndex, endIndex);

  // 테이블 렌더링
  tbody.innerHTML = "";
  pageData.forEach((attendee, index) => {
    const globalIndex = startIndex + index + 1;
    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td>${globalIndex}</td>
      <td>${attendee.campus || "-"}</td>
      <td>${attendee.class_name || "-"}</td>
      <td>${attendee.name || "-"}</td>
      <td style="color: #777; font-size: 0.9rem;">${formatDate(attendee.created_at)}</td>
    `;
    
    tbody.appendChild(tr);
  });

  // 페이지 정보 업데이트
  pageInfo.textContent = `페이지 ${page} / ${totalPages} (총 ${allAttendees.length}개)`;

  // 버튼 활성화/비활성화
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page === totalPages;

  // 비활성화된 버튼 스타일
  if (prevBtn.disabled) {
    prevBtn.style.opacity = "0.5";
    prevBtn.style.cursor = "not-allowed";
  } else {
    prevBtn.style.opacity = "1";
    prevBtn.style.cursor = "pointer";
  }

  if (nextBtn.disabled) {
    nextBtn.style.opacity = "0.5";
    nextBtn.style.cursor = "not-allowed";
  } else {
    nextBtn.style.opacity = "1";
    nextBtn.style.cursor = "pointer";
  }

  currentPage = page;
}

// 초기 데이터 로드
document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("attendance-tbody");
  const BASE_URL = API_BASE_URL;

  try {
    // API 호출
    const response = await fetch(`${BASE_URL}/attendance`);
    
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.statusText}`);
    }

    allAttendees = await response.json();

    // 첫 페이지 렌더링
    renderTable(1);

  } catch (error) {
    console.error("스터디 참석자 명단 로드 실패:", error);
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5" style="color: red;">
          ❌ 명단을 불러오지 못했습니다: ${error.message}
        </td>
      </tr>`;
    document.getElementById("paginationControls").style.display = "none";
  }
});

// 페이지네이션 버튼 이벤트
document.getElementById("prevPageBtn")?.addEventListener("click", () => {
  if (currentPage > 1) {
    renderTable(currentPage - 1);
  }
});

document.getElementById("nextPageBtn")?.addEventListener("click", () => {
  const totalPages = Math.ceil(allAttendees.length / itemsPerPage);
  if (currentPage < totalPages) {
    renderTable(currentPage + 1);
  }
});

// 엑셀 다운로드 기능 (전체 데이터 사용)
document.getElementById("downloadExcelBtn")?.addEventListener("click", async () => {
  try {
    if (allAttendees.length === 0) {
      alert("다운로드할 스터디 참석자 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 준비 (전체 데이터)
    const excelData = allAttendees.map((attendee, index) => {
      return {
        "순번": index + 1,
        "캠퍼스": attendee.campus || "-",
        "반": attendee.class_name || "-",
        "이름": attendee.name || "-",
        "등록일시": formatDate(attendee.created_at)
      };
    });

    // SheetJS를 사용하여 엑셀 파일 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "스터디 참석자 명단");

    // 열 너비 설정
    worksheet['!cols'] = [
      { wch: 10 },  // 순번
      { wch: 15 },  // 캠퍼스
      { wch: 15 },  // 반
      { wch: 15 },  // 이름
      { wch: 20 }   // 등록일시
    ];

    // 파일명 생성 (현재 날짜 포함)
    const now = new Date();
    const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `스터디참석자명단_${dateString}.xlsx`;

    // 파일 다운로드
    XLSX.writeFile(workbook, filename);

  } catch (error) {
    console.error("엑셀 다운로드 실패:", error);
    alert(`엑셀 다운로드에 실패했습니다: ${error.message}`);
  }
});
