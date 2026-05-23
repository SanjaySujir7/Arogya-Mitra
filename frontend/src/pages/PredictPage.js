import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
    Brain, Loader, ArrowRight, RotateCcw, Trash2,
    ShieldAlert, ShieldCheck, BarChart3, Activity, Clock, TrendingDown, TrendingUp
} from 'lucide-react';
import './PredictPage.css';

const FIELD_CONFIG = [
    {
        key: 'glucose',
        label: 'Blood Glucose (mg/dL)',
        placeholder: 'e.g. 120',
        hint: 'Fasting blood sugar level',
        min: 0, max: 500, step: 1,
    },
    {
        key: 'blood_pressure',
        label: 'Blood Pressure (Systolic)',
        placeholder: 'e.g. 80',
        hint: 'Systolic BP reading',
        min: 0, max: 250, step: 1,
    },
    {
        key: 'bmi',
        label: 'BMI',
        placeholder: 'e.g. 25.4',
        hint: 'Body Mass Index (weight / height²)',
        min: 10, max: 80, step: 0.1,
    },
    {
        key: 'age',
        label: 'Age (years)',
        placeholder: 'e.g. 35',
        hint: 'Your current age',
        min: 1, max: 120, step: 1,
    },
    {
        key: 'pregnancies',
        label: 'Pregnancies',
        placeholder: 'e.g. 0',
        hint: 'Number of pregnancies',
        min: 0, max: 20, step: 1,
    },
    {
        key: 'insulin',
        label: 'Insulin (mu U/ml)',
        placeholder: 'e.g. 125',
        hint: 'Leave default if unknown',
        min: 0, max: 900, step: 1,
    },
    {
        key: 'skin_thickness',
        label: 'Skin Thickness (mm)',
        placeholder: 'e.g. 29',
        hint: 'Triceps skin fold thickness',
        min: 0, max: 100, step: 1,
    },
    {
        key: 'diabetes_pedigree',
        label: 'Family History Score',
        placeholder: 'e.g. 0.47',
        hint: 'Diabetes pedigree function (0.0–2.5)',
        min: 0, max: 2.5, step: 0.01,
    },
];

