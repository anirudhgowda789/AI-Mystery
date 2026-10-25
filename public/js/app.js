/**
 * AI Mystery Room - Main Frontend Application Controller
 */

class DetectiveWorkbench {
  constructor() {
    this.state = {
      session: null,
      case: null,
      activeTab: 'briefing',
      selectedSuspectForAccusation: null,
      notesSaveTimer: null,
      audioEnabled: !window.soundEngine.isMuted()
    };

    this.dom = {};
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    this.updateAudioButtonState();

    // Check if we can restore previous investigation session (Requirement 7)
    const storedSessionId = localStorage.getItem('ai_mystery_session_id');
    if (storedSessionId) {
      try {
        this.showToast('Restoring previous active investigation dossier...', 'info');
        const res = await window.apiClient.getSession(storedSessionId);
        if (res && res.session && res.case) {
          this.setCaseAndSession(res.case, res.session);
          return;
        }
      } catch (err) {
        console.warn('Could not restore stored session, generating fresh case:', err.message);
        localStorage.removeItem('ai_mystery_session_id');
      }
    }

    // Otherwise, generate initial procedural/gemini case
    await this.startFreshCase('Victorian Noir', 'medium', false);
  }

  cacheDom() {
    // Header & HUD
    this.dom.caseTitle = document.getElementById('case-title');
    this.dom.caseThemeTag = document.getElementById('case-theme-tag');
    this.dom.caseDiffTag = document.getElementById('case-diff-tag');
    this.dom.caseLocTag = document.getElementById('case-location-tag');
    this.dom.strikesDisplay = document.getElementById('strikes-display');
    this.dom.evidenceProgressText = document.getElementById('evidence-progress-text');
    this.dom.evidenceProgressFill = document.getElementById('evidence-progress-fill');
    this.dom.detectiveRankText = document.getElementById('detective-rank-text');
    this.dom.btnOpenGenerator = document.getElementById('btn-open-generator');
    this.dom.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.dom.audioIcon = document.getElementById('audio-icon');

    // Nav tabs
    this.dom.navTabs = document.querySelectorAll('.nav-tab');
    this.dom.tabPanes = document.querySelectorAll('.tab-pane');
    this.dom.suspectsBadge = document.getElementById('suspects-badge');
    this.dom.evidenceBadge = document.getElementById('evidence-badge');

    // Status Banner
    this.dom.statusBanner = document.getElementById('case-status-banner');
    this.dom.bannerTitle = document.getElementById('banner-title');
    this.dom.bannerSubtitle = document.getElementById('banner-subtitle');
    this.dom.btnViewSolution = document.getElementById('btn-view-solution');

    // Briefing
    this.dom.caseSynopsis = document.getElementById('case-synopsis');
    this.dom.specVictim = document.getElementById('spec-victim');
    this.dom.specCrimeType = document.getElementById('spec-crime-type');
    this.dom.specCrimeLoc = document.getElementById('spec-crime-loc');
    this.dom.specAtmosphere = document.getElementById('spec-atmosphere');
    this.dom.specCrimeDetails = document.getElementById('spec-crime-details');
    this.dom.btnQuickSuspects = document.getElementById('btn-quick-suspects');

    // Containers
    this.dom.suspectsContainer = document.getElementById('suspects-container');
    this.dom.evidenceContainer = document.getElementById('evidence-container');
    this.dom.evidenceViewedCounter = document.getElementById('evidence-viewed-counter');
    this.dom.corkboard = document.getElementById('corkboard');
    this.dom.corkboardContent = document.getElementById('corkboard-content');
    this.dom.corkboardStrings = document.getElementById('corkboard-strings');
    this.dom.btnResetBoard = document.getElementById('btn-reset-board');

    // Accusation
    this.dom.accusationForm = document.getElementById('accusation-form');
    this.dom.accuseSelect = document.getElementById('accuse-suspect-select');
    this.dom.accuseRationale = document.getElementById('accuse-rationale');
    this.dom.indictmentStrikesCount = document.getElementById('indictment-strikes-count');
    this.dom.accusationHistoryList = document.getElementById('accusation-history-list');

    // Notebook
    this.dom.notesArea = document.getElementById('detective-notes-area');
    this.dom.notesStatus = document.getElementById('notebook-save-status');

    // Modals
    this.dom.modalGenerator = document.getElementById('modal-generator');
    this.dom.btnCloseGenerator = document.getElementById('btn-close-generator');
    this.dom.btnCancelGenerator = document.getElementById('btn-cancel-generator');
    this.dom.btnConfirmGenerate = document.getElementById('btn-confirm-generate');
    this.dom.genLoadingOverlay = document.getElementById('gen-loading-overlay');
    this.dom.genTheme = document.getElementById('gen-theme');
    this.dom.genForceMock = document.getElementById('gen-force-mock');

    this.dom.modalEvidence = document.getElementById('modal-evidence');
    this.dom.btnCloseEvidence = document.getElementById('btn-close-evidence');
    this.dom.btnDismissEvidence = document.getElementById('btn-dismiss-evidence');
    this.dom.modalEvType = document.getElementById('modal-ev-type');
    this.dom.modalEvTitle = document.getElementById('modal-ev-title');
    this.dom.modalEvLocation = document.getElementById('modal-ev-location');
    this.dom.modalEvDescription = document.getElementById('modal-ev-description');
    this.dom.modalEvHint = document.getElementById('modal-ev-hint');

    this.dom.modalSuspect = document.getElementById('modal-suspect');
    this.dom.btnCloseSuspect = document.getElementById('btn-close-suspect');
    this.dom.btnDismissSuspect = document.getElementById('btn-dismiss-suspect');
    this.dom.btnAccuseFromModal = document.getElementById('btn-accuse-from-modal');
    this.dom.modalSusName = document.getElementById('modal-sus-name');
    this.dom.modalSusOccupation = document.getElementById('modal-sus-occupation');
    this.dom.modalSusStatement = document.getElementById('modal-sus-statement');
    this.dom.modalSusAlibi = document.getElementById('modal-sus-alibi');
    this.dom.modalSusMotive = document.getElementById('modal-sus-motive');

    this.dom.modalSolution = document.getElementById('modal-solution');
    this.dom.btnCloseSolution = document.getElementById('btn-close-solution');
    this.dom.btnDismissSolution = document.getElementById('btn-dismiss-solution');
    this.dom.solCulpritName = document.getElementById('sol-culprit-name');
    this.dom.solCulpritRole = document.getElementById('sol-culprit-role');
    this.dom.solMotive = document.getElementById('sol-motive');
    this.dom.solMethod = document.getElementById('sol-method');
    this.dom.solEvidenceHighlight = document.getElementById('sol-evidence-highlight');
    this.dom.solExplanation = document.getElementById('sol-explanation');

    this.dom.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Navigation Tabs
    this.dom.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        window.soundEngine.playTypewriter();
        this.switchTab(tab.dataset.tab);
      });
    });

    if (this.dom.btnQuickSuspects) {
      this.dom.btnQuickSuspects.addEventListener('click', () => {
        this.switchTab('suspects');
      });
    }

    // Audio Toggle
    this.dom.btnToggleAudio.addEventListener('click', () => {
      const active = window.soundEngine.toggleMute();
      this.updateAudioButtonState();
      this.showToast(active ? 'Audio effects enabled' : 'Audio muted', 'info');
    });

    // Case Generator Modal Open/Close
    this.dom.btnOpenGenerator.addEventListener('click', () => {
      this.dom.modalGenerator.classList.remove('hidden');
    });
    this.dom.btnCloseGenerator.addEventListener('click', () => {
      this.dom.modalGenerator.classList.add('hidden');
    });
    this.dom.btnCancelGenerator.addEventListener('click', () => {
      this.dom.modalGenerator.classList.add('hidden');
    });

    this.dom.btnConfirmGenerate.addEventListener('click', async () => {
      const theme = this.dom.genTheme.value;
      const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value || 'medium';
      const forceMock = this.dom.genForceMock.checked;

      this.dom.genLoadingOverlay.classList.remove('hidden');
      try {
        await this.startFreshCase(theme, difficulty, forceMock);
        this.dom.modalGenerator.classList.add('hidden');
      } catch (err) {
        this.showToast(`Generation failed: ${err.message}`, 'error');
      } finally {
        this.dom.genLoadingOverlay.classList.add('hidden');
      }
    });

    // Evidence Modal Close
    this.dom.btnCloseEvidence.addEventListener('click', () => this.dom.modalEvidence.classList.add('hidden'));
    this.dom.btnDismissEvidence.addEventListener('click', () => this.dom.modalEvidence.classList.add('hidden'));

    // Suspect Modal Close & Indict
    this.dom.btnCloseSuspect.addEventListener('click', () => this.dom.modalSuspect.classList.add('hidden'));
    this.dom.btnDismissSuspect.addEventListener('click', () => this.dom.modalSuspect.classList.add('hidden'));
    this.dom.btnAccuseFromModal.addEventListener('click', () => {
      this.dom.modalSuspect.classList.add('hidden');
      this.switchTab('accusation');
      if (this.state.selectedSuspectForAccusation) {
        this.dom.accuseSelect.value = this.state.selectedSuspectForAccusation.id;
      }
    });

    // Solution Modal Close
    this.dom.btnCloseSolution.addEventListener('click', () => this.dom.modalSolution.classList.add('hidden'));
    this.dom.btnDismissSolution.addEventListener('click', () => this.dom.modalSolution.classList.add('hidden'));
    this.dom.btnViewSolution.addEventListener('click', () => this.openSolutionModal());

    // Accusation Form Submission
    this.dom.accusationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAccusationSubmit();
    });

    // Pinboard Re-align
    this.dom.btnResetBoard.addEventListener('click', () => {
      this.drawPinboardStrings();
      this.showToast('Evidence strings recalibrated', 'info');
    });

    // Auto-saving Detective Notes
    this.dom.notesArea.addEventListener('input', () => {
      this.dom.notesStatus.textContent = 'Saving...';
      clearTimeout(this.state.notesSaveTimer);
      this.state.notesSaveTimer = setTimeout(async () => {
        if (!this.state.session) return;
        try {
          await window.apiClient.saveNotes(this.state.session.sessionId, this.dom.notesArea.value);
          this.dom.notesStatus.textContent = 'Saved';
        } catch {
          this.dom.notesStatus.textContent = 'Save failed';
        }
      }, 800);
    });

    // Close modals on clicking overlay background
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });

    // Window resize redraws pinboard yarn strings
    window.addEventListener('resize', () => {
      if (this.state.activeTab === 'pinboard') {
        this.drawPinboardStrings();
      }
    });
  }

  updateAudioButtonState() {
    const isMuted = window.soundEngine.isMuted();
    this.dom.audioIcon.textContent = isMuted ? '🔇' : '🔊';
  }

  switchTab(tabName) {
    this.state.activeTab = tabName;
    this.dom.navTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    this.dom.tabPanes.forEach(p => {
      p.classList.toggle('active', p.id === `pane-${tabName}`);
    });

    if (tabName === 'pinboard') {
      setTimeout(() => this.drawPinboardStrings(), 80);
    }
  }

  async startFreshCase(theme, difficulty, forceMock) {
    this.showToast('Engaging mystery generator...', 'info');
    const caseResult = await window.apiClient.generateCase({ theme, difficulty, forceMock });
    const sessionResult = await window.apiClient.createSession(caseResult.case.caseId);

    localStorage.setItem('ai_mystery_session_id', sessionResult.sessionId);
    this.setCaseAndSession(caseResult.case, sessionResult.session);

    const sourceTag = caseResult.liveVerified ? 'Gemini Live AI' : 'Procedural Sleuth Engine';
    this.showToast(`New case generated via ${sourceTag}!`, 'success');
  }

  setCaseAndSession(caseData, sessionData) {
    this.state.case = caseData;
    this.state.session = sessionData;

    this.renderHeader();
    this.renderBriefing();
    this.renderSuspects();
    this.renderEvidence();
    this.renderPinboard();
    this.renderAccusationTab();
    this.renderNotebook();
    this.updateStatusBanner();
  }

  renderHeader() {
    const { case: c, session: s } = this.state;
    this.dom.caseTitle.textContent = c.title;
    this.dom.caseThemeTag.textContent = `Theme: ${c.theme || 'Noir'}`;
    this.dom.caseDiffTag.textContent = `Difficulty: ${c.difficulty ? c.difficulty.toUpperCase() : 'MEDIUM'}`;
    this.dom.caseLocTag.textContent = `📍 Scene: ${c.crime.location}`;

    // Strikes Display (3 strikes)
    const attempts = s.attemptsRemaining ?? 3;
    const bullets = this.dom.strikesDisplay.querySelectorAll('.strike-bullet');
    bullets.forEach((b, idx) => {
      b.classList.toggle('lost', idx >= attempts);
    });

    // Evidence Progress
    const totalEvidence = c.evidence ? c.evidence.length : 0;
    const viewedCount = s.viewedEvidenceIds ? s.viewedEvidenceIds.length : 0;
    this.dom.evidenceProgressText.textContent = `${viewedCount} / ${totalEvidence}`;
    const pct = totalEvidence > 0 ? (viewedCount / totalEvidence) * 100 : 0;
    this.dom.evidenceProgressFill.style.width = `${pct}%`;
    this.dom.evidenceViewedCounter.textContent = `${viewedCount} of ${totalEvidence} Examined`;

    // Badges on tabs
    this.dom.suspectsBadge.textContent = c.suspects ? c.suspects.length : 0;
    this.dom.evidenceBadge.textContent = totalEvidence;

    // Detective Rank
    this.dom.detectiveRankText.textContent = s.rank || 'Apprentice Sleuth';
  }

  renderBriefing() {
    const c = this.state.case;
    this.dom.caseSynopsis.textContent = c.synopsis;
    this.dom.specVictim.textContent = c.crime.victim;
    this.dom.specCrimeType.textContent = c.crime.type || 'Homicide';
    this.dom.specCrimeLoc.textContent = c.crime.location;
    this.dom.specAtmosphere.textContent = c.setting.atmosphere || 'Ominous';
    this.dom.specCrimeDetails.textContent = c.crime.details;

    const checkBriefing = document.getElementById('check-briefing');
    const checkSuspects = document.getElementById('check-suspects');
    const checkEvidence = document.getElementById('check-evidence');
    const checkIndictment = document.getElementById('check-indictment');

    if (checkBriefing) checkBriefing.textContent = '✅';
    if (checkSuspects) checkSuspects.textContent = this.state.case.suspects.length > 0 ? '✅' : '⭕';
    if (checkEvidence) checkEvidence.textContent = (this.state.session.viewedEvidenceIds.length === this.state.case.evidence.length) ? '✅' : '⭕';
    if (checkIndictment) checkIndictment.textContent = (this.state.session.status !== 'active') ? '✅' : '⭕';
  }

  renderSuspects() {
    const container = this.dom.suspectsContainer;
    container.innerHTML = '';
    const suspects = this.state.case.suspects || [];

    const avatars = ['🎩', '🩺', '💎', '💼', '🧪', '🔍'];

    suspects.forEach((suspect, index) => {
      const card = document.createElement('div');
      card.className = 'suspect-card';
      const avatarIcon = avatars[index % avatars.length];

      card.innerHTML = `
        <div class="suspect-header-band"></div>
        <div class="suspect-card-body">
          <div class="suspect-identity">
            <div class="suspect-avatar" style="border-color: ${suspect.avatarColor || '#f59e0b'}">
              <span>${avatarIcon}</span>
            </div>
            <div>
              <h3 class="suspect-name">${this.escapeHtml(suspect.name)}</h3>
              <span class="suspect-role">${this.escapeHtml(suspect.occupation)}</span>
            </div>
          </div>

          <div class="suspicion-meter">
            <div class="suspicion-label-row">
              <span>SUSPICION METER</span>
              <span>${suspect.suspicionLevel || 50}%</span>
            </div>
            <div class="meter-track">
              <div class="meter-fill" style="width: ${suspect.suspicionLevel || 50}%; background: ${suspect.suspicionLevel > 70 ? '#ef4444' : '#f59e0b'}"></div>
            </div>
          </div>

          <p class="suspect-snippet">"${this.escapeHtml(suspect.statement)}"</p>
        </div>
        <div class="suspect-card-footer">
          <span class="meta-tag">Rel: ${this.escapeHtml(suspect.relationship || 'Acquaintance')}</span>
          <button class="btn btn-secondary btn-sm btn-interrogate">Interrogate</button>
        </div>
      `;

      card.addEventListener('click', () => {
        window.soundEngine.playTypewriter();
        this.openSuspectModal(suspect, avatarIcon);
      });

      container.appendChild(card);
    });
  }

  openSuspectModal(suspect, avatarIcon) {
    this.state.selectedSuspectForAccusation = suspect;
    this.dom.modalSusAvatar = document.getElementById('modal-sus-avatar');
    if (this.dom.modalSusAvatar) this.dom.modalSusAvatar.textContent = avatarIcon || '👤';
    this.dom.modalSusName.textContent = suspect.name;
    this.dom.modalSusOccupation.textContent = `${suspect.occupation} • ${suspect.relationship || 'Person of Interest'}`;
    this.dom.modalSusStatement.textContent = `"${suspect.statement}"`;
    this.dom.modalSusAlibi.textContent = suspect.alibi;
    this.dom.modalSusMotive.textContent = suspect.motive;
    this.dom.modalSuspect.classList.remove('hidden');
  }

  renderEvidence() {
    const container = this.dom.evidenceContainer;
    container.innerHTML = '';
    const evidenceList = this.state.case.evidence || [];
    const viewedSet = new Set(this.state.session.viewedEvidenceIds || []);

    const typeIcons = {
      physical: '🔬',
      forensic: '🧪',
      document: '📜',
      testimonial: '🎙️',
      digital: '💾'
    };

    evidenceList.forEach(item => {
      const isViewed = viewedSet.has(item.id);
      const card = document.createElement('div');
      card.className = `evidence-card ${isViewed ? 'viewed' : ''}`;
      const icon = typeIcons[item.type] || '🔍';

      card.innerHTML = `
        ${isViewed ? '<span class="viewed-seal">✓ EXAMINED</span>' : ''}
        <div class="evidence-top-row">
          <span class="evidence-type-badge badge-${item.type}">${item.type.toUpperCase()}</span>
        </div>
        <h3 class="evidence-title">${this.escapeHtml(item.title)}</h3>
        <span class="evidence-loc">📍 Found: ${this.escapeHtml(item.locationFound)}</span>
        <p class="evidence-snippet">${this.escapeHtml(item.description)}</p>
        <button class="btn btn-secondary btn-sm full-width" style="margin-top: auto;">
          <span>${isViewed ? 'Review Forensics' : 'Examine Under UV Light'}</span>
          <span>${icon}</span>
        </button>
      `;

      card.addEventListener('click', async () => {
        await this.handleEvidenceInspection(item, icon);
      });

      container.appendChild(card);
    });
  }

  async handleEvidenceInspection(item, icon) {
    window.soundEngine.playEvidenceChime();

    // Track evidence view in backend session (Requirement 6)
    if (!this.state.session.viewedEvidenceIds.includes(item.id)) {
      try {
        const update = await window.apiClient.viewEvidence(this.state.session.sessionId, item.id);
        if (update && update.viewedEvidenceIds) {
          this.state.session.viewedEvidenceIds = update.viewedEvidenceIds;
          this.renderHeader();
          this.renderEvidence();
        }
      } catch (err) {
        console.error('Failed to log evidence view:', err);
      }
    }

    // Populate and show evidence modal
    this.dom.modalEvType.textContent = item.type.toUpperCase();
    this.dom.modalEvType.className = `evidence-type-badge badge-${item.type}`;
    this.dom.modalEvTitle.textContent = item.title;
    this.dom.modalEvIcon = document.getElementById('modal-ev-icon');
    if (this.dom.modalEvIcon) this.dom.modalEvIcon.textContent = icon;
    this.dom.modalEvLocation.textContent = `📍 Found at: ${item.locationFound}`;
    this.dom.modalEvDescription.textContent = item.description;

    const hintContainer = document.getElementById('modal-ev-hint-container');
    if (item.hint) {
      hintContainer.classList.remove('hidden');
      this.dom.modalEvHint.textContent = item.hint;
    } else {
      hintContainer.classList.add('hidden');
    }

    this.dom.modalEvidence.classList.remove('hidden');
  }

  renderPinboard() {
    const content = this.dom.corkboardContent;
    content.innerHTML = '';
    const suspects = this.state.case.suspects || [];
    const evidenceList = this.state.case.evidence || [];

    // Render suspect cards on board
    suspects.forEach(s => {
      const card = document.createElement('div');
      card.className = 'pin-card';
      card.id = `pin-suspect-${s.id}`;
      card.innerHTML = `
        <span class="pin-card-meta">SUSPECT</span>
        <h4 class="pin-card-title">${this.escapeHtml(s.name)}</h4>
        <small style="color: #94a3b8;">${this.escapeHtml(s.occupation)}</small>
      `;
      content.appendChild(card);
    });

    // Render evidence cards on board
    evidenceList.forEach(e => {
      const card = document.createElement('div');
      card.className = 'pin-card';
      card.id = `pin-evidence-${e.id}`;
      card.innerHTML = `
        <span class="pin-card-meta" style="color: #06b6d4;">CLUE: ${e.type.toUpperCase()}</span>
        <h4 class="pin-card-title">${this.escapeHtml(e.title)}</h4>
        <small style="color: #94a3b8;">${this.escapeHtml(e.locationFound)}</small>
      `;
      content.appendChild(card);
    });

    setTimeout(() => this.drawPinboardStrings(), 100);
  }

  drawPinboardStrings() {
    const svg = this.dom.corkboardStrings;
    if (!svg) return;
    svg.innerHTML = '';

    const suspects = this.state.case.suspects || [];
    const evidenceList = this.state.case.evidence || [];
    const boardRect = this.dom.corkboard.getBoundingClientRect();

    // Draw string from each suspect to 1-2 evidence clues for aesthetic noir mystery feel
    suspects.forEach((s, idx) => {
      const sElem = document.getElementById(`pin-suspect-${s.id}`);
      const targetEvidence = evidenceList[idx % evidenceList.length];
      const eElem = targetEvidence ? document.getElementById(`pin-evidence-${targetEvidence.id}`) : null;

      if (sElem && eElem) {
        const sRect = sElem.getBoundingClientRect();
        const eRect = eElem.getBoundingClientRect();

        const x1 = sRect.left + sRect.width / 2 - boardRect.left;
        const y1 = sRect.top + sRect.height / 2 - boardRect.top;
        const x2 = eRect.left + eRect.width / 2 - boardRect.left;
        const y2 = eRect.top + eRect.height / 2 - boardRect.top;

        // Draw curved red yarn line
        const midX = (x1 + x2) / 2 + (idx % 2 === 0 ? 30 : -30);
        const midY = (y1 + y2) / 2 + 40;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`);
        path.setAttribute('stroke', '#ef4444');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-opacity', '0.65');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '4,2');
        svg.appendChild(path);
      }
    });
  }

  renderAccusationTab() {
    const select = this.dom.accuseSelect;
    select.innerHTML = '<option value="" disabled selected>-- Choose Suspect from Lineup --</option>';
    const suspects = this.state.case.suspects || [];

    suspects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.occupation})`;
      select.appendChild(opt);
    });

    const attempts = this.state.session.attemptsRemaining ?? 3;
    this.dom.indictmentStrikesCount.textContent = `${attempts} of 3`;

    // Render accusation history
    const historyList = this.dom.accusationHistoryList;
    historyList.innerHTML = '';
    const accusations = this.state.session.accusations || [];

    if (accusations.length === 0) {
      historyList.innerHTML = '<p class="text-muted">No accusations filed yet in this session.</p>';
    } else {
      accusations.forEach(acc => {
        const item = document.createElement('div');
        item.className = `history-item ${acc.isCorrect ? 'correct' : ''}`;
        item.innerHTML = `
          <div class="history-item-top">
            <span>Indicted: ${this.escapeHtml(acc.suspectName)}</span>
            <span>${acc.isCorrect ? '✅ GUILTY AS CHARGED' : '❌ FALSE INDICTMENT'}</span>
          </div>
          <p class="history-item-feedback">${this.escapeHtml(acc.feedback)}</p>
        `;
        historyList.appendChild(item);
      });
    }
  }

  async handleAccusationSubmit() {
    const suspectId = this.dom.accuseSelect.value;
    const rationale = this.dom.accuseRationale.value.trim();

    if (!suspectId) {
      this.showToast('Please select a suspect to indict', 'error');
      return;
    }

    try {
      const res = await window.apiClient.submitAccusation(this.state.session.sessionId, suspectId, rationale);
      
      this.state.session.status = res.status;
      this.state.session.attemptsRemaining = res.attemptsRemaining;
      this.state.session.score = res.score;
      this.state.session.rank = res.rank;
      this.state.session.solutionUnlocked = res.solutionUnlocked;

      // Refresh session object
      const refreshed = await window.apiClient.getSession(this.state.session.sessionId);
      if (refreshed && refreshed.session) {
        this.state.session = refreshed.session;
      }

      this.renderHeader();
      this.renderAccusationTab();
      this.updateStatusBanner();

      if (res.correct) {
        window.soundEngine.playVictoryFanfare();
        this.showToast('CASE SOLVED! The culprit has confessed!', 'success');
        this.openSolutionModal();
      } else {
        window.soundEngine.playStrikeBuzzer();
        if (res.status === 'failed') {
          this.showToast('STRIKE 3! Case has gone cold. You have been pulled from the investigation.', 'error');
        } else {
          this.showToast(`False Indictment! Strike recorded. ${res.attemptsRemaining} remaining.`, 'error');
        }
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderNotebook() {
    if (this.state.session && this.state.session.notes) {
      this.dom.notesArea.value = this.state.session.notes;
    }
  }

  updateStatusBanner() {
    const s = this.state.session;
    const banner = this.dom.statusBanner;

    if (!s || s.status === 'active') {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    if (s.status === 'solved') {
      banner.className = 'case-status-banner';
      this.dom.bannerTitle.textContent = 'CASE SOLVED!';
      this.dom.bannerSubtitle.textContent = `Brilliant deduction! Case closed with rank: ${s.rank || 'Master Sleuth'}.`;
    } else if (s.status === 'failed') {
      banner.className = 'case-status-banner status-failed';
      this.dom.bannerTitle.textContent = 'INVESTIGATION CONCLUDED (COLD CASE)';
      this.dom.bannerSubtitle.textContent = 'All strikes exhausted. The commissioner has unsealed the classified solution file.';
    }
  }

  async openSolutionModal() {
    try {
      this.showToast('Accessing classified solution records...', 'info');
      // Requirement 10: Calls authorized endpoint
      const res = await window.apiClient.getSolution(this.state.session.sessionId);
      const sol = res.solution;

      this.dom.solCulpritName.textContent = sol.culpritName;
      this.dom.solCulpritRole.textContent = sol.culpritOccupation;
      this.dom.solMotive.textContent = sol.motive;
      this.dom.solMethod.textContent = sol.method;
      this.dom.solEvidenceHighlight.textContent = `Smoking Gun: ${sol.conclusiveEvidenceTitle}`;
      this.dom.solExplanation.textContent = sol.explanation;

      this.dom.modalSolution.classList.remove('hidden');
    } catch (err) {
      this.showToast(`Solution locked: ${err.message}`, 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { info: 'ℹ️', success: '🏆', error: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${this.escapeHtml(message)}</span>`;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const workbench = new DetectiveWorkbench();
  workbench.init();
});
