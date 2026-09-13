function getDefaultNotes() {
  return {
    missionId: `MSN-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    pilotName: '',
    location: '',
    gpsLat: '',
    gpsLon: '',
    altitudeAGL: '',
    flightSpeed: '',
    overlapFront: '80',
    overlapSide: '70',
    batteryCount: '',
    estimatedDuration: '',
    weatherCondition: '',
    windSpeed: '',
    visibility: '',
    temperature: '',
    missionType: 'accident-scene',
    notes: '',
  };
}

const initialChecklist = [
  { id: 'eq1', category: 'Equipment', label: 'Drone airframe inspected — no cracks or damage', critical: true, checked: false },
  { id: 'eq2', category: 'Equipment', label: 'All propellers seated and torqued correctly', critical: true, checked: false },
  { id: 'eq3', category: 'Equipment', label: 'Battery charge ≥ 80% on all flight packs', critical: true, checked: false },
  { id: 'eq4', category: 'Equipment', label: 'Camera lens cleaned and gimbal locks removed', critical: false, checked: false },
  { id: 'eq5', category: 'Equipment', label: 'LiDAR sensor calibrated (if applicable)', critical: false, checked: false },
  { id: 'eq6', category: 'Equipment', label: 'SD card formatted and capacity confirmed', critical: false, checked: false },
  { id: 'eq7', category: 'Equipment', label: 'GPS module locked — satellites ≥ 10', critical: true, checked: false },
  { id: 'sf1', category: 'Safety', label: 'Flight zone perimeter secured and marked', critical: true, checked: false },
  { id: 'sf2', category: 'Safety', label: 'Emergency contact and incident plan briefed', critical: true, checked: false },
  { id: 'sf3', category: 'Safety', label: 'Visual observers positioned at site boundaries', critical: false, checked: false },
  { id: 'sf4', category: 'Safety', label: 'First-aid kit accessible on-site', critical: false, checked: false },
  { id: 'sf5', category: 'Safety', label: 'Return-to-home altitude and failsafe configured', critical: true, checked: false },
  { id: 'sf6', category: 'Safety', label: 'Anti-collision lights functional', critical: false, checked: false },
  { id: 'rg1', category: 'Regulatory', label: 'NOTAM / airspace authorisation confirmed', critical: true, checked: false },
  { id: 'rg2', category: 'Regulatory', label: 'Pilot Remote ID active and broadcasting', critical: true, checked: false },
  { id: 'rg3', category: 'Regulatory', label: 'Law enforcement / site authority notified', critical: true, checked: false },
  { id: 'rg4', category: 'Regulatory', label: 'Insurance certificate available on-site', critical: false, checked: false },
  { id: 'rg5', category: 'Regulatory', label: 'Flight log book prepared and ready to sign', critical: false, checked: false },
  { id: 'ms1', category: 'Mission', label: 'Flight plan loaded and verified in GCS', critical: true, checked: false },
  { id: 'ms2', category: 'Mission', label: 'GCP markers placed and coordinates recorded', critical: false, checked: false },
  { id: 'ms3', category: 'Mission', label: 'Data upload destination confirmed (cloud / local)', critical: false, checked: false },
  { id: 'ms4', category: 'Mission', label: 'Photogrammetry software parameters set', critical: false, checked: false },
  { id: 'ms5', category: 'Mission', label: 'Comms check — pilot ↔ observer established', critical: true, checked: false },
];

const steps = ['Flight Notes', 'Pre-flight Checklist', 'Review & Submit'];
const weatherConditions = ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Fog / Low Visibility', 'High Wind Advisory'];
const missionTypes = [
  { value: 'accident-scene', label: 'Accident Scene Documentation' },
  { value: 'insurance-survey', label: 'Insurance Survey' },
  { value: 'law-enforcement', label: 'Law Enforcement Evidence' },
  { value: 'infrastructure', label: 'Infrastructure Inspection' },
  { value: 'training-flight', label: 'Training Flight' },
];

const state = {
  step: 0,
  notes: getDefaultNotes(),
  checklist: initialChecklist.map((item) => ({ ...item })),
  errors: {},
  submitted: false,
  isDark: true,
};

const app = document.getElementById('app');

function validateNotes() {
  const errors = {};
  if (!state.notes.pilotName.trim()) errors.pilotName = 'Pilot name required';
  if (!state.notes.location.trim()) errors.location = 'Location description required';
  if (!state.notes.gpsLat || Number.isNaN(Number(state.notes.gpsLat)) || Math.abs(Number(state.notes.gpsLat)) > 90) {
    errors.gpsLat = 'Valid latitude required (−90 to 90)';
  }
  if (!state.notes.gpsLon || Number.isNaN(Number(state.notes.gpsLon)) || Math.abs(Number(state.notes.gpsLon)) > 180) {
    errors.gpsLon = 'Valid longitude required (−180 to 180)';
  }
  if (!state.notes.altitudeAGL || Number(state.notes.altitudeAGL) <= 0 || Number(state.notes.altitudeAGL) > 400) {
    errors.altitudeAGL = 'Altitude must be 1–400 m AGL';
  }
  if (!state.notes.flightSpeed || Number(state.notes.flightSpeed) <= 0) errors.flightSpeed = 'Flight speed required';
  if (!state.notes.batteryCount || Number(state.notes.batteryCount) < 1) errors.batteryCount = 'Battery count required';
  if (!state.notes.estimatedDuration || Number(state.notes.estimatedDuration) <= 0) errors.estimatedDuration = 'Estimated duration required';
  if (!state.notes.weatherCondition) errors.weatherCondition = 'Weather condition required';
  if (!state.notes.windSpeed || Number(state.notes.windSpeed) < 0) errors.windSpeed = 'Wind speed required';
  if (!state.notes.visibility || Number(state.notes.visibility) <= 0) errors.visibility = 'Visibility required';
  return errors;
}

function renderStepIndicator() {
  return `
    <div class="step-indicator">
      ${steps
        .map((label, index) => {
          const isActive = index === state.step;
          const isDone = index < state.step;
          const bulletClass = isDone ? 'done' : isActive ? 'active' : 'inactive';
          const labelClass = isDone ? 'done' : isActive ? 'active' : 'inactive';
          return `
            <div class="step-node">
              <div class="step-node-inner">
                <div class="step-bullet ${bulletClass}">${isDone ? '✓' : String(index + 1).padStart(2, '0')}</div>
                <span class="step-label ${labelClass}">${label}</span>
              </div>
              ${index < steps.length - 1 ? `<div class="step-line ${isDone ? 'done' : ''}"></div>` : ''}
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderField(label, required, error, hint, controlHtml) {
  return `
    <div class="field">
      <label class="mono">${label}${required ? '<span class="req">*</span>' : ''}</label>
      ${controlHtml}
      ${error ? `<div class="field-error mono">${error}</div>` : ''}
      ${hint && !error ? `<div class="field-hint mono">${hint}</div>` : ''}
    </div>
  `;
}

function renderFlightNotesForm() {
  return `
    <div class="form-grid">
      <div class="section-header">
        <span>Mission Identity</span>
        <div class="section-divider"></div>
      </div>

      ${renderField('Mission ID', false, '', '', `<input class="input mono" value="${state.notes.missionId}" data-field="missionId" />`)}
      ${renderField('Date', false, '', '', `<input type="date" class="input" value="${state.notes.date}" data-field="date" />`)}
      ${renderField('Scheduled Time', false, '', '', `<input type="time" class="input" value="${state.notes.time}" data-field="time" />`)}

      <div class="section-header">
        <span>Pilot</span>
        <div class="section-divider"></div>
      </div>

      ${renderField('Pilot Full Name', true, state.errors.pilotName || '', '', `<input class="input ${state.errors.pilotName ? 'error' : ''}" value="${state.notes.pilotName}" placeholder="J. Smith" data-field="pilotName" />`)}

      <div class="section-header">
        <span>Site & Coordinates</span>
        <div class="section-divider"></div>
      </div>

      ${renderField('Site Location', true, state.errors.location || '', 'Address or named landmark', `<input class="input ${state.errors.location ? 'error' : ''} col-span-full" value="${state.notes.location}" placeholder="N1 Highway, km 47, Johannesburg" data-field="location" />`)}
      ${renderField('GPS Latitude', true, state.errors.gpsLat || '', '', `<input class="input ${state.errors.gpsLat ? 'error' : ''}" value="${state.notes.gpsLat}" placeholder="-26.204103" data-field="gpsLat" />`)}
      ${renderField('GPS Longitude', true, state.errors.gpsLon || '', '', `<input class="input ${state.errors.gpsLon ? 'error' : ''}" value="${state.notes.gpsLon}" placeholder="28.047305" data-field="gpsLon" />`)}

      <div class="section-header">
        <span>Flight Parameters</span>
        <div class="section-divider"></div>
      </div>

      ${renderField('Altitude AGL (m)', true, state.errors.altitudeAGL || '', 'Max 400 m', `<input type="number" class="input ${state.errors.altitudeAGL ? 'error' : ''}" value="${state.notes.altitudeAGL}" placeholder="80" data-field="altitudeAGL" />`)}
      ${renderField('Flight Speed (m/s)', true, state.errors.flightSpeed || '', '', `<input type="number" class="input ${state.errors.flightSpeed ? 'error' : ''}" value="${state.notes.flightSpeed}" placeholder="8" data-field="flightSpeed" />`)}
      ${renderField('Front Overlap (%)', false, '', 'Recommended ≥ 75%', `<input type="number" class="input" value="${state.notes.overlapFront}" placeholder="80" data-field="overlapFront" />`)}
      ${renderField('Side Overlap (%)', false, '', 'Recommended ≥ 65%', `<input type="number" class="input" value="${state.notes.overlapSide}" placeholder="70" data-field="overlapSide" />`)}
      ${renderField('Battery Packs', true, state.errors.batteryCount || '', '', `<input type="number" class="input ${state.errors.batteryCount ? 'error' : ''}" value="${state.notes.batteryCount}" placeholder="3" data-field="batteryCount" />`)}
      ${renderField('Est. Duration (min)', true, state.errors.estimatedDuration || '', '', `<input type="number" class="input ${state.errors.estimatedDuration ? 'error' : ''}" value="${state.notes.estimatedDuration}" placeholder="45" data-field="estimatedDuration" />`)}

      <div class="section-header">
        <span>Weather Conditions</span>
        <div class="section-divider"></div>
      </div>

      ${renderField('Condition', true, state.errors.weatherCondition || '', '', `<select class="select ${state.errors.weatherCondition ? 'error' : ''}" data-field="weatherCondition"><option value="">Select…</option>${weatherConditions.map((option) => `<option value="${option}" ${state.notes.weatherCondition === option ? 'selected' : ''}>${option}</option>`).join('')}</select>`)}
      ${renderField('Wind Speed (km/h)', true, state.errors.windSpeed || '', '', `<input type="number" class="input ${state.errors.windSpeed ? 'error' : ''}" value="${state.notes.windSpeed}" placeholder="14" data-field="windSpeed" />`)}
      ${renderField('Visibility (km)', true, state.errors.visibility || '', '', `<input type="number" class="input ${state.errors.visibility ? 'error' : ''}" value="${state.notes.visibility}" placeholder="10" data-field="visibility" />`)}
      ${renderField('Temperature (°C)', false, '', '', `<input type="number" class="input" value="${state.notes.temperature}" placeholder="22" data-field="temperature" />`)}

      <div class="section-header">
        <span>Mission Type</span>
        <div class="section-divider"></div>
      </div>

      ${renderField('Mission Type', false, '', '', `<select class="select" data-field="missionType">${missionTypes.map((option) => `<option value="${option.value}" ${state.notes.missionType === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select>`) }

      <div class="section-header">
        <span>Additional Notes</span>
        <div class="section-divider"></div>
      </div>

      <div class="field col-span-full">
        <label class="mono">Operator Notes</label>
        <textarea class="textarea" placeholder="Scene specifics, hazards, special instructions, equipment anomalies…" data-field="notes">${state.notes.notes}</textarea>
      </div>
    </div>
  `;
}

function renderChecklist() {
  const categories = [...new Set(state.checklist.map((item) => item.category))];
  const criticalUnchecked = state.checklist.filter((item) => item.critical && !item.checked);
  const totalChecked = state.checklist.filter((item) => item.checked).length;
  const percentage = Math.round((totalChecked / state.checklist.length) * 100);

  return `
    <div class="checklist-wrap">
      <div class="progress-block">
        <div class="progress-meta mono">
          <span>${totalChecked} / ${state.checklist.length} checks complete</span>
          <span>${percentage}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>

      ${criticalUnchecked.length > 0 ? `
        <div class="warning-banner">
          <div class="icon">⚠</div>
          <div>
            <p class="title mono">Critical Items Pending</p>
            <p class="desc mono">${criticalUnchecked.length} critical item${criticalUnchecked.length !== 1 ? 's' : ''} must be confirmed before submission.</p>
          </div>
        </div>
      ` : ''}

      ${categories.map((category) => {
        const items = state.checklist.filter((item) => item.category === category);
        const categoryDone = items.filter((item) => item.checked).length;
        return `
          <div class="category-block">
            <div class="category-header">
              <span class="label mono">${category}</span>
              <div class="category-divider"></div>
              <span class="category-total mono">${categoryDone}/${items.length}</span>
            </div>

            ${items.map((item) => `
              <label class="check-item ${item.checked ? 'checked' : ''} ${item.critical && !item.checked ? 'critical-pending' : ''}" data-toggle-id="${item.id}">
                <div class="checkmark-box">
                  ${item.checked ? `
                    <svg viewBox="0 0 10 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M1 4l3 3 5-6" />
                    </svg>
                  ` : ''}
                </div>
                <span class="check-item-text mono">${item.label}</span>
                <span class="check-badges">
                  ${item.critical && !item.checked ? '<span class="badge-critical mono">Critical</span>' : ''}
                  ${item.checked ? '<span class="badge-done mono">✓</span>' : ''}
                </span>
              </label>
            `).join('')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderReviewRow(label, value, highlight = false) {
  return `
    <div class="review-row">
      <span class="label mono">${label}</span>
      <span class="value mono ${highlight ? 'highlight' : ''}">${value || '—'}</span>
    </div>
  `;
}

function renderReviewStep() {
  const criticalPending = state.checklist.filter((item) => item.critical && !item.checked);
  const unchecked = state.checklist.filter((item) => !item.checked);

  let statusType = 'success';
  let emoji = '✅';
  let title = 'All Checks Passed';
  let text = 'Mission is cleared for submission.';

  if (criticalPending.length > 0) {
    statusType = 'blocked';
    emoji = '⛔';
    title = 'Submission Blocked';
    text = `${criticalPending.length} critical checklist item${criticalPending.length !== 1 ? 's' : ''} unresolved. Return to checklist.`;
  } else if (unchecked.length > 0) {
    statusType = 'warning';
    emoji = '⚠';
    title = 'Non-critical Items Open';
    text = `${unchecked.length} item${unchecked.length !== 1 ? 's' : ''} unchecked. Submission allowed but review recommended.`;
  }

  return `
    <div class="review-wrap">
      <div class="status-banner ${statusType}">
        <div class="emoji">${emoji}</div>
        <div>
          <p class="title">${title}</p>
          <p class="content mono">${text}</p>
        </div>
      </div>

      <div class="review-grid">
        <div class="review-section">
          <p class="review-section-header mono">Mission Identity</p>
          ${renderReviewRow('Mission ID', state.notes.missionId, true)}
          ${renderReviewRow('Date / Time', `${state.notes.date} ${state.notes.time}`)}
        </div>

        <div class="review-section">
          <p class="review-section-header mono">Pilot & Equipment</p>
          ${renderReviewRow('Pilot', state.notes.pilotName)}
        </div>

        <div class="review-section">
          <p class="review-section-header mono">Site & Coordinates</p>
          ${renderReviewRow('Location', state.notes.location)}
          ${renderReviewRow('Latitude', state.notes.gpsLat)}
          ${renderReviewRow('Longitude', state.notes.gpsLon)}
        </div>

        <div class="review-section">
          <p class="review-section-header mono">Flight Parameters</p>
          ${renderReviewRow('Altitude AGL', state.notes.altitudeAGL ? `${state.notes.altitudeAGL} m` : '')}
          ${renderReviewRow('Speed', state.notes.flightSpeed ? `${state.notes.flightSpeed} m/s` : '')}
          ${renderReviewRow('Overlap', `${state.notes.overlapFront}% / ${state.notes.overlapSide}%`)}
          ${renderReviewRow('Batteries', state.notes.batteryCount)}
          ${renderReviewRow('Est. Duration', state.notes.estimatedDuration ? `${state.notes.estimatedDuration} min` : '')}
        </div>

        <div class="review-section">
          <p class="review-section-header mono">Weather</p>
          ${renderReviewRow('Condition', state.notes.weatherCondition)}
          ${renderReviewRow('Wind', state.notes.windSpeed ? `${state.notes.windSpeed} km/h` : '')}
          ${renderReviewRow('Visibility', state.notes.visibility ? `${state.notes.visibility} km` : '')}
          ${renderReviewRow('Temperature', state.notes.temperature ? `${state.notes.temperature}°C` : '')}
        </div>

        <div class="review-section">
          <p class="review-section-header mono">Checklist Summary</p>
          ${renderReviewRow('Checks Complete', `${state.checklist.filter((item) => item.checked).length} / ${state.checklist.length}`, state.checklist.every((item) => item.checked))}
          ${renderReviewRow('Critical Cleared', criticalPending.length === 0 ? 'Yes' : `${criticalPending.length} pending`, criticalPending.length === 0)}
        </div>
      </div>

      ${state.notes.notes ? `
        <div class="review-section">
          <p class="review-section-header mono">Operator Notes</p>
          <p class="content mono" style="margin:0; white-space:pre-wrap; color:var(--foreground); line-height:1.6;">${state.notes.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderSuccessScreen() {
  const timestamp = new Date().toISOString();

  return `
    <div class="success-wrap">
      <div class="success-icon">✓</div>
      <div>
        <h2>Mission Submitted</h2>
        <p>Flight notes and pre-flight validation for mission <span class="mono" style="color: var(--primary);">${state.notes.missionId}</span> have been logged.</p>
      </div>

      <div class="receipt-box">
        <p class="receipt-title mono">Submission Receipt</p>
        ${renderReviewRow('Mission ID', state.notes.missionId, true)}
        ${renderReviewRow('Pilot', state.notes.pilotName)}
        ${renderReviewRow('Site', state.notes.location)}
        ${renderReviewRow('Submitted At', timestamp)}
        ${renderReviewRow('Status', 'PENDING DISPATCH APPROVAL')}
      </div>

      <button class="btn btn-secondary" id="new-mission-btn">Log New Mission</button>
    </div>
  `;
}

function render() {
  app.className = `app-shell ${state.isDark ? '' : 'light-mode'}`;
  app.innerHTML = `
    <div class="container">
      <header class="topbar">
        <div>
          <div class="brand-meta mono">
            <span>DAIAS · D-3D</span>
            <span class="dot"></span>
            <span class="muted">Project Code D-3D</span>
          </div>
          <h1 class="title">Flight Mission Logger</h1>
          <p class="subtitle">Drone-Assisted Insurance Assessment Service</p>
        </div>

        <div class="header-actions">
          <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">
            ${state.isDark ? `
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
              </svg>
            ` : `
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              </svg>
            `}
          </button>
          <div class="date-block mono">
            <div class="date-label">${new Date().toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div class="badge">Vehicle Accident Scene Documentation</div>
          </div>
        </div>
      </header>

      <main class="wizard-card">
        ${state.submitted ? renderSuccessScreen() : `
          ${renderStepIndicator()}
          <div class="step-panel">
            ${state.step === 0 ? renderFlightNotesForm() : ''}
            ${state.step === 1 ? renderChecklist() : ''}
            ${state.step === 2 ? renderReviewStep() : ''}
          </div>

          <div class="nav-buttons">
            <button class="btn" id="back-btn" ${state.step === 0 ? 'disabled' : ''}>← Back</button>

            <div style="display:flex; align-items:center; gap:12px;">
              ${state.step === 0 && Object.keys(state.errors).length > 0 ? `<span class="muted-note mono">${Object.keys(state.errors).length} field${Object.keys(state.errors).length !== 1 ? 's' : ''} need attention</span>` : ''}
              ${state.step < steps.length - 1 ? `<button class="btn btn-primary" id="next-btn">Continue →</button>` : `<button class="btn btn-primary" id="submit-btn" ${state.checklist.filter((item) => item.critical && !item.checked).length ? 'disabled' : ''}>Submit Mission Log</button>`}
            </div>
          </div>
        `}
      </main>
    </div>
  `;

  const backButton = document.getElementById('back-btn');
  const nextButton = document.getElementById('next-btn');
  const submitButton = document.getElementById('submit-btn');
  const themeToggle = document.getElementById('theme-toggle');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.isDark = !state.isDark;
      render();
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      state.step = Math.max(0, state.step - 1);
      render();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (state.step === 0) {
        state.errors = validateNotes();
        if (Object.keys(state.errors).length > 0) {
          render();
          return;
        }
      }
      state.step = Math.min(state.step + 1, steps.length - 1);
      render();
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', () => {
      const criticalPending = state.checklist.filter((item) => item.critical && !item.checked).length;
      if (criticalPending > 0) return;
      state.submitted = true;
      render();
    });
  }

  const newMissionButton = document.getElementById('new-mission-btn');
  if (newMissionButton) {
    newMissionButton.addEventListener('click', () => {
      state.submitted = false;
      state.step = 0;
      state.notes = getDefaultNotes(); 
      state.checklist = initialChecklist.map((item) => ({ ...item, checked: false }));
      state.errors = {};
      render();
    });
  }

  app.querySelectorAll('[data-field]').forEach((element) => {
    const key = element.dataset.field;
    if (!key) return;

    element.addEventListener('input', (event) => {
      state.notes[key] = event.target.value;
      if (state.errors[key]) {
        delete state.errors[key];
        element.classList.remove('error');
        const fieldContainer = element.closest('.field');
        const errorText = fieldContainer?.querySelector('.field-error');
        if (errorText) errorText.remove();
      }
    });

    element.addEventListener('change', (event) => {
      state.notes[key] = event.target.value;
    });
  });

  app.querySelectorAll('[data-toggle-id]').forEach((element) => {
    element.addEventListener('click', () => {
      const id = element.dataset.toggleId;
      state.checklist = state.checklist.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      );
      render();
    });
  });
}

render();