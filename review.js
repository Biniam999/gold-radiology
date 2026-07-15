// Load the exam result from localStorage
const examData = JSON.parse(localStorage.getItem("lastExamResult"));

if (!examData || !examData.questions || examData.questions.length === 0) {
  alert("No exam data found! Please complete an exam first.");
  window.location.href = "qbank.html";
}

const questions = examData.questions;
const answers = examData.answers || [];
const timeTaken = examData.timeTaken || 0;
let currentQuestionIndex = 0;
let currentFilter = "all"; 

// DOM Elements
const summarySection = document.getElementById("summary-section");
const reviewInterface = document.getElementById("review-interface");
const questionsList = document.getElementById("questions-list");
const questionNumberEl = document.getElementById("question-number");
const questionTextEl = document.getElementById("question-text");
const choicesContainer = document.getElementById("choices-container");
const explanationEl = document.getElementById("answer-explanation");

// Helper map to convert letter keys safely to index positions
const letterToIndexMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };

// Helper function to safely read the correct answer index from the question object
function getCorrectIndex(q) {
  let rawAns = q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : q.answer;
  
  // If the answer is a string letter like "D", map it to its array index position
  if (typeof rawAns === 'string') {
    const cleanLetter = rawAns.trim().toUpperCase();
    if (letterToIndexMap[cleanLetter] !== undefined) {
      return letterToIndexMap[cleanLetter];
    }
  }
  return Number(rawAns);
}

