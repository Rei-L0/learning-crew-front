// 1. 필요한 DOM 요소들을 선택합니다.
const uploadForm = document.getElementById("uploadForm");
const planFileInput = document.getElementById("planFile");
const reportFileInput = document.getElementById("reportFile");
const statusDiv = document.getElementById("status");
const resultContainer = document.getElementById("resultContainer");
const planFileList = document.getElementById("planFileList");
const reportFileList = document.getElementById("reportFileList");

function addFilesToInput(fileInput, filesToAdd) {
  const currentFiles = Array.from(fileInput.files);
  const dataTransfer = new DataTransfer();

  currentFiles.concat(Array.from(filesToAdd)).forEach((file) => {
    dataTransfer.items.add(file);
  });

  fileInput.files = dataTransfer.files;
}

// 파일 목록 표시 함수
function displayFileList(fileInput, fileListContainer) {
  if (!fileListContainer) return;
  const uploadBox = fileListContainer.closest(".file-upload-box");
  if (!uploadBox) return;
  
  const files = fileInput.files;
  if (files.length === 0) {
    fileListContainer.innerHTML = "";
    uploadBox.classList.remove("has-files");
    return;
  }

  let html = "";
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    html += `
      <div class="file-list-item" data-index="${i}">
        <span>${file.name}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #666; font-size: 10px;">${(file.size / 1024).toFixed(1)} KB</span>
          <button type="button" class="file-delete-btn" data-index="${i}" aria-label="파일 삭제">
            <span>x</span>
          </button>
        </div>
      </div>
    `;
  }
  fileListContainer.innerHTML = html;
  uploadBox.classList.add("has-files");

  // 삭제 버튼 이벤트 리스너 추가
  const deleteButtons = fileListContainer.querySelectorAll('.file-delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt(btn.getAttribute('data-index'));
      removeFile(fileInput, index, fileListContainer);
    });
  });
}

// 파일 삭제 함수
function removeFile(fileInput, indexToRemove, fileListContainer) {
  const files = Array.from(fileInput.files);
  files.splice(indexToRemove, 1);
  
  // 새로운 FileList 생성
  const dataTransfer = new DataTransfer();
  files.forEach(file => {
    dataTransfer.items.add(file);
  });
  
  fileInput.files = dataTransfer.files;
  
  // 파일 목록 다시 표시
  displayFileList(fileInput, fileListContainer);
}

function setupDragAndDrop(fileInput, fileListContainer) {
  if (!fileInput || !fileListContainer) return;
  const uploadBox = fileListContainer.closest(".file-upload-box");
  if (!uploadBox) return;

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  let dragCounter = 0;

  uploadBox.addEventListener("dragenter", (e) => {
    preventDefaults(e);
    dragCounter++;
    uploadBox.classList.add("drag-over");
  });

  uploadBox.addEventListener("dragover", (e) => {
    preventDefaults(e);
  });

  const leaveHandler = (e) => {
    preventDefaults(e);
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) {
      uploadBox.classList.remove("drag-over");
    }
  };

  uploadBox.addEventListener("dragleave", leaveHandler);
  uploadBox.addEventListener("dragend", leaveHandler);

  uploadBox.addEventListener("drop", (e) => {
    preventDefaults(e);
    dragCounter = 0;
    uploadBox.classList.remove("drag-over");
    const droppedFiles = e.dataTransfer?.files;
    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }
    addFilesToInput(fileInput, droppedFiles);
    displayFileList(fileInput, fileListContainer);
  });
}

// 파일 입력 변경 이벤트 리스너
if (planFileInput && planFileList) {
  planFileInput.addEventListener("change", () => {
    displayFileList(planFileInput, planFileList);
  });
  setupDragAndDrop(planFileInput, planFileList);
}

if (reportFileInput && reportFileList) {
  reportFileInput.addEventListener("change", () => {
    displayFileList(reportFileInput, reportFileList);
  });
  setupDragAndDrop(reportFileInput, reportFileList);
}

const BASE_URL = API_BASE_URL;
const UPLOAD_URL = `${BASE_URL}/upload-and-analyze`;

