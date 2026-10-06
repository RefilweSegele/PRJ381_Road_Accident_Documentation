import { useState } from 'react';
import { useUploadStore } from './useUploadStore';
import './FlightLogForm.css';

const steps = ['Flight Notes', 'Pre-flight Checklist', 'Review & Submit'];
const weatherConditions = ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Fog / Low Visibility', 'High Wind Advisory'];
const missionTypes = [
    { value: 'accident-scene', label: 'Accident Scene Documentation' },
    { value: 'insurance-survey', label: 'Insurance Survey' },
    { value: 'law-enforcement', label: 'Law Enforcement Evidence' },
    { value: 'infrastructure', label: 'Infrastructure Inspection' },
    { value: 'training-flight', label: 'Training Flight' },
];

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

function validateNotes(notes) {
    const errors = {};

    if (!notes.pilotName.trim()) errors.pilotName = 'Pilot name required';
    if (!notes.location.trim()) errors.location = 'Location description required';
    if (!notes.gpsLat || Number.isNaN(Number(notes.gpsLat)) || Math.abs(Number(notes.gpsLat)) > 90) {
        errors.gpsLat = 'Valid latitude required (−90 to 90)';
    }
    if (!notes.gpsLon || Number.isNaN(Number(notes.gpsLon)) || Math.abs(Number(notes.gpsLon)) > 180) {
        errors.gpsLon = 'Valid longitude required (−180 to 180)';
    }
    if (!notes.altitudeAGL || Number(notes.altitudeAGL) <= 0 || Number(notes.altitudeAGL) > 400) {
        errors.altitudeAGL = 'Altitude must be 1–400 m AGL';
    }
    if (!notes.flightSpeed || Number(notes.flightSpeed) <= 0) errors.flightSpeed = 'Flight speed required';
    if (!notes.batteryCount || Number(notes.batteryCount) < 1) errors.batteryCount = 'Battery count required';
    if (!notes.estimatedDuration || Number(notes.estimatedDuration) <= 0) errors.estimatedDuration = 'Estimated duration required';
    if (!notes.weatherCondition) errors.weatherCondition = 'Weather condition required';
    if (!notes.windSpeed || Number(notes.windSpeed) < 0) errors.windSpeed = 'Wind speed required';
    if (!notes.visibility || Number(notes.visibility) <= 0) errors.visibility = 'Visibility required';

    return errors;
}

