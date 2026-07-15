document.addEventListener('DOMContentLoaded', function () {
  "use strict";

  // --------- ELEMENTS ----------
  const questionNumber = document.getElementById('question-number');
  const questionCounter = document.getElementById('question-counter');
  const questionText = document.getElementById('question-text');
  const choicesContainer = document.getElementById('choices-container');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const questionsList = document.getElementById('questions-list');

  const questionImageContainer = document.createElement('div');
  questionImageContainer.className = 'question-image';

  // Timer / progress strip
  const timerDisplay = document.getElementById('timer');
  const examCurrentQuestion = document.getElementById('exam-current-question');
  const examTotalQuestions = document.getElementById('exam-total-questions');

  // End Test button tracking
  let endTestBtn = document.getElementById('end-test-btn');
  if (!endTestBtn) {
    // Fallback injection if the element isn't explicitly in HTML template
    endTestBtn = document.createElement('button');
    endTestBtn.textContent = 'End Test';
    endTestBtn.className = 'nav-btn end-test-btn';
    endTestBtn.id = 'end-test-btn';
    const navigationButtons = document.querySelector('.navigation-buttons');
    if (navigationButtons) navigationButtons.appendChild(endTestBtn);
  }

  endTestBtn.addEventListener('click', function () {
    if (confirm('Are you sure you want to end the test and view your review performance metrics?')) {
      finishExamAndRedirect();
    }
  });

  // --------- STATE ----------
  let currentQuestionIndex = 0;
  let questions = [];
  const attemptedQuestions = new Set();
  const selectedAnswers = {}; // Tracks: index -> chosen index (0-4)

  // Timer
  let interval = null;
  const QUESTION_TIME = 80; // seconds per question
  let totalTime = 0;
  let timeLeft = 0;

  // --------- PROGRESS STORAGE HELPERS ----------
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

  // --------- HELPERS: LOADING JSON WITH FALLBACKS ----------
  if (location.protocol === 'file:') {
    console.warn('This page is opened via file://. Use a local server (e.g., `python -m http.server`).');
  }

  // Normalizes the path/filename strings
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
        // Normalize loaded questions before joining them
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

      // init timer and counters
      totalTime = questions.length * QUESTION_TIME;
      timeLeft = totalTime;
      if (examTotalQuestions) examTotalQuestions.textContent = questions.length;

      displayQuestion(currentQuestionIndex);
      createQuestionsSidebar();
      startTimer();
      
      // Track session commencement
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

  // Loads active index parameters onto interface layout
  function displayQuestion(index) {
    if (!questions.length || index < 0 || index >= questions.length) return;

    // reset containers
    choicesContainer.innerHTML = '';
    questionImageContainer.innerHTML = '';

    const question = questions[index];

    if (questionNumber) questionNumber.textContent = `Question ${index + 1}`;
    if (questionCounter) questionCounter.textContent = `Question ${index + 1} of ${questions.length}`;
    if (examCurrentQuestion) examCurrentQuestion.textContent = index + 1;
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

    // Choices (supporting up to 5 choices)
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const currentOptions = question.options || [];

    currentOptions.forEach((choiceText, i) => {
      const choiceElement = document.createElement('div');
      choiceElement.className = 'choice';
      choiceElement.innerHTML = `
        <span class="choice-letter">${letters[i] || ''}</span>
        <span class="choice-text">${choiceText || ''}</span>
      `;

      // Match against normalized numerical user answers index (0-4)
      if (selectedAnswers[index] === i) {
        choiceElement.classList.add('selected');
      }

      choiceElement.addEventListener('click', function () {
        selectedAnswers[index] = i; // Save choice index directly
        attemptedQuestions.add(index);
        Array.from(choicesContainer.children).forEach(child => child.classList.remove('selected'));
        choiceElement.classList.add('selected');
        updateQuestionsSidebar();
      });

      choicesContainer.appendChild(choiceElement);
    });

    // Navigation
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === questions.length - 1;

    updateQuestionsSidebar();
  }

  // --------- FINISH & PACKAGING LOGIC ----------
  function finishExamAndRedirect() {
    clearInterval(interval);

    const parsedAnswersArray = [];

    // Map selections to structure expected by review.js and record progress details
    questions.forEach((question, index) => {
      const chosenIdx = selectedAnswers[index];
      
      // AUTOMATIC UNIT PARSING FROM FILENAME PREFIX
      const questionUnit = getUnitFromFilename(question._sourceFile);

      if (chosenIdx !== undefined && chosenIdx !== null) {
        parsedAnswersArray.push(chosenIdx);

        // Evaluate and record the question accuracy (using pre-normalized indices)
        const isCorrect = (chosenIdx === question.answer);
        recordQuestionProgress(questionUnit, isCorrect, 'exam');
      } else {
        parsedAnswersArray.push(null); // Explicit skipped item indicator
        
        // Count skipped questions as incorrect answers in historical performance datasets
        recordQuestionProgress(questionUnit, false, 'exam');
      }
    });

    const examResultPayload = {
      questions: questions,
      answers: parsedAnswersArray,
      timeTaken: totalTime - timeLeft // Calculate total elapsed seconds
    };

    localStorage.setItem('lastExamResult', JSON.stringify(examResultPayload));
    window.location.href = 'review.html';
  }

  // --------- TIMER ----------
  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // Timer display configuration
  function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    if (timerDisplay) timerDisplay.textContent = `${pad(mins)}:${pad(secs)}`;
    if (timerDisplay) timerDisplay.style.color = timeLeft <= 10 ? '#e53935' : '#fff';
  }

  function startTimer() {
    clearInterval(interval);
    updateTimerDisplay();
    interval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft === 0) {
          clearInterval(interval);
          alert('Time is up! Processing your exam results.');
          finishExamAndRedirect();
        }
      }
    }, 1000);
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