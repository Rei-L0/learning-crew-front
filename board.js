document.addEventListener("DOMContentLoaded", () => {
  // 필터 UI 요소
  const campusSelect = document.getElementById("filter-campus");
  const classSelect = document.getElementById("filter-class");
  const scoreSelect = document.getElementById("filter-score");
  const searchTermInput = document.getElementById("filter-search-term");
  const searchBtn = document.getElementById("filter-search-btn");

  // 결과 테이블
  const boardTbody = document.getElementById("board-tbody");

  const BASE_URL = API_BASE_URL;

  /**
   * (신규) 필터 드롭다운 옵션을 서버에서 불러와 채웁니다.
   */
  async function fetchFilterOptions() {
    try {
      const response = await fetch(`${BASE_URL}/filter-options`);
      if (!response.ok) throw new Error("필터 옵션 로드 실패");

      const options = await response.json();

      // 캠퍼스 옵션 채우기
      if (options.campuses) {
        options.campuses.forEach((campus) => {
          const option = document.createElement("option");
          option.value = campus;
          option.textContent = campus;
          campusSelect.appendChild(option);
        });
      }

      // 반 옵션 채우기
      if (options.class_names) {
        options.class_names.forEach((className) => {
          const option = document.createElement("option");
          option.value = className;
          option.textContent = className;
          classSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error("필터 옵션 로드 중 오류:", error);
    }
  }

  /**
   * (수정) 서버에서 결과 목록을 (필터링하여) 불러와 테이블을 렌더링합니다.
   */
  async function loadResults(params = {}) {
    // 1. 로딩 상태 표시
    boardTbody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">결과를 불러오는 중입니다...</td>
      </tr>`;

    // 2. URL 쿼리 스트링 생성
    const queryString = new URLSearchParams(params).toString();

    try {
      const response = await fetch(`${BASE_URL}/results?${queryString}`);
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.statusText}`);
      }

      const results = await response.json();

      // 3. 테이블 비우기
      boardTbody.innerHTML = "";

      if (results.length === 0) {
        boardTbody.innerHTML = `
          <tr class="empty-row">
            <td colspan="6">일치하는 분석 결과가 없습니다.</td>
          </tr>`;
        return;
      }

      // 4. 점수 필터링 적용 (클라이언트 사이드)
      let filteredResults = results;
      if (params.score_range) {
        const [min, max] = params.score_range.split('-').map(Number);
        filteredResults = results.filter(result => {
          const score = result.total_score || 0;
          return score >= min && score <= max;
        });
      }

      // 5. 점수 기준으로 정렬 (높은 점수부터)
      filteredResults.sort((a, b) => {
        const scoreA = a.total_score || 0;
        const scoreB = b.total_score || 0;
        return scoreB - scoreA;
      });

      // 6. 테이블 행(row) 생성
      filteredResults.forEach((result, index) => {
        const tr = document.createElement("tr");

        // 클릭하면 세부 페이지로 이동
        tr.addEventListener("click", () => {
          window.location.href = `detail.html?id=${result.id}`;
        });

        // 날짜 포맷팅 (간단하게 'YYYY-MM-DD' 형식)
        const date = new Date(result.created_at).toISOString().split("T")[0];

        // 채점현황 표시 (점수 또는 "진행중")
        let scoringStatus = "진행중";
        if (result.total_score !== null && result.total_score !== undefined) {
          scoringStatus = `${result.total_score}점`;
        }

        // --- ✨ (핵심 수정) 목업에 맞춘 컬럼 구조 ---
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${result.filename || "제목"}</td>
          <td>${result.author_name || "작성자"}</td>
          <td>${result.campus || "-"}</td>
          <td>${scoringStatus}</td>
          <td>${date || "최종수정일"}</td>
        `;

        boardTbody.appendChild(tr);
      });
    } catch (error) {
      console.error("결과 목록 로드 실패:", error);
      boardTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6" style="color: red;">
            ❌ 결과 목록 로드 실패: ${error.message}
          </td>
        </tr>`;
    }
  }

  // --- 이벤트 리스너 ---

  // '검색' 버튼 클릭 시
  searchBtn.addEventListener("click", () => {
    // 현재 필터 값들을 객체로 수집
    const params = {
      campus: campusSelect.value,
      class_name: classSelect.value,
      q: searchTermInput.value,
    };

    // 점수 필터 처리
    if (scoreSelect.value) {
      params.score_range = scoreSelect.value;
    }

    // 값이 없는 (빈 문자열) 파라미터는 제거
    Object.keys(params).forEach((key) => {
      if (!params[key]) {
        delete params[key];
      }
    });

    // 필터링된 결과 로드
    loadResults(params);
  });

  // 검색창에서 Enter 키 입력 시
  searchTermInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      searchBtn.click(); // 검색 버튼 클릭 강제 실행
    }
  });

  // --- 페이지 초기 실행 ---
  fetchFilterOptions(); // 필터 드롭다운 채우기
  loadResults(); // 전체 결과 목록 로드
});
