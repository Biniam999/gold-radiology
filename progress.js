document.addEventListener('DOMContentLoaded', () => {
  // Load stats from localStorage
  const stats = JSON.parse(localStorage.getItem('qbankStats')) || {
    totalAnswered: 0,
    totalCorrect: 0,
    sessionsCount: 0,
    studyMode: { answered: 0, correct: 0 },
    examMode: { answered: 0, correct: 0 },
    units: {} // e.g. { thoracic: { answered: 12, correct: 9 }, msk: { answered: 5, correct: 3 } }
  };

  // 1. Populate Overview Board
  document.getElementById('totalAnswered').textContent = stats.totalAnswered;
  document.getElementById('sessionsCompleted').textContent = stats.sessionsCount;
  
  const accuracy = stats.totalAnswered > 0 
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) 
    : 0;
  document.getElementById('overallAccuracy').textContent = `${accuracy}%`;

  // 2. Populate Modes Info
  document.getElementById('studyAnswered').textContent = stats.studyMode.answered;
  document.getElementById('studyCorrect').textContent = stats.studyMode.correct;
  document.getElementById('examAnswered').textContent = stats.examMode.answered;
  document.getElementById('examCorrect').textContent = stats.examMode.correct;

  // 3. Populate Unit Breakdown List
  const unitContainer = document.getElementById('unitProgressContainer');
  const unitKeys = Object.keys(stats.units);

  if (unitKeys.length > 0) {
    unitContainer.innerHTML = ''; // Clear the "no data" placeholder
    unitKeys.forEach(unit => {
      const uData = stats.units[unit];
      if (uData.answered > 0) {
        const unitAcc = Math.round((uData.correct / uData.answered) * 100);
        
        const unitRow = document.createElement('div');
        unitRow.className = 'unit-progress-row';
        unitRow.innerHTML = `
          <div class="unit-progress-info">
            <span class="unit-name">${unit}</span>
            <span class="unit-score">${unitAcc}% (${uData.correct}/${uData.answered})</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${unitAcc}%"></div>
          </div>
        `;
        unitContainer.appendChild(unitRow);
      }
    });
  }

  // 4. Reset Button Behavior
  const resetBtn = document.getElementById('resetProgressBtn');
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you absolutely sure you want to reset all your progress and performance stats? This cannot be undone.')) {
      localStorage.removeItem('qbankStats');
      window.location.reload();
    }
  });
});