export default function FlightLogForm({ onSubmitted }) {
    const setFlightLog = useUploadStore((s) => s.setFlightLog);
    const [state, setState] = useState(() => ({
        step: 0,
        notes: getDefaultNotes(),
        checklist: initialChecklist.map((item) => ({ ...item })),
        errors: {},
        submitted: false,
        isDark: false,
    }));

    const criticalPending = state.checklist.filter((item) => item.critical && !item.checked);
    const totalChecked = state.checklist.filter((item) => item.checked).length;
    const percentage = Math.round((totalChecked / state.checklist.length) * 100);
    const unchecked = state.checklist.filter((item) => !item.checked);

    const updateField = (field, value) => {
        setState((prev) => {
            const notes = { ...prev.notes, [field]: value };
            const errors = { ...prev.errors };
            if (errors[field]) delete errors[field];
            return { ...prev, notes, errors };
        });
    };

    const handleContinue = () => {
        if (state.step === 0) {
            const errors = validateNotes(state.notes);
            if (Object.keys(errors).length > 0) {
                setState((prev) => ({ ...prev, errors }));
                return;
            }
        }

        setState((prev) => ({
            ...prev,
            step: Math.min(prev.step + 1, steps.length - 1),
        }));
    };

    const handleSubmit = () => {
        const criticalOpen = state.checklist.filter((item) => item.critical && !item.checked).length;
        if (criticalOpen > 0) return;

        const payload = {
            ...state.notes,
            checklist: state.checklist.map(({ id, checked }) => ({ id, checked })),
            submittedAt: new Date().toISOString(),
        };
        setFlightLog(payload);
        if (onSubmitted) onSubmitted(payload);
        setState((prev) => ({ ...prev, submitted: true }));
    };

    const resetMission = () => {
        setState((prev) => ({
            ...prev,
            submitted: false,
            step: 0,
            notes: getDefaultNotes(),
            checklist: initialChecklist.map((item) => ({ ...item, checked: false })),
            errors: {},
        }));
    };

    const handleToggleChecklist = (id) => {
        setState((prev) => ({
            ...prev,
            checklist: prev.checklist.map((item) =>
                item.id === id ? { ...item, checked: !item.checked } : item,
            ),
        }));
    };

    const renderReviewRow = (label, value, highlight = false) => (
        <div className="review-row" key={label}>
            <span className="label mono">{label}</span>
            <span className={`value mono ${highlight ? 'highlight' : ''}`}>{value || '—'}</span>
        </div>
    );

    const renderStepIndicator = () => (
        <div className="step-indicator">
            {steps.map((label, index) => {
                const isActive = index === state.step;
                const isDone = index < state.step;
                const bulletClass = isDone ? 'done' : isActive ? 'active' : 'inactive';
                const labelClass = isDone ? 'done' : isActive ? 'active' : 'inactive';

                return (
                    <div className="step-node" key={label}>
                        <div className="step-node-inner">
                            <div className={`step-bullet ${bulletClass}`}>
                                {isDone ? '✓' : String(index + 1).padStart(2, '0')}
                            </div>
                            <span className={`step-label ${labelClass}`}>{label}</span>
                        </div>
                        {index < steps.length - 1 ? <div className={`step-line ${isDone ? 'done' : ''}`} /> : null}
                    </div>
                );
            })}
        </div>
    );

    const renderField = (label, required, error, hint, control) => (
        <div className="field" key={label}>
            <label className="mono">
                {label}
                {required ? <span className="req">*</span> : null}
            </label>
            {control}
            {error ? <div className="field-error mono">{error}</div> : null}
            {hint && !error ? <div className="field-hint mono">{hint}</div> : null}
        </div>
    );

    const renderFlightNotesForm = () => (
        <div className="form-grid">
            <div className="section-header">
                <span>Mission Identity</span>
                <div className="section-divider" />
            </div>

            {renderField('Mission ID', false, '', '', <input className="input mono" value={state.notes.missionId} onChange={(e) => updateField('missionId', e.target.value)} />)}
            {renderField('Date', false, '', '', <input type="date" className="input" value={state.notes.date} onChange={(e) => updateField('date', e.target.value)} />)}
            {renderField('Scheduled Time', false, '', '', <input type="time" className="input" value={state.notes.time} onChange={(e) => updateField('time', e.target.value)} />)}

            <div className="section-header">
                <span>Pilot</span>
                <div className="section-divider" />
            </div>

            {renderField('Pilot Full Name', true, state.errors.pilotName || '', '', (
                <input className={`input ${state.errors.pilotName ? 'error' : ''}`} value={state.notes.pilotName} placeholder="J. Smith" onChange={(e) => updateField('pilotName', e.target.value)} />
            ))}

            <div className="section-header">
                <span>Site & Coordinates</span>
                <div className="section-divider" />
            </div>

            {renderField('Site Location', true, state.errors.location || '', 'Address or named landmark', (
                <input className={`input ${state.errors.location ? 'error' : ''} col-span-full`} value={state.notes.location} placeholder="N1 Highway, km 47, Johannesburg" onChange={(e) => updateField('location', e.target.value)} />
            ))}
            {renderField('GPS Latitude', true, state.errors.gpsLat || '', '', (
                <input className={`input ${state.errors.gpsLat ? 'error' : ''}`} value={state.notes.gpsLat} placeholder="-26.204103" onChange={(e) => updateField('gpsLat', e.target.value)} />
            ))}
            {renderField('GPS Longitude', true, state.errors.gpsLon || '', '', (
                <input className={`input ${state.errors.gpsLon ? 'error' : ''}`} value={state.notes.gpsLon} placeholder="28.047305" onChange={(e) => updateField('gpsLon', e.target.value)} />
            ))}

            <div className="section-header">
                <span>Flight Parameters</span>
                <div className="section-divider" />
            </div>

            {renderField('Altitude AGL (m)', true, state.errors.altitudeAGL || '', 'Max 400 m', (
                <input type="number" className={`input ${state.errors.altitudeAGL ? 'error' : ''}`} value={state.notes.altitudeAGL} placeholder="80" onChange={(e) => updateField('altitudeAGL', e.target.value)} />
            ))}
            {renderField('Flight Speed (m/s)', true, state.errors.flightSpeed || '', '', (
                <input type="number" className={`input ${state.errors.flightSpeed ? 'error' : ''}`} value={state.notes.flightSpeed} placeholder="8" onChange={(e) => updateField('flightSpeed', e.target.value)} />
            ))}
            {renderField('Front Overlap (%)', false, '', 'Recommended ≥ 75%', (
                <input type="number" className="input" value={state.notes.overlapFront} placeholder="80" onChange={(e) => updateField('overlapFront', e.target.value)} />
            ))}
            {renderField('Side Overlap (%)', false, '', 'Recommended ≥ 65%', (
                <input type="number" className="input" value={state.notes.overlapSide} placeholder="70" onChange={(e) => updateField('overlapSide', e.target.value)} />
            ))}
            {renderField('Battery Packs', true, state.errors.batteryCount || '', '', (
                <input type="number" className={`input ${state.errors.batteryCount ? 'error' : ''}`} value={state.notes.batteryCount} placeholder="3" onChange={(e) => updateField('batteryCount', e.target.value)} />
            ))}
            {renderField('Est. Duration (min)', true, state.errors.estimatedDuration || '', '', (
                <input type="number" className={`input ${state.errors.estimatedDuration ? 'error' : ''}`} value={state.notes.estimatedDuration} placeholder="45" onChange={(e) => updateField('estimatedDuration', e.target.value)} />
            ))}

            <div className="section-header">
                <span>Weather Conditions</span>
                <div className="section-divider" />
            </div>

            {renderField('Condition', true, state.errors.weatherCondition || '', '', (
                <select className={`select ${state.errors.weatherCondition ? 'error' : ''}`} value={state.notes.weatherCondition} onChange={(e) => updateField('weatherCondition', e.target.value)}>
                    <option value="">Select…</option>
                    {weatherConditions.map((option) => (
                        <option value={option} key={option}>{option}</option>
                    ))}
                </select>
            ))}
            {renderField('Wind Speed (km/h)', true, state.errors.windSpeed || '', '', (
                <input type="number" className={`input ${state.errors.windSpeed ? 'error' : ''}`} value={state.notes.windSpeed} placeholder="14" onChange={(e) => updateField('windSpeed', e.target.value)} />
            ))}
            {renderField('Visibility (km)', true, state.errors.visibility || '', '', (
                <input type="number" className={`input ${state.errors.visibility ? 'error' : ''}`} value={state.notes.visibility} placeholder="10" onChange={(e) => updateField('visibility', e.target.value)} />
            ))}
            {renderField('Temperature (°C)', false, '', '', (
                <input type="number" className="input" value={state.notes.temperature} placeholder="22" onChange={(e) => updateField('temperature', e.target.value)} />
            ))}

            <div className="section-header">
                <span>Mission Type</span>
                <div className="section-divider" />
            </div>

            {renderField('Mission Type', false, '', '', (
                <select className="select" value={state.notes.missionType} onChange={(e) => updateField('missionType', e.target.value)}>
                    {missionTypes.map((option) => (
                        <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                </select>
            ))}

            <div className="section-header">
                <span>Additional Notes</span>
                <div className="section-divider" />
            </div>

            <div className="field col-span-full">
                <label className="mono">Operator Notes</label>
                <textarea className="textarea" placeholder="Scene specifics, hazards, special instructions, equipment anomalies…" value={state.notes.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </div>
        </div>
    );

    const renderChecklist = () => {
        const categories = [...new Set(state.checklist.map((item) => item.category))];
        const criticalUnchecked = state.checklist.filter((item) => item.critical && !item.checked);

        return (
            <div className="checklist-wrap">
                <div className="progress-block">
                    <div className="progress-meta mono">
                        <span>{totalChecked} / {state.checklist.length} checks complete</span>
                        <span>{percentage}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${percentage}%` }} />
                    </div>
                </div>

                {criticalUnchecked.length > 0 ? (
                    <div className="warning-banner">
                        <div className="icon">⚠</div>
                        <div>
                            <p className="title mono">Critical Items Pending</p>
                            <p className="desc mono">{criticalUnchecked.length} critical item{criticalUnchecked.length !== 1 ? 's' : ''} must be confirmed before submission.</p>
                        </div>
                    </div>
                ) : null}

                {categories.map((category) => {
                    const items = state.checklist.filter((item) => item.category === category);
                    const categoryDone = items.filter((item) => item.checked).length;

                    return (
                        <div className="category-block" key={category}>
                            <div className="category-header">
                                <span className="label mono">{category}</span>
                                <div className="category-divider" />
                                <span className="category-total mono">{categoryDone}/{items.length}</span>
                            </div>

                            {items.map((item) => (
                                <label className={`check-item ${item.checked ? 'checked' : ''} ${item.critical && !item.checked ? 'critical-pending' : ''}`} key={item.id} onClick={() => handleToggleChecklist(item.id)}>
                                    <div className="checkmark-box">
                                        {item.checked ? (
                                            <svg viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M1 4l3 3 5-6" />
                                            </svg>
                                        ) : null}
                                    </div>
                                    <span className="check-item-text mono">{item.label}</span>
                                    <span className="check-badges">
                                        {item.critical && !item.checked ? <span className="badge-critical mono">Critical</span> : null}
                                        {item.checked ? <span className="badge-done mono">✓</span> : null}
                                    </span>
                                </label>
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderReviewStep = () => {
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

        return (
            <div className="review-wrap">
                <div className={`status-banner ${statusType}`}>
                    <div className="emoji">{emoji}</div>
                    <div>
                        <p className="title">{title}</p>
                        <p className="content mono">{text}</p>
                    </div>
                </div>

                <div className="review-grid">
                    <div className="review-section">
                        <p className="review-section-header mono">Mission Identity</p>
                        {renderReviewRow('Mission ID', state.notes.missionId, true)}
                        {renderReviewRow('Date / Time', `${state.notes.date} ${state.notes.time}`)}
                    </div>

                    <div className="review-section">
                        <p className="review-section-header mono">Pilot & Equipment</p>
                        {renderReviewRow('Pilot', state.notes.pilotName)}
                    </div>

                    <div className="review-section">
                        <p className="review-section-header mono">Site & Coordinates</p>
                        {renderReviewRow('Location', state.notes.location)}
                        {renderReviewRow('Latitude', state.notes.gpsLat)}
                        {renderReviewRow('Longitude', state.notes.gpsLon)}
                    </div>

                    <div className="review-section">
                        <p className="review-section-header mono">Flight Parameters</p>
                        {renderReviewRow('Altitude AGL', state.notes.altitudeAGL ? `${state.notes.altitudeAGL} m` : '')}
                        {renderReviewRow('Speed', state.notes.flightSpeed ? `${state.notes.flightSpeed} m/s` : '')}
                        {renderReviewRow('Overlap', `${state.notes.overlapFront}% / ${state.notes.overlapSide}%`)}
                        {renderReviewRow('Batteries', state.notes.batteryCount)}
                        {renderReviewRow('Est. Duration', state.notes.estimatedDuration ? `${state.notes.estimatedDuration} min` : '')}
                    </div>

                    <div className="review-section">
                        <p className="review-section-header mono">Weather</p>
                        {renderReviewRow('Condition', state.notes.weatherCondition)}
                        {renderReviewRow('Wind', state.notes.windSpeed ? `${state.notes.windSpeed} km/h` : '')}
                        {renderReviewRow('Visibility', state.notes.visibility ? `${state.notes.visibility} km` : '')}
                        {renderReviewRow('Temperature', state.notes.temperature ? `${state.notes.temperature}°C` : '')}
                    </div>

                    <div className="review-section">
                        <p className="review-section-header mono">Checklist Summary</p>
                        {renderReviewRow('Checks Complete', `${state.checklist.filter((item) => item.checked).length} / ${state.checklist.length}`, state.checklist.every((item) => item.checked))}
                        {renderReviewRow('Critical Cleared', criticalPending.length === 0 ? 'Yes' : `${criticalPending.length} pending`, criticalPending.length === 0)}
                    </div>
                </div>

                {state.notes.notes ? (
                    <div className="review-section">
                        <p className="review-section-header mono">Operator Notes</p>
                        <p className="content mono" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--foreground)', lineHeight: 1.6 }}>{state.notes.notes}</p>
                    </div>
                ) : null}
            </div>
        );
    };

    const renderSuccessScreen = () => {
        const timestamp = new Date().toISOString();

        return (
            <div className="success-wrap">
                <div className="success-icon">✓</div>
                <div>
                    <h2>Mission Submitted</h2>
                    <p>
                        Flight notes and pre-flight validation for mission <span className="mono" style={{ color: 'var(--primary)' }}>{state.notes.missionId}</span> have been logged.
                    </p>
                </div>

                <div className="receipt-box">
                    <p className="receipt-title mono">Submission Receipt</p>
                    {renderReviewRow('Mission ID', state.notes.missionId, true)}
                    {renderReviewRow('Pilot', state.notes.pilotName)}
                    {renderReviewRow('Site', state.notes.location)}
                    {renderReviewRow('Submitted At', timestamp)}
                    {renderReviewRow('Status', 'PENDING DISPATCH APPROVAL')}
                </div>

                <button className="btn btn-secondary" onClick={resetMission}>Log New Mission</button>
            </div>
        );
    };

    return (
        <div className={`flight-log ${state.isDark ? '' : 'light-mode'}`}>
            <div className="container">
                <header className="topbar">
                    <div>
                        <div className="brand-meta mono">
                            <span>DAIAS · D-3D</span>
                            <span className="dot" />
                            <span className="muted">Project Code D-3D</span>
                        </div>
                        <h1 className="title">Flight Mission Logger</h1>
                        <p className="subtitle">Drone-Assisted Insurance Assessment Service</p>
                    </div>

                    <div className="header-actions">
                        <button className="theme-toggle" aria-label="Toggle color theme" onClick={() => setState((prev) => ({ ...prev, isDark: !prev.isDark }))}>
                            {state.isDark ? (
                                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>
                        <div className="date-block mono">
                            <div className="date-label">{new Date().toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            <div className="badge">Vehicle Accident Scene Documentation</div>
                        </div>
                    </div>
                </header>

                <main className="wizard-card">
                    {state.submitted ? (
                        renderSuccessScreen()
                    ) : (
                        <>
                            {renderStepIndicator()}
                            <div className="step-panel">
                                {state.step === 0 ? renderFlightNotesForm() : null}
                                {state.step === 1 ? renderChecklist() : null}
                                {state.step === 2 ? renderReviewStep() : null}
                            </div>

                            <div className="nav-buttons">
                                <button className="btn" onClick={() => setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }))} disabled={state.step === 0}>← Back</button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {state.step === 0 && Object.keys(state.errors).length > 0 ? (
                                        <span className="muted-note mono">{Object.keys(state.errors).length} field{Object.keys(state.errors).length !== 1 ? 's' : ''} need attention</span>
                                    ) : null}

                                    {state.step < steps.length - 1 ? (
                                        <button className="btn btn-primary" onClick={handleContinue}>Continue →</button>
                                    ) : (
                                        <button className="btn btn-primary" onClick={handleSubmit} disabled={criticalPending.length > 0}>Submit Mission Log</button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

