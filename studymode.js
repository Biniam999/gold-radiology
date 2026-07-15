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

  // End Test button (shows only on last question)
  const endTestBtn = document.createElement('button');
  endTestBtn.textContent = 'End Test';
  endTestBtn.className = 'end-test-btn';
  endTestBtn.style.display = 'none';
  const navigationButtons = document.querySelector('.navigation-buttons');
  if (navigationButtons) navigationButtons.appendChild(endTestBtn);

  // UPDATED: Hook up submission payload generation and route to review engine
  endTestBtn.addEventListener('click', function () {
    if (confirm('Are you sure you want to end this study session and review your answers?')) {
      const endTime = Math.round((Date.now() - startTime) / 1000);

      const examResult = {
        questions: questions,
        answers: userAnswers,
        timeTaken: endTime
      };

      localStorage.setItem("lastExamResult", JSON.stringify(examResult));
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

  // Extracts unit prefix from filename (e.g., "pedi1-2" -> "pedi", "thoracic_cases" -> "thoracic")
  function getUnitFromFilename(filename) {
    if (!filename) return 'General';
    // Match letters at the start of the file before any numbers, dashes, or underscores
    const match = filename.match(/^([a-zA-Z]+)/);
    return match ? match[1] : filename;
  }

  // --------- DATA NORMALIZATION ----------
  // Standardizes properties of different database schemes
  function normalizeQuestions(rawQuestions, filename) {
    return rawQuestions.map(q => {
      // 1. Unify choices/options array & strip redundant prefix (e.g., "a. ")
      let originalChoices = q.options || q.choices || [];
      const cleanedOptions = originalChoices.map(opt => {
        if (typeof opt === 'string') {
          return opt.replace(/^[a-e]\.\s*/i, '').trim();
        }
        return opt;
      });

      // 2. Unify details/explanations
      const explanationText = q.explanation || q.detail || "No explanation provided.";

      // 3. Resolve answer keys to index numbers (0 through 4)
      let calculatedAnswerIndex = 0;
      if (typeof q.answer === 'string') {
        const cleanAns = q.answer.trim().toLowerCase();
        if (cleanAns.length === 1 && cleanAns >= 'a' && cleanAns <= 'e') {
          calculatedAnswerIndex = cleanAns.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1...
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

  // --------- HELPERS: LOADING JSON WITH CORRECT FALLBACKS ----------
  if (location.protocol === 'file:') {
    console.warn('This page is opened via file://. Use a local server (e.g., `python -m http.server`).');
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/^\/*/, '').replace(/\.json$/i, '');
  }

  async function fetchJsonWithFallbacks(name) {
    const base = normalizeName(name);
    // Modified candidate list to prioritize the correct "assets/" directory
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
          console.log(`Loaded ${data.questions.length} questions from ${url}`);
          return { data, url };
        }
      } catch (_) {
        // keep trying
      }
    }
    const err = new Error(`No usable JSON found for "${name}". Tried:\n${tried.join('\n')}`);
    err.tried = tried;
    throw err;
  }

  async function loadCombinedQuestions(files) {
    const unique = Array.from(new Set((files || []).map(normalizeName)));
    const list = unique.length ? unique : ['sample'];
    const allQuestions = [];
    const errors = [];

    const limit = Math.min(parseInt(sessionStorage.getItem('questionCount')) || 40, 400);

    for (const name of list) {
      try {
        const { data } = await fetchJsonWithFallbacks(name);
        
        // Normalize the questions right away so the frontend handles uniform objects
        const normalized = normalizeQuestions(data.questions || [], name);
        allQuestions.push(...normalized);
      } catch (e) {
        console.warn(e.message);
        errors.push(e.tried || []);
      }
    }

    if (!allQuestions.length) {
      const msg =
        'No questions found. Check your JSON filenames/locations.\n' +
        (errors.flat().length ? `Tried:\n${errors.flat().map(u => '• ' + u).join('\n')}` : '');
      console.error(msg);
      if (questionText) {
        questionText.textContent =
          'No questions found. Ensure your JSON files are in the assets/ folder, and run via a local server.';
      }
    }

    return allQuestions.slice(0, limit);
  }

  // --------- LOAD QUESTIONS ----------
  const filesToLoad = JSON.parse(sessionStorage.getItem('filesToLoad')) || ['sample'];

  loadCombinedQuestions(filesToLoad)
    .then(loadedQuestions => {
      questions = loadedQuestions;
      // Pre-fill user answers with null entries so skipped tracking calculates accurately
      questions.forEach(() => userAnswers.push(null));
      displayQuestion(currentQuestionIndex);
      createQuestionsSidebar();
      
      // Increment overall sessions count in storage
      incrementSessionCount();
    })
    .catch(error => {
      console.error('Error loading questions:', error);
      if (questionText) {
        questionText.textContent = 'Failed to load questions. Please try again later.';
      }
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

    // reset UI
    choicesContainer.innerHTML = '';
    answerExplanation.innerHTML = '';
    questionImageContainer.innerHTML = '';

    const question = questions[index];

    if (questionNumber) questionNumber.textContent = `Question ${index + 1}`;
    if (questionText) questionText.textContent = question.question || '';

    // Image (if present)
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

    // UPDATED: Standardized letters mapping array (A-E)
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const currentOptions = question.options || [];

    currentOptions.forEach((choiceText, i) => {
      const choiceElement = document.createElement('div');
      choiceElement.className = 'choice';
      choiceElement.innerHTML = `
        <span class="choice-letter">${letters[i] || ''}</span>
        <span class="choice-text">${choiceText || ''}</span>
      `;

      // If user already clicked a choice previously, show correctness state immediately
      if (userAnswers[index] !== null) {
        const selectedIdx = userAnswers[index];
        const correctIndex = question.answer; // Pre-normalized to index integer

        if (i === correctIndex) {
          choiceElement.classList.add('correct');
        } else if (i === selectedIdx) {
          choiceElement.classList.add('incorrect');
        }
      }

      choiceElement.addEventListener('click', function () {
        // Prevent multiple overrides if already answered
        if (userAnswers[currentQuestionIndex] !== null) return;

        // Save index number position into tracking matrix array
        userAnswers[currentQuestionIndex] = i;

        attemptedQuestions.add(currentQuestionIndex);
        updateQuestionsSidebar();
        showExplanation(question);

        // Reset states
        Array.from(choicesContainer.children).forEach(child => {
          child.classList.remove('correct', 'incorrect');
        });

        const correctIndex = question.answer; // Pre-normalized index integer
        const isAnswerCorrect = (i === correctIndex);

        // AUTOMATIC UNIT PARSING FROM FILENAME PREFIX
        const questionUnit = getUnitFromFilename(question._sourceFile);

        // Save progress details immediately to localStorage
        recordQuestionProgress(questionUnit, isAnswerCorrect, 'study');

        if (isAnswerCorrect) {
          highlightCorrect(choiceElement);
        } else {
          highlightIncorrect(choiceElement);
          // Also highlight the correct answer
          if (correctIndex >= 0 && correctIndex < choicesContainer.children.length) {
            choicesContainer.children[correctIndex].classList.add('correct');
          }
        }
      });

      choicesContainer.appendChild(choiceElement);
    });

    // If already answered, make sure explanation stays visible upon returning to card
    if (userAnswers[index] !== null) {
      showExplanation(question);
    }

    // Last page = show End button
    endTestBtn.style.display = index === questions.length - 1 ? 'inline-block' : 'none';

    // Nav buttons state
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === questions.length - 1;

    updateQuestionsSidebar();
  }

  function showExplanation(question) {
    // Prefer detail.image if provided; otherwise none.
    const detailImgName = question['detail.image'];
    const detailImgHtml =
      detailImgName && detailImgName !== 'none'
        ? `<img src="assets/${detailImgName}" alt="Explanation image" class="explanation-image">`
        : '';

    // Uses the normalized explanation property
    answerExplanation.innerHTML = `
      <h3>Explanation</h3>
      <p>${question.explanation || 'No explanation provided.'}</p>
      ${detailImgHtml}
    `;
  }

  // --- Helpers to adjust dynamic style tags ---
  function highlightCorrect(el) {
    el.classList.add('correct');
  }

  // --- Helpers to adjust dynamic style tags ---
  function highlightIncorrect(el) {
    el.classList.add('incorrect');
  }

  // --------- NAV HANDLERS ----------
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

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled) {
      prevBtn.click();
    } else if (e.key === 'ArrowRight' && nextBtn && !nextBtn.disabled) {
      nextBtn.click();
    }
  });
});