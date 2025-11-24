// detail.html 전용 렌더링 함수 (목업 레이아웃)
function renderDetailHTML(data, filename, campus, authorName) {
  if (!data) {
    console.error("renderDetailHTML: data가 비어있습니다.", filename);
    data = {
      rationale: {},
      scores_weighted: {},
      uncertainties: ["데이터 없음"],
      final_comment: "분석 데이터를 불러오는 데 실패했습니다.",
      total: 0,
      photo_count_detected: 0,
    };
  }

  // 항목별 한글 매핑
  const rationaleMap = {
    plan_specificity: "계획 구체성",
    plan_feasibility: "계획 실현성",
    plan_measurability: "계획 측정성",
    result_specificity_goal: "결과 구체성(목표)",
    team_participation_diversity: "팀 참여도/다양성",
    evidence_strength: "증빙 강도",
  };

  // 항목별 최대 점수 매핑
  const maxScoreMap = {
    plan_specificity: 10,
    plan_feasibility: 10,
    plan_measurability: 10,
    result_specificity_goal: 30,
    team_participation_diversity: 20,
    evidence_strength: 20,
  };

  // 사용자 정보, 총점, 감지된 사진 수를 하나의 박스로 묶기
  const summaryBoxHtml = `
    <div class="detail-summary-box">
      <div class="detail-user-info">
        <h3><span class="detail-campus-name">${campus || "캠퍼스"}</span> <span class="detail-author-name">${authorName || "이름"}</span>님의 상세 채점 결과</h3>
      </div>
      <div class="detail-summary">
        <div class="detail-summary-item">
          <strong>총점</strong>
          <span class="detail-score-value">${data.total || 0}점</span>
        </div>
        <div class="detail-summary-item">
          <strong>감지된 사진 수</strong>
          <span class="detail-score-value">${data.photo_count_detected || 0}장</span>
        </div>
      </div>
    </div>
  `;

  // 항목별 세부 평가 HTML 생성 (점수 수정 가능)
  let rationaleHtml = '<div class="detail-evaluation-section"><h4>| 항목별 세부 평가</h4><ul class="detail-evaluation-list">';
  if (data.rationale) {
    for (const key in data.rationale) {
      const label = rationaleMap[key] || key;
      const score = data.scores_weighted ? data.scores_weighted[key] : 0;
      const maxScore = maxScoreMap[key] || 30; // 항목별 최대 점수
      const rationaleText = data.rationale[key];
      rationaleHtml += `
        <li class="detail-evaluation-item">
          <div class="detail-evaluation-header">
            <strong class="detail-evaluation-label">${label}</strong>
            <div class="detail-score-input-group">
              <input 
                type="number" 
                class="detail-score-input" 
                data-key="${key}"
                value="${score}" 
                min="0" 
                max="${maxScore}"
                step="1"
              />
              <span class="detail-score-separator">/</span>
              <span class="detail-score-max">${maxScore}점</span>
            </div>
          </div>
          <p class="detail-evaluation-description">${rationaleText}</p>
        </li>`;
    }
  }
  rationaleHtml += '</ul></div>';

  return `
    <div class="detail-content-wrapper">
      ${summaryBoxHtml}
      ${rationaleHtml}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const detailContainer = document.getElementById("detailContainer");
  const loadingDiv = document.getElementById("detailLoading");
  const BASE_URL = API_BASE_URL;

  // 1. URL에서 ID 파라미터 추출
  const urlParams = new URLSearchParams(window.location.search);
  const resultId = urlParams.get("id");

  if (!resultId) {
    loadingDiv.textContent = "❌ ID가 지정되지 않았습니다.";
    loadingDiv.style.color = "red";
    return;
  }

  try {
    // 2. 서버에서 세부 데이터 요청
    const response = await fetch(`${BASE_URL}/results/${resultId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("해당 ID의 결과를 찾을 수 없습니다.");
      }
      throw new Error(`서버 응답 오류: ${response.statusText}`);
    }

    const result = await response.json();

    console.log(result);

    // 3. detail 전용 렌더링 함수 사용
    const detailHtml = renderDetailHTML(
      result.analysis_data, // 파싱된 JSON 객체
      result.filename,
      result.campus || "",
      result.author_name || ""
    );

    // 로딩 메시지 제거 및 결과 삽입
    loadingDiv.remove();
    detailContainer.innerHTML = detailHtml;

    // 4. 점수 변경 이벤트 리스너 추가
    const scoreInputs = detailContainer.querySelectorAll('.detail-score-input');
    scoreInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const newScore = parseFloat(e.target.value);
        const key = e.target.dataset.key;
        console.log(`점수 변경 (로컬): ${key} = ${newScore}`);

        // 로컬 데이터 업데이트
        if (result.analysis_data) {
          if (!result.analysis_data.scores_weighted) {
            result.analysis_data.scores_weighted = {};
          }
          result.analysis_data.scores_weighted[key] = newScore;

          // 총점 재계산 (로컬 데이터)
          let newTotal = 0;
          for (const k in result.analysis_data.scores_weighted) {
            newTotal += result.analysis_data.scores_weighted[k];
          }
          result.analysis_data.total = newTotal;
          
          // 화면상 총점 업데이트
          updateTotalScore();
        }
      });
    });

    // 6. 점수 수정하기 버튼 이벤트 리스너
    const updateScoreBtn = document.getElementById('updateScoreBtn');
    if (updateScoreBtn) {
      updateScoreBtn.addEventListener('click', async () => {
        if (confirm('점수를 수정하시겠습니까?')) {
          await updateResult(resultId, result.analysis_data);
        }
      });
    }

    // 점수 업데이트 API 호출 함수
    async function updateResult(id, analysisData) {
      try {
        const response = await fetch(`${BASE_URL}/results/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysis_data: analysisData
          }),
        });

        if (!response.ok) {
          throw new Error(`서버 응답 오류: ${response.statusText}`);
        }

        const updatedResult = await response.json();
        console.log("점수 업데이트 성공:", updatedResult);
        alert("점수가 성공적으로 수정되었습니다.");
        window.location.href = 'board.html';
        
      } catch (error) {
        console.error("점수 업데이트 실패:", error);
        alert(`점수 저장에 실패했습니다: ${error.message}`);
      }
    }

    // 5. 총점 자동 계산 함수
    function updateTotalScore() {
      let total = 0;
      scoreInputs.forEach(input => {
        total += parseFloat(input.value) || 0;
      });
      const totalScoreElement = detailContainer.querySelector('.detail-summary .detail-score-value');
      if (totalScoreElement) {
        totalScoreElement.textContent = `${Math.round(total)}점`;
      }
    }

    // 점수 변경 시 총점 자동 업데이트
    scoreInputs.forEach(input => {
      input.addEventListener('input', updateTotalScore);
    });

  } catch (error) {
    console.error("세부 내용 로드 실패:", error);
    if (loadingDiv) {
      loadingDiv.textContent = `❌ 세부 내용을 불러오는 데 실패했습니다: ${error.message}`;
      loadingDiv.style.color = "red";
    }
  }
});
