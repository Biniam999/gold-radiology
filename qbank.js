document.addEventListener('DOMContentLoaded', function () {
  "use strict";

  // --- Controls for question count ---
  const questionCount = document.getElementById('questionCount');
  const minusBtn = document.querySelector('.number-btn.minus');
  const plusBtn = document.querySelector('.number-btn.plus');

  if (minusBtn) {
    minusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentValue = parseInt(questionCount.value, 10) || 40;
      if (currentValue > 1) questionCount.value = currentValue - 1;
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentValue = parseInt(questionCount.value, 10) || 40;
      if (currentValue < 400) questionCount.value = currentValue + 1;
    });
  }

  if (questionCount) {
    questionCount.addEventListener('change', () => {
      const value = parseInt(questionCount.value, 10);
      if (isNaN(value)) questionCount.value = 40;
      else if (value < 1) questionCount.value = 1;
      else if (value > 400) questionCount.value = 400;
    });
  }

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

  // UPDATED: Added Cardiac Modal trigger
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
  // UPDATED: Added 'cardiacModal' to close group array
  function closeAllModals() {
    ['mskModal','thoracicModal','cardiacModal','neuroradModal','giModal','pedsModal','guModal','breastModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function closeModal() { const m = document.getElementById('mskModal'); if (m) m.style.display = 'none'; }
  function closeThoracicModal() { const m = document.getElementById('thoracicModal'); if (m) m.style.display = 'none'; }
  function closeCardiacModal() { const m = document.getElementById('cardiacModal'); if (m) m.style.display = 'none'; } // UPDATED: Created closer
  function closeNeuroradModal() { const m = document.getElementById('neuroradModal'); if (m) m.style.display = 'none'; }
  function closeGiModal() { const m = document.getElementById('giModal'); if (m) m.style.display = 'none'; }
  function closePedsModal() { const m = document.getElementById('pedsModal'); if (m) m.style.display = 'none'; }
  function closeGuModal() { const m = document.getElementById('guModal'); if (m) m.style.display = 'none'; }
  function closeBreastModal() { const m = document.getElementById('breastModal'); if (m) m.style.display = 'none'; }

  // expose to inline onclick handlers
  window.closeModal = closeModal;
  window.closeThoracicModal = closeThoracicModal;
  window.closeCardiacModal = closeCardiacModal; // UPDATED: Exposed closeCardiacModal
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

  // UPDATED: Added Cardiac selection handler
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

  // --- Click outside to close modals & uncheck associated unit ---
  // UPDATED: Added 'cardiacModal' to the array loop
  window.addEventListener('click', function(event) {
    ['mskModal','thoracicModal','cardiacModal','neuroradModal','giModal','pedsModal','guModal','breastModal'].forEach(modalId => {
      const modalEl = document.getElementById(modalId);
      if (modalEl && event.target === modalEl) {
        modalEl.style.display = 'none';
        const unitValue = modalId.replace('Modal','').toLowerCase();
        const checkbox = unitValue === 'msk'
          ? document.getElementById('mskCheckbox')
          : document.querySelector(`input[name="unit"][value="${unitValue}"]`);
        if (checkbox) checkbox.checked = false;
      }
    });
  });

  // --- START button: collect selections, store, route ---
  const startBtn = document.querySelector('.start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      const allSelectedSubunits = [];
      // UPDATED: Added 'cardiac' to modal query selection loop
      ['msk','thoracic','cardiac','neurorad','gi','peds','gu','breast'].forEach(modal => {
        const boxes = document.querySelectorAll(`#${modal}Modal input[type="checkbox"]:checked`);
        boxes.forEach(cb => allSelectedSubunits.push(cb.value));
      });

      const selectedUnits = [];
      document.querySelectorAll('input[name="unit"]:checked').forEach(cb => selectedUnits.push(cb.value));

      const filesToLoad = allSelectedSubunits.length > 0 ? allSelectedSubunits : selectedUnits;
      if (filesToLoad.length === 0) filesToLoad.push('sample');

      sessionStorage.setItem('filesToLoad', JSON.stringify(filesToLoad));
      const qcVal = questionCount ? questionCount.value : '40';
      sessionStorage.setItem('questionCount', qcVal);

      const sessionType = (document.querySelector('input[name="sessionType"]:checked') || {}).value || 'study';
      window.location.href = sessionType === 'study' ? 'studymode.html' : 'exammode.html';
    });
  }
});