// 1. Calculate and Display Summary Statistics
// 1. Calculate and Display Summary Statistics
function initSummary() {
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  questions.forEach((q, index) => {
    const userAns = answers[index];
    const correctIdx = getCorrectIndex(q);

    if (userAns === null || userAns === undefined || userAns === "") {
      skippedCount++;
    } else if (Number(userAns) === correctIdx) { 
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const totalQuestions = questions.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Format Time (Seconds to MM:SS)
  const mins = String(Math.floor(timeTaken / 60)).padStart(2, '0');
  const secs = String(timeTaken % 60).padStart(2, '0');

  // Update DOM Summary Text elements
  if(document.getElementById("score-percent")) {
    document.getElementById("score-percent").textContent = `${scorePercent}%`;
  }
  
  // UPDATED: Appends the percentage inside parentheses right next to the raw score count
  if(document.getElementById("score-raw")) {
    document.getElementById("score-raw").textContent = `${correctCount} / ${totalQuestions} Questions (${scorePercent}%)`;
  }
  
  if(document.getElementById("stats-correct")) document.getElementById("stats-correct").textContent = correctCount;
  if(document.getElementById("stats-incorrect")) document.getElementById("stats-incorrect").textContent = incorrectCount;
  if(document.getElementById("stats-skipped")) document.getElementById("stats-skipped").textContent = skippedCount;
  if(document.getElementById("stats-time")) document.getElementById("stats-time").textContent = `${mins}:${secs}`;

  // Force content to load immediately to avoid empty boxes
  renderSidebar();
  loadQuestion(0);

  // Structural display management
  if (summarySection) summarySection.style.display = "block";
  if (reviewInterface) reviewInterface.style.display = "flex"; 

  const startReviewBtn = document.getElementById("start-review-btn");
  if (startReviewBtn) {
    startReviewBtn.addEventListener("click", () => {
      if (summarySection) summarySection.style.display = "none";
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// 2. Render Sidebar with Correct/Incorrect Badges (Styled in 2 Clean Columns)
function renderSidebar() {
  if (!questionsList) return;
  questionsList.innerHTML = "";

  // Set up the container as a 2-column grid
  questionsList.style.display = "grid";
  questionsList.style.gridTemplateColumns = "repeat(2, 1fr)"; // Two equal columns
  questionsList.style.gap = "8px";                            // Gap between buttons
  questionsList.style.width = "100%";
  questionsList.style.boxSizing = "border-box";

  questions.forEach((q, index) => {
    const userAns = answers[index];
    const correctIdx = getCorrectIndex(q);
    
    let isCorrect = (userAns !== null && userAns !== undefined && userAns !== "") && (Number(userAns) === correctIdx);
    let isSkipped = userAns === null || userAns === undefined || userAns === "";

    // Apply Sidebar Filter Settings
    if (currentFilter === "correct" && (!isCorrect || isSkipped)) return;
    if (currentFilter === "incorrect" && (isCorrect || isSkipped)) return;

    const btn = document.createElement("button");
    btn.className = "sidebar-q-btn";
    
    // Style configurations optimized for grid placement
    btn.style.width = "100%";
    btn.style.boxSizing = "border-box";
    btn.style.textAlign = "center"; // Centered text works best for grids
    btn.style.padding = "10px 5px";
    btn.style.cursor = "pointer";
    btn.style.background = index === currentQuestionIndex ? "#2b6cb0" : "#2d2d2d";
    btn.style.color = "#fff";
    btn.style.border = index === currentQuestionIndex ? "2px solid #ffd700" : "1px solid #444"; // Highlight active border
    btn.style.borderRadius = "6px";
    btn.style.fontSize = "13px";

    let statusIcon = "⚪";
    if (!isSkipped) {
      statusIcon = isCorrect ? "🟢" : "🔴";
    }

    btn.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <span>${statusIcon}</span>
      <span style="font-weight: 500;">Q${index + 1}</span>
    </div>`;

    btn.addEventListener("click", () => {
      currentQuestionIndex = index;
      renderSidebar(); 
      loadQuestion(index);
    });

    questionsList.appendChild(btn);
  });
}

// 3. Display Selected Question with Visual Choices Feedback (A to E)
function loadQuestion(index) {
  if (index < 0 || index >= questions.length) return;
  currentQuestionIndex = index;

  const q = questions[index];
  const userAns = answers[index];
  const correctIdx = getCorrectIndex(q);

  if (questionNumberEl) questionNumberEl.textContent = `Question ${index + 1}`;
  if (questionTextEl) questionTextEl.textContent = q.question || ''; 
  if (!choicesContainer) return;
  choicesContainer.innerHTML = "";

  // Clean up any old image element
  const oldImg = document.querySelector(".question-content .question-image");
  if (oldImg) oldImg.remove();

  // Insert image asset if present
  if (q.Image && q.Image !== 'none') {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'question-image';
    const img = document.createElement('img');
    img.src = `assets/${q.Image}`;
    img.alt = 'Question image';
    img.style.maxWidth = "100%";
    imgContainer.appendChild(img);
    questionTextEl.insertAdjacentElement('afterend', imgContainer);
  }

  // Expanded letters array to scale for 5 options smoothly
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const contentChoices = q.choices || [];
  
  contentChoices.forEach((choiceText, choiceIdx) => {
    const choiceDiv = document.createElement("div");
    choiceDiv.className = "choice static-choice"; 
    
    // Style configurations for uniform option padding blocks
    choiceDiv.style.padding = "15px";
    choiceDiv.style.margin = "10px 0";
    choiceDiv.style.borderRadius = "6px";
    choiceDiv.style.border = "1px solid #444";

    const isThisCorrect = choiceIdx === correctIdx;
    const isThisUserSelection = (userAns !== null && userAns !== undefined && userAns !== "") && (choiceIdx === Number(userAns));

    if (isThisCorrect) {
      choiceDiv.style.backgroundColor = "#1b4332"; // Deep green for correct answer
      choiceDiv.style.borderColor = "#2a9d8f";
      choiceDiv.style.color = "#fff";
    } else if (isThisUserSelection) {
      choiceDiv.style.backgroundColor = "#632020"; // Deep red for incorrect selection
      choiceDiv.style.borderColor = "#e63946";
      choiceDiv.style.color = "#fff";
    } else {
      choiceDiv.style.backgroundColor = "#222";
      choiceDiv.style.color = "#ccc";
    }

    choiceDiv.innerHTML = `
      <span class="choice-letter" style="font-weight:bold; margin-right:8px;">${letters[choiceIdx] || ''}:</span>
      <span class="choice-text">${choiceText || ''}</span>
    `;
    choicesContainer.appendChild(choiceDiv);
  });

  // Handle detailed review explanation / rationales cleanly
  // Fallback check matching both `.detail` or `.explanation` property structures
  const rationaleText = q.detail || q.explanation;
  if (explanationEl) {
    if (rationaleText) {
      explanationEl.style.display = "block";
      explanationEl.style.marginTop = "20px";
      explanationEl.style.padding = "15px";
      explanationEl.style.background = "#222";
      explanationEl.style.borderLeft = "4px solid #ffd700";
      explanationEl.innerHTML = `<strong>Explanation:</strong> ${rationaleText}`;
    } else {
      explanationEl.style.display = "none";
    }
  }

  // Handle disabled states safely
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.disabled = index === questions.length - 1;
}

// Navigation Action Click Listeners
const prevBtnElement = document.getElementById("prev-btn");
if (prevBtnElement) {
  prevBtnElement.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderSidebar();
      loadQuestion(currentQuestionIndex);
    }
  });
}

const nextBtnElement = document.getElementById("next-btn");
if (nextBtnElement) {
  nextBtnElement.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      renderSidebar();
      loadQuestion(currentQuestionIndex);
    }
  });
}

const exitReviewBtn = document.getElementById("exit-review-btn");
if (exitReviewBtn) {
  exitReviewBtn.addEventListener("click", () => {
    window.location.href = "qbank.html";
  });
}

// Setup filter configuration interactions
document.querySelectorAll(".review-filters .filter-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".review-filters .filter-btn").forEach(b => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    currentFilter = e.currentTarget.getAttribute("data-filter");
    renderSidebar();
  });
});

// Start initialization on page load
initSummary();