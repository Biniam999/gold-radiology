document.addEventListener('DOMContentLoaded', function () {
  "use strict";

  // --------- ELEMENTS ----------
  const questionNumber = document.getElementById('question-number');
  const questionText = document.getElementById('question-text');
  const choicesContainer = document.getElementById('choices-container');
  const answerExplanation = document.getElementById('answer-explanation');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const questionsList = document.getElementById('questions-list');

  const questionImageContainer = document.createElement('div');
  questionImageContainer.className = 'question-image';

  // --- NEW: Create Flag Button inside UI ---
  const flagBtn = document.createElement('button');
  flagBtn.id = 'flag-question-btn';
  flagBtn.className = 'flag-btn';
  flagBtn.style.padding = '8px 16px';
  flagBtn.style.marginLeft = '15px';
  flagBtn.style.cursor = 'pointer';
  flagBtn.style.borderRadius = '6px';
  flagBtn.style.border = '1px solid #ffbc00';
  flagBtn.style.background = 'transparent';
  flagBtn.style.color = '#ffbc00';
  flagBtn.style.fontWeight = 'bold';
  flagBtn.style.transition = 'all 0.2s';

  // Insert flag button next to the question number heading
  if (questionNumber) {
    questionNumber.style.display = 'inline-flex';
    questionNumber.style.alignItems = 'center';
    questionNumber.after(flagBtn);
  }

  // End Test button (shows only on last question)
  const endTestBtn = document.createElement('button');
  endTestBtn.textContent = 'End Test';
  endTestBtn.className = 'end-test-btn';
  endTestBtn.style.display = 'none';
  const navigationButtons = document.querySelector('.navigation-buttons');
  if (navigationButtons) navigationButtons.appendChild(endTestBtn);

  // Hook up submission payload generation and route to review engine
  endTestBtn.addEventListener('click', function () {
    if (confirm('Are you sure you want to end this study session and review your answers?')) {
      const endTime = Math.round((Date.now() - startTime) / 1000);

      const examResult = {
        questions: questions,
        answers: userAnswers,
        timeTaken: endTime
      };

      localStorage.setItem("lastExamResult", JSON.stringify(examResult));
      
      // Save incorrect questions specifically for dashboard review
      saveIncorrectSessionData();

      window.location.href = 'review.html';
    }
  });

  // --------- STATE ----------
  let currentQuestionIndex = 0;
  let questions = [];
  const attemptedQuestions = new Set();
  const userAnswers = []; // TRACKS: Stores dynamic selections (0-4 index format matching core engine)
  let startTime = Date.now(); // TRACKS: Starts calculation window for performance evaluation

  // --------- PROGRESS TRACKING HELPERS ----------
  function incrementSessionCount() {
    const stats = JSON.parse(localStorage.getItem('qbankStats')) || {
      totalAnswered: 0,
      totalCorrect: 0,
      sessionsCount: 0,
      studyMode: { answered: 0, correct: 0 },
      examMode: { answered: 0, correct: 0 },
      units: {}
    };
    stats.sessionsCount += 1;
    localStorage.setItem('qbankStats', JSON.stringify(stats));
  }

  function recordQuestionProgress(unitName, isCorrect, sessionType) {
    const stats = JSON.parse(localStorage.getItem('qbankStats')) || {
      totalAnswered: 0,
      totalCorrect: 0,
      sessionsCount: 0,
      studyMode: { answered: 0, correct: 0 },
      examMode: { answered: 0, correct: 0 },
      units: {}
    };

    // Increment overall statistics
    stats.totalAnswered += 1;
    if (isCorrect) stats.totalCorrect += 1;

    // Increment mode-specific statistics
    if (sessionType === 'study') {
      stats.studyMode.answered += 1;
      if (isCorrect) stats.studyMode.correct += 1;
    } else if (sessionType === 'exam') {
      stats.examMode.answered += 1;
      if (isCorrect) stats.examMode.correct += 1;
    }

    // Increment unit-specific statistics
    if (unitName) {
      const formattedUnit = unitName.toLowerCase().trim();
      if (!stats.units[formattedUnit]) {
        stats.units[formattedUnit] = { answered: 0, correct: 0 };
      }
      stats.units[formattedUnit].answered += 1;
      if (isCorrect) stats.units[formattedUnit].correct += 1;
    }

    localStorage.setItem('qbankStats', JSON.stringify(stats));
  }

  // Save wrong answers to global localStorage bank
  function saveIncorrectSessionData() {
    const globalIncorrect = JSON.parse(localStorage.getItem('globalIncorrectQuestions')) || [];
    
    questions.forEach((q, index) => {
      const userAns = userAnswers[index];
      const correctIdx = q.answer;
      if (userAns !== null && Number(userAns) !== correctIdx) {
        // Prevent duplicate questions in our review bank by matching question text
        const alreadyExists = globalIncorrect.some(item => item.question === q.question);
        if (!alreadyExists) {
          globalIncorrect.push(q);
        }
      }
    });
    localStorage.setItem('globalIncorrectQuestions', JSON.stringify(globalIncorrect));
  }

  // Extracts unit prefix from filename
  function getUnitFromFilename(filename) {
    if (!filename) return 'General';
    const match = filename.match(/^([a-zA-Z]+)/);
    return match ? match[1] : filename;
  }

  // --------- DATA NORMALIZATION ----------
  function normalizeQuestions(rawQuestions, filename) {
    return rawQuestions.map(q => {
      let originalChoices = q.options || q.choices || [];
      const cleanedOptions = originalChoices.map(opt => {
        if (typeof opt === 'string') {
          return opt.replace(/^[a-e]\.\s*/i, '').trim();
        }
        return opt;
      });

      const explanationText = q.explanation || q.detail || "No explanation provided.";

      let calculatedAnswerIndex = 0;
      if (typeof q.answer === 'string') {
        const cleanAns = q.answer.trim().toLowerCase();
        if (cleanAns.length === 1 && cleanAns >= 'a' && cleanAns <= 'e') {
          calculatedAnswerIndex = cleanAns.charCodeAt(0) - 97;
        } else {
          const matchInRaw = originalChoices.indexOf(q.answer);
          calculatedAnswerIndex = matchInRaw !== -1 ? matchInRaw : cleanedOptions.indexOf(q.answer);
        }
      } else if (typeof q.answer === 'number') {
        calculatedAnswerIndex = q.answer;
      }

      return {
        question: q.question,
        options: cleanedOptions,
        answer: calculatedAnswerIndex >= 0 ? calculatedAnswerIndex : 0,
        explanation: explanationText,
        Image: q.Image || 'none',
        'detail.image': q['detail.image'] || 'none',
        _sourceFile: filename
      };
    });
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/^\/*/, '').replace(/\.json$/i, '');
  }

  async function fetchJsonWithFallbacks(name) {
    const base = normalizeName(name);
    const candidates = [
      `assets/${base}.json`,
      `${base}.json`,
      `assets/json/${base}.json`,
    ];
    const tried = [];
    for (const url of candidates) {
      tried.push(url);
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && Array.isArray(data.questions) && data.questions.length) {
          return { data, url };
        }
      } catch (_) {}
    }
    const err = new Error(`No usable JSON found for "${name}".`);
    err.tried = tried;
    throw err;
  }

  async function loadCombinedQuestions(files) {
    // Check if we are running in "incorrect review" or "flagged review" modes
    const mode = sessionStorage.getItem('customStudyMode');
    if (mode === 'incorrect') {
      return JSON.parse(localStorage.getItem('globalIncorrectQuestions')) || [];
    } else if (mode === 'flagged') {
      return JSON.parse(localStorage.getItem('globalFlaggedQuestions')) || [];
    }

    const unique = Array.from(new Set((files || []).map(normalizeName)));
    const list = unique.length ? unique : ['sample'];
    const allQuestions = [];

    const limit = Math.min(parseInt(sessionStorage.getItem('questionCount')) || 40, 400);

    for (const name of list) {
      try {
        const { data } = await fetchJsonWithFallbacks(name);
        const normalized = normalizeQuestions(data.questions || [], name);
        allQuestions.push(...normalized);
      } catch (e) {
        console.warn(e.message);
      }
    }

    return allQuestions.slice(0, limit);
  }

  // --------- LOAD QUESTIONS ----------
  const filesToLoad = JSON.parse(sessionStorage.getItem('filesToLoad')) || ['sample'];

  loadCombinedQuestions(filesToLoad)
    .then(loadedQuestions => {
      questions = loadedQuestions;
      questions.forEach(() => userAnswers.push(null));
      displayQuestion(currentQuestionIndex);
      createQuestionsSidebar();
      incrementSessionCount();
    })
    .catch(error => {
      console.error('Error loading questions:', error);
    });

  // --------- UI BUILDERS ----------
  function createQuestionsSidebar() {
    if (!questionsList) return;
    questionsList.innerHTML = '';
    questions.forEach((_, index) => {
      const questionItem = document.createElement('div');
      questionItem.className = 'question-item';
      questionItem.innerHTML = `<span class="question-number">${index + 1}</span><span class="question-dot">.</span>`;

      questionItem.addEventListener('click', () => {
        currentQuestionIndex = index;
        displayQuestion(currentQuestionIndex);
      });

      if (index === currentQuestionIndex) {
        questionItem.classList.add('active');
      }
      questionsList.appendChild(questionItem);
    });
  }

  function updateQuestionsSidebar() {
    const questionItems = document.querySelectorAll('.question-item');
    questionItems.forEach((item, index) => {
      const dot = item.querySelector('.question-dot');
      item.classList.toggle('active', index === currentQuestionIndex);
      if (dot) dot.style.display = attemptedQuestions.has(index) ? 'none' : 'inline';
    });
  }

  function displayQuestion(index) {
    if (!questions.length || index < 0 || index >= questions.length) return;

    choicesContainer.innerHTML = '';
    answerExplanation.innerHTML = '';
    questionImageContainer.innerHTML = '';

    const question = questions[index];

    if (questionNumber) questionNumber.textContent = `Question ${index + 1}`;
    if (questionText) questionText.textContent = question.question || '';

    // Update the Flagging Button visual state
    updateFlagButtonState(question);

    if (question.Image && question.Image !== 'none') {
      const img = document.createElement('img');
      img.src = `assets/${question.Image}`;
      img.alt = 'Question image';
      img.onerror = () => {
        questionImageContainer.innerHTML = '<p class="image-error">Image not available</p>';
      };
      questionImageContainer.appendChild(img);
      questionText.insertAdjacentElement('afterend', questionImageContainer);
    }

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const currentOptions = question.options || [];

    currentOptions.forEach((choiceText, i) => {
      const choiceElement = document.createElement('div');
      choiceElement.className = 'choice';
      choiceElement.innerHTML = `
        <span class="choice-letter">${letters[i] || ''}</span>
        <span class="choice-text">${choiceText || ''}</span>
      `;

      if (userAnswers[index] !== null) {
        const selectedIdx = userAnswers[index];
        const correctIndex = question.answer;

        if (i === correctIndex) {
          choiceElement.classList.add('correct');
        } else if (i === selectedIdx) {
          choiceElement.classList.add('incorrect');
        }
      }

      choiceElement.addEventListener('click', function () {
        if (userAnswers[currentQuestionIndex] !== null) return;

        userAnswers[currentQuestionIndex] = i;
        attemptedQuestions.add(currentQuestionIndex);
        updateQuestionsSidebar();
        showExplanation(question);

        Array.from(choicesContainer.children).forEach(child => {
          child.classList.remove('correct', 'incorrect');
        });

        const correctIndex = question.answer;
        const isAnswerCorrect = (i === correctIndex);
        const questionUnit = getUnitFromFilename(question._sourceFile);

        recordQuestionProgress(questionUnit, isAnswerCorrect, 'study');

        if (isAnswerCorrect) {
          highlightCorrect(choiceElement);
        } else {
          highlightIncorrect(choiceElement);
          if (correctIndex >= 0 && correctIndex < choicesContainer.children.length) {
            choicesContainer.children[correctIndex].classList.add('correct');
          }
        }
      });

      choicesContainer.appendChild(choiceElement);
    });

    if (userAnswers[index] !== null) {
      showExplanation(question);
    }

    endTestBtn.style.display = index === questions.length - 1 ? 'inline-block' : 'none';

    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === questions.length - 1;

    updateQuestionsSidebar();
  }

  // --- NEW: Flagging Storage Actions ---
  function updateFlagButtonState(question) {
    const flaggedList = JSON.parse(localStorage.getItem('globalFlaggedQuestions')) || [];
    const isFlagged = flaggedList.some(item => item.question === question.question);

    if (isFlagged) {
      flagBtn.innerHTML = '🚩 Flagged';
      flagBtn.style.backgroundColor = '#ffbc00';
      flagBtn.style.color = '#000';
    } else {
      flagBtn.innerHTML = '🏳️ Flag Question';
      flagBtn.style.backgroundColor = 'transparent';
      flagBtn.style.color = '#ffbc00';
    }
  }

  flagBtn.addEventListener('click', function () {
    const question = questions[currentQuestionIndex];
    if (!question) return;

    let flaggedList = JSON.parse(localStorage.getItem('globalFlaggedQuestions')) || [];
    const indexInFlags = flaggedList.findIndex(item => item.question === question.question);

    if (indexInFlags > -1) {
      flaggedList.splice(indexInFlags, 1); // Remove flag
    } else {
      flaggedList.push(question); // Add flag
    }

    localStorage.setItem('globalFlaggedQuestions', JSON.stringify(flaggedList));
    updateFlagButtonState(question);
  });

  function showExplanation(question) {
    const detailImgName = question['detail.image'];
    const detailImgHtml =
      detailImgName && detailImgName !== 'none'
        ? `<img src="assets/${detailImgName}" alt="Explanation image" class="explanation-image">`
        : '';

    answerExplanation.innerHTML = `
      <h3>Explanation</h3>
      <p>${question.explanation || 'No explanation provided.'}</p>
      ${detailImgHtml}
    `;
  }

  function highlightCorrect(el) { el.classList.add('correct'); }
  function highlightIncorrect(el) { el.classList.add('incorrect'); }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion(currentQuestionIndex);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion(currentQuestionIndex);
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled) {
      prevBtn.click();
    } else if (e.key === 'ArrowRight' && nextBtn && !nextBtn.disabled) {
      nextBtn.click();
    }
  });
});