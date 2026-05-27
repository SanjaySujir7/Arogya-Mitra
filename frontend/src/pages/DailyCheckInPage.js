import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { CheckSquare, CheckCircle, Loader, Star, Droplets, Activity } from 'lucide-react';
import './DailyCheckInPage.css';

const MOODS = [
    { value: 1, emoji: '😫', label: 'Terrible' },
    { value: 2, emoji: '😕', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😄', label: 'Great' }
];

const DIET_OPTIONS = ['Poor', 'Average', 'Great'];
const SYMPTOM_OPTIONS = ['Headache', 'Fatigue', 'Dizziness', 'Nausea', 'Chest Pain', 'None'];

function DailyCheckInPage() {
    const { apiFetch } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);

    const [formData, setFormData] = useState({
        mood: 3,
        sleep_quality: 3,
        diet_quality: 'Average',
        symptoms: [],
        water_goal: false,
        exercise_goal: false,
    });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await apiFetch('/daily-checkin/today/');
                if (res.ok) {
                    const data = await res.json();
                    if (data.completed) {
                        setCompleted(true);
                        setFormData(data.data);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [apiFetch]);

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(!sidebarCollapsed);
        setTimeout(() => setResizing(false), 350);
    };

    const handleSymptomToggle = (symp) => {
        if (symp === 'None') {
            setFormData(prev => ({ ...prev, symptoms: ['None'] }));
            return;
        }
        setFormData(prev => {
            let newSymptoms = prev.symptoms.filter(s => s !== 'None');
            if (newSymptoms.includes(symp)) {
                newSymptoms = newSymptoms.filter(s => s !== symp);
            } else {
                newSymptoms.push(symp);
            }
            return { ...prev, symptoms: newSymptoms };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await apiFetch('/daily-checkin/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setCompleted(true);
                // Dispatch a custom event so Sidebar can update its badge instantly
                window.dispatchEvent(new Event('checkin-completed'));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="checkin-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
            <main className={`checkin-main ${sidebarCollapsed ? 'checkin-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                <div className="checkin-header">
                    <div className="checkin-title">
                        <h1><CheckSquare size={28} color="#3b82f6" /> Daily Check-in</h1>
                        <p>Track your lifestyle habits to build a smarter health profile.</p>
                    </div>
                </div>

                <div className="checkin-content">
                    {loading ? (
                        <Loader size={32} className="spin-animation" style={{ color: 'var(--text-muted)' }} />
                    ) : completed ? (
                        <div className="checkin-card checkin-success">
                            <CheckCircle size={64} color="#4ade80" />
                            <h2>You're all set for today!</h2>
                            <p>Thank you for logging your daily health data.</p>
                        </div>
                    ) : (
                        <form className="checkin-card" onSubmit={handleSubmit}>
                            {/* Mood */}
                            <div className="checkin-section">
                                <h3>How are you feeling today?</h3>
                                <div className="emoji-picker">
                                    {MOODS.map(m => (
                                        <button
                                            key={m.value} type="button"
                                            className={`emoji-btn ${formData.mood === m.value ? 'selected' : ''}`}
                                            onClick={() => setFormData({...formData, mood: m.value})}
                                            title={m.label}
                                        >
                                            {m.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sleep */}
                            <div className="checkin-section">
                                <h3>How did you sleep last night?</h3>
                                <div className="star-picker">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star} type="button"
                                            className={`star-btn ${formData.sleep_quality >= star ? 'selected' : ''}`}
                                            onClick={() => setFormData({...formData, sleep_quality: star})}
                                        >
                                            <Star size={36} fill={formData.sleep_quality >= star ? '#eab308' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Diet */}
                            <div className="checkin-section">
                                <h3>How would you rate your diet today?</h3>
                                <div className="pill-group">
                                    {DIET_OPTIONS.map(opt => (
                                        <button
                                            key={opt} type="button"
                                            className={`pill-btn ${formData.diet_quality === opt ? 'selected' : ''}`}
                                            onClick={() => setFormData({...formData, diet_quality: opt})}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Symptoms */}
                            <div className="checkin-section">
                                <h3>Did you experience any of these symptoms?</h3>
                                <div className="symptoms-grid">
                                    {SYMPTOM_OPTIONS.map(symp => (
                                        <label key={symp} className="symptom-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.symptoms.includes(symp)}
                                                onChange={() => handleSymptomToggle(symp)}
                                                style={{ width: 18, height: 18 }}
                                            />
                                            {symp}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Goals */}
                            <div className="checkin-section">
                                <h3>Daily Goals</h3>
                                <div className="toggle-group">
                                    <label className="toggle-row">
                                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                            <Droplets size={20} color="#3b82f6" />
                                            <span>Drank 8+ glasses of water?</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.water_goal}
                                            onChange={e => setFormData({...formData, water_goal: e.target.checked})}
                                            style={{ width: 22, height: 22, accentColor: '#3b82f6' }}
                                        />
                                    </label>
                                    <label className="toggle-row">
                                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                            <Activity size={20} color="#4ade80" />
                                            <span>Got 30+ mins of exercise?</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.exercise_goal}
                                            onChange={e => setFormData({...formData, exercise_goal: e.target.checked})}
                                            style={{ width: 22, height: 22, accentColor: '#4ade80' }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={submitting}>
                                {submitting ? <Loader size={20} className="spin-animation" /> : <CheckSquare size={20} />}
                                Save Today's Log
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}

export default DailyCheckInPage;