// ✨ (중요) 이 함수는 detail.js에서도 재사용됩니다.
function renderResultHTML(data, filename) {
  // data가 null이거나 undefined일 경우 빈 객체로 처리
  if (!data) {
    console.error("renderResultHTML: data가 비어있습니다.", filename);
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
    result_specificity_goal: "결과 구체성 (목표)",
    team_participation_diversity: "팀 참여도/다양성",
    evidence_strength: "증빙 강도",
  };

  // 항목별 세부 평가 (rationale) HTML 생성
  let rationaleHtml = "<ul>";
  if (data.rationale) {
    for (const key in data.rationale) {
      const label = rationaleMap[key] || key;
      const score = data.scores_weighted ? data.scores_weighted[key] : "N/A";
      const rationaleText = data.rationale[key];
      rationaleHtml += `
          <li>
              <strong>${label} ( ${score}점 )</strong>
              <p>${rationaleText}</p>
          </li>`;
    }
  }
  rationaleHtml += "</ul>";

  // 참고 사항 (uncertainties) HTML 생성
  let uncertaintiesHtml = "<ul>";
  if (data.uncertainties && data.uncertainties.length > 0) {
    data.uncertainties.forEach((item) => {
      uncertaintiesHtml += `<li>${item}</li>`;
    });
  } else {
    uncertaintiesHtml += "<li>없음</li>";
  }
  uncertaintiesHtml += "</ul>";

  // 최종 결과를 '헤더'와 '콘텐츠'로 분리된 HTML로 반환
  return `
        <div class="result-item-container"> 
            
            <h3 class="result-header">📊 분석 결과 (${filename})</h3>
            
            <div class="result-content">
                <div class="result-box">
                    <div class="result-item">
                        <strong>총점</strong>
                        <span>${data.total || 0} 점</span>
                    </div>
                    <div class="result-item">
                        <strong>감지된 사진 수</strong>
                        <span>${data.photo_count_detected || 0} 장</span>
                    </div>
                </div>

                <h4>항목별 세부 평가</h4>
                ${rationaleHtml}

                <h4>참고 사항</h4>
                ${uncertaintiesHtml}

                <h4>최종 코멘트</h4>
                <p>${data.final_comment || "코멘트 없음"}</p>
            </div>
        </div>
    `;
}

// 2. 폼 'submit' 이벤트 리스너 (uploadForm이 있는 페이지에서만 실행)
if (uploadForm) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!resultContainer) {
      return;
    }

    const planFiles = planFileInput.files;
    const reportFiles = reportFileInput.files;
    if (planFiles.length === 0 || reportFiles.length === 0) {
      statusDiv.textContent =
        "적어도 하나 이상의 계획서와 결과보고서 파일을 선택해주세요.";
      return;
    }
    const formData = new FormData();
    for (const file of planFiles) {
      formData.append("plan_files", file);
    }
    for (const file of reportFiles) {
      formData.append("report_files", file);
    }

    // ✨ (수정) '업로드 중' 메시지를 즉시 표시
    // (이 메시지는 아래 'try' 블록 내부에서 '분석 완료' 메시지로 대체됩니다)
    statusDiv.textContent = `업로드 중... (총 ${
      planFiles.length + reportFiles.length
    }개 파일)`;

    // ✨ (수정) resultContainer.innerHTML = ""; 를 try 블록 내부로 이동
    // resultContainer.innerHTML = ""; // <-- 이 줄을 삭제

    try {
      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("서버 응답:", responseData);

        // ✨ (수정)
        // 응답을 성공적으로 받은 *이후*에
        // 이전 결과(resultContainer)와 상태(statusDiv)를 초기화/설정합니다.
        resultContainer.innerHTML = ""; // <-- 이전 결과 삭제

        const summary = responseData.summary;
        // '업로드 중' 메시지를 '분석 완료' 메시지로 덮어쓰기
        statusDiv.textContent = `✅ 분석 완료: ${summary.processed_count}건 매칭 성공, ${summary.unmatchable_plans.length}건 계획서 매칭실패, ${summary.unmatchable_reports.length}건 보고서 매칭실패`;

        // 상세 결과 렌더링 로직 제거됨 (사용자 요청: 성공/실패 멘트만 표시)
      } else {
        // ✨ (수정) 실패 시에도 '업로드 중' 메시지를 덮어씁니다.
        statusDiv.textContent = `❌ 업로드 실패: ${response.statusText}`;
      }
    } catch (error) {
      console.error("업로드 중 오류 발생:", error);
      // ✨ (수정) 오류 발생 시에도 '업로드 중' 메시지를 덮어씁니다.
      statusDiv.textContent = `❌ 오류 발생: ${error.message}`;
    }
  });
}

// --- 결과 항목 클릭(토글) 이벤트 리스너 (resultContainer가 있는 페이지에서만) ---
if (resultContainer) {
  resultContainer.addEventListener("click", (event) => {
    // 1. 클릭된 요소가 'result-header'인지 확인
    const header = event.target.closest(".result-header");
    if (!header) {
      return;
    }

    // 2. 헤더의 부모 컨테이너를 찾음
    const container = header.closest(".result-item-container");
    if (!container) {
      return;
    }

    // 3. 'error' 클래스가 없는 항목만 토글
    if (!container.classList.contains("error")) {
      container.classList.toggle("active");
    }
  });
}