function PredictPage() {
    const { apiFetch } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [formData, setFormData] = useState({});
    const [sources, setSources] = useState({});
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(prev => !prev);
        setTimeout(() => setResizing(false), 350);
    };

    const fetchDefaults = useCallback(async () => {
        try {
            const res = await apiFetch('/tracker/predict/defaults/');
            if (res.ok) {
                const data = await res.json();
                const { _sources, ...fields } = data;
                // Convert nulls to empty strings for form inputs
                const cleaned = {};
                Object.keys(fields).forEach(k => {
                    cleaned[k] = fields[k] !== null ? String(fields[k]) : '';
                });
                setFormData(cleaned);
                setSources(_sources || {});
            }
        } catch (err) {
            console.error('Failed to fetch defaults:', err);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchDefaults();
    }, [fetchDefaults]);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await apiFetch('/tracker/predict/history/');
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const executePrediction = async (dataToPredict) => {
        setPredicting(true);
        setResult(null);
        setError(null);

        try {
            // Convert string values to numbers
            const payload = {};
            Object.keys(dataToPredict).forEach(k => {
                const val = dataToPredict[k];
                payload[k] = val !== '' ? parseFloat(val) : undefined;
            });

            const res = await apiFetch('/tracker/predict/diabetes/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                setResult(data);
                setShowForm(false);
                fetchHistory(); // refresh history after new prediction
            } else {
                const err = await res.json();
                console.error('Prediction error:', err);
                
                let missingFields = [];
                if (typeof err === 'object') {
                    // Extract field names that have errors
                    missingFields = Object.keys(err).map(k => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                }
                
                if (missingFields.length > 0) {
                    setError(`Not enough data to predict! Missing or invalid: ${missingFields.join(', ')}. Please use "Custom Data" to fill in the blanks.`);
                } else {
                    setError("Not enough data to run prediction. Please provide missing values.");
                }
                setShowForm(true); // Open the form so they can fix it
            }
        } catch (err) {
            console.error('Prediction failed:', err);
            setError("A network error occurred. Please try again.");
        } finally {
            setPredicting(false);
        }
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        executePrediction(formData);
    };

    const handleAutoPredict = () => {
        executePrediction(formData);
    };

    const handleClearForm = () => {
        setFormData({});
    };

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to clear your prediction history?")) return;
        try {
            const res = await apiFetch('/tracker/predict/history/', { method: 'DELETE' });
            if (res.ok) {
                setHistory([]);
            }
        } catch (err) {
            console.error('Failed to clear history:', err);
        }
    };

    const getSourceBadge = (key) => {
        const src = sources[key];
        if (!src) return null;
        if (src === 'latest_log') return <span className="source-badge source-badge--log">From Log</span>;
        if (src === 'computed') return <span className="source-badge source-badge--computed">Auto</span>;
        if (src === 'default') return <span className="source-badge source-badge--default">Default</span>;
        if (src === 'profile') return <span className="source-badge source-badge--log">Profile</span>;
        return null;
    };

    const isHigh = result?.prediction === 'High Risk';

    return (
        <div className="dashboard-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

            <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                <div className="predict-page">
                    <div className="predict-header">
                        <h1><Brain size={28} /> Disease Risk Prediction</h1>
                        <p>Get an AI-powered assessment of your diabetes risk based on your health data. We auto-fill what we can from your latest health logs.</p>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '12px 16px', color: '#fca5a5', marginBottom: '24px', borderRadius: '4px', fontSize: '0.95rem' }}>
                            {error}
                        </div>
                    )}

                    {loading || predicting ? (
                        <div className="predict-loading">
                            <Loader size={32} className="spin-animation" />
                            {predicting && <span style={{marginLeft: 12}}>Analyzing your health data...</span>}
                        </div>
                    ) : !result ? (
                        !showForm ? (
                            /* ---- Mode Selection ---- */
                            <div className="predict-mode-selection">
                                <div className="mode-card" onClick={handleAutoPredict}>
                                    <div className="mode-icon" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50' }}>
                                        <Activity size={32} />
                                    </div>
                                    <h3>Predict from My Data</h3>
                                    <p>One-click prediction using your latest health logs and profile details.</p>
                                    <button className="mode-btn mode-btn--primary">Quick Predict</button>
                                </div>

                                <div className="mode-card" onClick={() => setShowForm(true)}>
                                    <div className="mode-icon" style={{ background: 'rgba(31, 115, 183, 0.15)', color: '#60a5fa' }}>
                                        <BarChart3 size={32} />
                                    </div>
                                    <h3>Custom Data</h3>
                                    <p>Review your default values and tweak them to simulate different scenarios.</p>
                                    <button className="mode-btn mode-btn--secondary">Enter Custom Data</button>
                                </div>
                            </div>
                        ) : (
                            /* ---- Input Form ---- */
                            <form onSubmit={handleCustomSubmit}>
                                <div className="predict-card">
                                    <div className="predict-card-title">
                                        <Activity size={20} /> Custom Health Metrics
                                    </div>
                                    <div className="predict-form-grid">
                                        {FIELD_CONFIG.map(field => (
                                            <div key={field.key} className="predict-field">
                                                <label>
                                                    {field.label}
                                                    {getSourceBadge(field.key)}
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder={field.placeholder}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    required
                                                />
                                                <p className="field-hint">{field.hint}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="predict-submit-area">
                                    <button type="button" className="predict-btn-cancel" onClick={handleClearForm}>
                                        Clear Form
                                    </button>
                                    <button type="button" className="predict-btn-cancel" onClick={() => setShowForm(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="predict-btn" disabled={predicting}>
                                        Run Prediction <ArrowRight size={18} />
                                    </button>
                                </div>

                                <div className="predict-disclaimer">
                                    ⚕️ <strong>Disclaimer:</strong> This is an AI-powered screening tool, not a medical diagnosis.
                                    Always consult a qualified healthcare professional for medical advice.
                                </div>
                            </form>
                        )
                    ) : (
                        /* ---- Results ---- */
                        <div className="predict-results">
                            <div className={`result-main-card ${isHigh ? 'result-main-card--high' : 'result-main-card--low'}`}>
                                <div className={`result-icon ${isHigh ? 'result-icon--high' : 'result-icon--low'}`}>
                                    {isHigh ? <ShieldAlert size={36} /> : <ShieldCheck size={36} />}
                                </div>
                                <h2 className={`result-title ${isHigh ? 'result-title--high' : 'result-title--low'}`}>
                                    {result.prediction}
                                </h2>
                                <p className="result-confidence">
                                    Model confidence: <strong>{result.confidence}%</strong>
                                </p>

                                <div className="probability-gauge">
                                    <div className="gauge-bar-bg">
                                        <div
                                            className={`gauge-bar-fill ${isHigh ? 'gauge-bar-fill--high' : 'gauge-bar-fill--low'}`}
                                            style={{ width: `${result.diabetes_probability}%` }}
                                        />
                                    </div>
                                    <div className="gauge-labels">
                                        <span>0% Risk</span>
                                        <span><strong>{result.diabetes_probability}%</strong></span>
                                        <span>100% Risk</span>
                                    </div>
                                </div>
                            </div>

                            {result.risk_factors && result.risk_factors.length > 0 && (
                                <div className="risk-factors-card">
                                    <div className="risk-factors-title">
                                        <BarChart3 size={20} /> Top Contributing Factors
                                    </div>
                                    {result.risk_factors.map((factor, i) => (
                                        <div key={factor.factor} className="risk-factor-item">
                                            <div className="risk-factor-rank">{i + 1}</div>
                                            <div className="risk-factor-info">
                                                <p className="risk-factor-name">{factor.factor}</p>
                                                <div className="risk-factor-bar-bg">
                                                    <div
                                                        className="risk-factor-bar-fill"
                                                        style={{ width: `${factor.importance}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="risk-factor-pct">{factor.importance}%</span>
                                            <span className="risk-factor-value">{factor.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="predict-retry">
                                <button
                                    className="predict-retry-btn"
                                    onClick={() => setResult(null)}
                                >
                                    <RotateCcw size={16} /> Run Another Prediction
                                </button>
                            </div>

                            <div className="predict-disclaimer">
                                ⚕️ <strong>Disclaimer:</strong> This is an AI-powered screening tool, not a medical diagnosis.
                                Always consult a qualified healthcare professional for medical advice.
                            </div>
                        </div>
                    )}
                    {/* ---- Prediction History ---- */}
                    <div className="predict-card" style={{ marginTop: 32 }}>
                        <div className="predict-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Clock size={20} /> Prediction History
                            </div>
                            {history.length > 0 && (
                                <button type="button" className="predict-clear-history-btn" onClick={handleClearHistory} title="Clear History">
                                    <Trash2 size={16} /> Clear All
                                </button>
                            )}
                        </div>
                        
                        {history.length > 0 ? (
                            <div className="history-list">
                                {history.map((entry) => {
                                    const isEntryHigh = entry.prediction === 'High Risk';
                                    const dt = new Date(entry.created_at);
                                    return (
                                        <div key={entry.id} className="history-item">
                                            <div className={`history-indicator ${isEntryHigh ? 'history-indicator--high' : 'history-indicator--low'}`} />
                                            <div className="history-info">
                                                <div className="history-top-row">
                                                    <span className={`history-badge ${isEntryHigh ? 'history-badge--high' : 'history-badge--low'}`}>
                                                        {isEntryHigh ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {entry.prediction}
                                                    </span>
                                                    <span className="history-prob">{entry.diabetes_probability}% probability</span>
                                                </div>
                                                <span className="history-date">
                                                    {dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {' · '}
                                                    {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className="history-confidence">{entry.confidence}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                                <p style={{ margin: 0 }}>No prediction history yet. Run a prediction to see it here!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default PredictPage;
