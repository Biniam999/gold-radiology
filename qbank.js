document.addEventListener('DOMContentLoaded', function () {
  "use strict";

  // --- Controls for question count ---
  const questionCount = document.getElementById('questionCount');
  const minusBtn = document.querySelector('.number-btn.minus');
  const plusBtn = document.querySelector('.number-btn.plus');

  // Updated constraints: Min is 1, Max is 120 (FRCR standard)
  const MIN_QS = 1;
  const MAX_QS = 120;
  const DEFAULT_QS = 40;

  if (minusBtn) {
    minusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentValue = parseInt(questionCount.value, 10) || DEFAULT_QS;
      if (currentValue > MIN_QS) questionCount.value = currentValue - 1;
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentValue = parseInt(questionCount.value, 10) || DEFAULT_QS;
      if (currentValue < MAX_QS) questionCount.value = currentValue + 1;
    });
  }

  if (questionCount) {
    questionCount.addEventListener('change', () => {
      const value = parseInt(questionCount.value, 10);
      if (isNaN(value)) questionCount.value = DEFAULT_QS;
      else if (value < MIN_QS) questionCount.value = MIN_QS;
      else if (value > MAX_QS) questionCount.value = MAX_QS;
    });
  }

  // --- NEW: Dashboard Actions (Incorrect / Flagged Review Launchers) ---
  function initDashboardActions() {
    const btnIncorrect = document.getElementById('btn-review-incorrect');
    const btnFlagged = document.getElementById('btn-review-flagged');
    const incorrectCountEl = document.getElementById('incorrect-count');
    const flaggedCountEl = document.getElementById('flagged-count');

    const incorrects = JSON.parse(localStorage.getItem('globalIncorrectQuestions')) || [];
    const flagged = JSON.parse(localStorage.getItem('globalFlaggedQuestions')) || [];

    // 1. Update Badge Counts on the Dashboard
    if (incorrectCountEl) incorrectCountEl.textContent = incorrects.length;
    if (flaggedCountEl) flaggedCountEl.textContent = flagged.length;

    // 2. Disable buttons visually if there are no questions to review
    if (btnIncorrect && incorrects.length === 0) {
      btnIncorrect.disabled = true;
      btnIncorrect.style.opacity = '0.5';
      btnIncorrect.style.cursor = 'not-allowed';
    }
    if (btnFlagged && flagged.length === 0) {
      btnFlagged.disabled = true;
      btnFlagged.style.opacity = '0.5';
      btnFlagged.style.cursor = 'not-allowed';
    }

    // 3. Handle incorrect questions review click
    if (btnIncorrect) {
      btnIncorrect.addEventListener('click', function () {
        sessionStorage.setItem('customStudyMode', 'incorrect');
        sessionStorage.setItem('questionCount', incorrects.length.toString());
        sessionStorage.removeItem('filesToLoad'); // Clear typical loads
        window.location.href = 'studymode.html';
      });
    }

    // 4. Handle flagged questions review click
    if (btnFlagged) {
      btnFlagged.addEventListener('click', function () {
        sessionStorage.setItem('customStudyMode', 'flagged');
        sessionStorage.setItem('questionCount', flagged.length.toString());
        sessionStorage.removeItem('filesToLoad'); // Clear typical loads
        window.location.href = 'studymode.html';
      });
    }
  }

  // Initialize those buttons right away
  initDashboardActions();

  // --- FRCR Modular Session Launcher ---
  window.launchModularSession = function(moduleFileName, mode) {
    // Make sure to clear custom review modes when starting a fresh standard session
    sessionStorage.removeItem('customStudyMode');

    // 1. Pack the selected modular file
    const filesToLoad = [moduleFileName];
    sessionStorage.setItem('filesToLoad', JSON.stringify(filesToLoad));
    
    // 2. Set the module default count of 100 questions
    sessionStorage.setItem('questionCount', '100');
    if (questionCount) {
      questionCount.value = 100;
    }
    
    // 3. Route to the corresponding page based on clicked mode
    console.log(`Launching FRCR Module: ${moduleFileName} in ${mode} mode with 100 Qs.`);
    if (mode === 'study') {
      window.location.href = 'studymode.html';
    } else {
      window.location.href = 'exammode.html';
    }
  };

  // --- Modal open handlers (guarded) ---
  const mskCheckbox = document.getElementById('mskCheckbox');
  if (mskCheckbox) {
    mskCheckbox.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('mskModal').style.display = 'block';
    });
  }

  const thoracicUnit = document.querySelector('input[name="unit"][value="thoracic"]');
  if (thoracicUnit) {
    thoracicUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('thoracicModal').style.display = 'block';
    });
  }

  const cardiacUnit = document.querySelector('input[name="unit"][value="cardiac"]');
  if (cardiacUnit) {
    cardiacUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('cardiacModal').style.display = 'block';
    });
  }

  const neuroradUnit = document.querySelector('input[name="unit"][value="neurorad"]');
  if (neuroradUnit) {
    neuroradUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('neuroradModal').style.display = 'block';
    });
  }

  const giUnit = document.querySelector('input[name="unit"][value="gi"]');
  if (giUnit) {
    giUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('giModal').style.display = 'block';
    });
  }

  const pedsUnit = document.querySelector('input[name="unit"][value="peds"]');
  if (pedsUnit) {
    pedsUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('pedsModal').style.display = 'block';
    });
  }

  const guUnit = document.querySelector('input[name="unit"][value="gu"]');
  if (guUnit) {
    guUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('guModal').style.display = 'block';
    });
  }

  const breastUnit = document.querySelector('input[name="unit"][value="breast"]');
  if (breastUnit) {
    breastUnit.addEventListener('click', function(e) {
      e.preventDefault();
      closeAllModals();
      document.getElementById('breastModal').style.display = 'block';
    });
  }

  // --- Modal close helpers ---
  function closeAllModals() {
    ['mskModal','thoracicModal','cardiacModal','neuroradModal','giModal','pedsModal','guModal','breastModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function closeModal() { const m = document.getElementById('mskModal'); if (m) m.style.display = 'none'; }
  function closeThoracicModal() { const m = document.getElementById('thoracicModal'); if (m) m.style.display = 'none'; }
  function closeCardiacModal() { const m = document.getElementById('cardiacModal'); if (m) m.style.display = 'none'; }
  function closeNeuroradModal() { const m = document.getElementById('neuroradModal'); if (m) m.style.display = 'none'; }
  function closeGiModal() { const m = document.getElementById('giModal'); if (m) m.style.display = 'none'; }
  function closePedsModal() { const m = document.getElementById('pedsModal'); if (m) m.style.display = 'none'; }
  function closeGuModal() { const m = document.getElementById('guModal'); if (m) m.style.display = 'none'; }
  function closeBreastModal() { const m = document.getElementById('breastModal'); if (m) m.style.display = 'none'; }

  // expose to inline onclick handlers
  window.closeModal = closeModal;
  window.closeThoracicModal = closeThoracicModal;
  window.closeCardiacModal = closeCardiacModal;
  window.closeNeuroradModal = closeNeuroradModal;
  window.closeGiModal = closeGiModal;
  window.closePedsModal = closePedsModal;
  window.closeGuModal = closeGuModal;
  window.closeBreastModal = closeBreastModal;

  // --- Selection handlers ---
  window.handleSubunitSelection = function() {
    const checked = document.querySelectorAll('#mskModal input[type="checkbox"]:checked');
    const c = document.getElementById('mskCheckbox');
    if (c) c.checked = checked.length > 0;
    closeModal();
  };

  window.handleThoracicSubunitSelection = function() {
    const checked = document.querySelectorAll('#thoracicModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="thoracic"]');
    if (c) c.checked = checked.length > 0;
    closeThoracicModal();
  };

  window.handleCardiacSubunitSelection = function() {
    const checked = document.querySelectorAll('#cardiacModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="cardiac"]');
    if (c) c.checked = checked.length > 0;
    closeCardiacModal();
  };

  window.handleNeuroradSubunitSelection = function() {
    const checked = document.querySelectorAll('#neuroradModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="neurorad"]');
    if (c) c.checked = checked.length > 0;
    closeNeuroradModal();
  };

  window.handleGiSubunitSelection = function() {
    const checked = document.querySelectorAll('#giModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="gi"]');
    if (c) c.checked = checked.length > 0;
    closeGiModal();
  };

  window.handlePedsSubunitSelection = function() {
    const checked = document.querySelectorAll('#pedsModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="peds"]');
    if (c) c.checked = checked.length > 0;
    closePedsModal();
  };

  window.handleGuSubunitSelection = function() {
    const checked = document.querySelectorAll('#guModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="gu"]');
    if (c) c.checked = checked.length > 0;
    closeGuModal();
  };

  window.handleBreastSubunitSelection = function() {
    const checked = document.querySelectorAll('#breastModal input[type="checkbox"]:checked');
    const c = document.querySelector('input[name="unit"][value="breast"]');
    if (c) c.checked = checked.length > 0;
    closeBreastModal();
  };

  // --- Click outside to close modals ---
  window.addEventListener('click', function(event) {
    ['mskModal','thoracicModal','cardiacModal','neuroradModal','giModal','pedsModal','guModal','breastModal'].forEach(modalId => {
      const modalEl = document.getElementById(modalId);
      if (modalEl && event.target === modalEl) {
        modalEl.style.display = 'none';
        
        const checkedCount = modalEl.querySelectorAll('input[type="checkbox"]:checked').length;
        const unitValue = modalId.replace('Modal','').toLowerCase();
        const checkbox = unitValue === 'msk'
          ? document.getElementById('mskCheckbox')
          : document.querySelector(`input[name="unit"][value="${unitValue}"]`);
        
        if (checkbox && checkedCount === 0) {
          checkbox.checked = false;
        }
      }
    });
  });

  // --- START button: collect selections, store, route ---
  const startBtn = document.querySelector('.start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      // Clear custom review mode when launching a completely new set of questions
      sessionStorage.removeItem('customStudyMode');

      let filesToLoad = [];

      // Check standard modular sub-unit modals first
      ['msk','thoracic','cardiac','neurorad','gi','peds','gu','breast'].forEach(modal => {
        const boxes = document.querySelectorAll(`#${modal}Modal input[type="checkbox"]:checked`);
        boxes.forEach(cb => filesToLoad.push(cb.value));
      });

      // Fall back to standard parent checkboxes if no subunits are flagged
      if (filesToLoad.length === 0) {
        document.querySelectorAll('input[name="unit"]:checked').forEach(cb => filesToLoad.push(cb.value));
      }

      // Ultimate fallback
      if (filesToLoad.length === 0) {
        filesToLoad.push('sample');
      }

      // Save standard settings to Session Storage
      sessionStorage.setItem('filesToLoad', JSON.stringify(filesToLoad));
      const qcVal = questionCount ? questionCount.value : '40';
      sessionStorage.setItem('questionCount', qcVal);

      const sessionType = (document.querySelector('input[name="sessionType"]:checked') || {}).value || 'study';
      window.location.href = sessionType === 'study' ? 'studymode.html' : 'exammode.html';
    });
  }
});