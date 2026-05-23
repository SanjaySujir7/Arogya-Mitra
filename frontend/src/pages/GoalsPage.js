import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';

import {
    Target, Plus, X, Loader, Pencil, Trash2, CheckCircle, AlertCircle,
    Footprints, Droplets, Moon, Scale, Activity, Save
} from 'lucide-react';
import './DashboardPage.css';
import './HealthLogPage.css';
import './GoalsPage.css';


function getTodayString() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={`hl-toast hl-toast--${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {toast.message}
        </div>
    );
}

const colorMap = {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    rose: '#f43f5e',
    indigo: '#6366f1'
};

const metricTypes = [
    { value: 'step_count', label: 'Step Count' },
    { value: 'water_intake', label: 'Water Intake' },
    { value: 'sleep_hours', label: 'Sleep' },
    { value: 'weight_kg', label: 'Weight' },
    { value: 'custom', label: 'Custom' }
];

function getIconForMetric(metricType, size = 20) {
    switch (metricType) {
        case 'step_count': return <Footprints size={size} />;
        case 'water_intake': return <Droplets size={size} />;
        case 'sleep_hours': return <Moon size={size} />;
        case 'weight_kg': return <Scale size={size} />;
        default: return <Target size={size} />;
    }
}

function LogProgressModal({ isOpen, onClose, onSubmit, goal, isSubmitting }) {
    const [progress, setProgress] = useState('');

    useEffect(() => {
        if (isOpen) setProgress('');
    }, [isOpen]);

    if (!isOpen || !goal) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(goal.id, parseFloat(progress));
    };

    return (
        <div className="goal-modal-backdrop" onClick={onClose}>
            <div className="goal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="goal-modal-header">
                    <h2>Log Progress: {goal.title}</h2>
                    <button className="goal-modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="goal-modal-body">
                        <div className="hl-form-group">
                            <label>Today's Value ({goal.unit})</label>
                            <input
                                type="number"
                                className="hl-form-input"
                                value={progress}
                                onChange={e => setProgress(e.target.value)}
                                placeholder={`e.g. ${goal.target_value / 2}`}
                                required
                                step="any"
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="goal-modal-footer">
                        <button type="button" className="hl-btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="hl-btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader size={16} className="spin-animation" /> : <Save size={16} />}
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function GoalModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }) {
    const [form, setForm] = useState({
        title: '',
        metric_type: 'step_count',
        target_value: '',
        unit: '',
        color: 'blue'
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm({
                    title: initialData.title || '',
                    metric_type: initialData.metric_type || 'step_count',
                    target_value: initialData.target_value || '',
                    unit: initialData.unit || '',
                    color: initialData.color || 'blue'
                });
            } else {
                setForm({
                    title: '',
                    metric_type: 'step_count',
                    target_value: '',
                    unit: '',
                    color: 'blue'
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...form,
            target_value: parseFloat(form.target_value)
        });
    };

    return (
        <div className="goal-modal-backdrop" onClick={onClose}>
            <div className="goal-modal" onClick={e => e.stopPropagation()}>
                <div className="goal-modal-header">
                    <h2>{initialData ? 'Edit Goal' : 'Add New Goal'}</h2>
                    <button className="goal-modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="goal-modal-body">
                        <div className="hl-form-grid">
                            <div className="hl-form-group hl-form-group--full">
                                <label>Title</label>
                                <input
                                    type="text"
                                    className="hl-form-input"
                                    value={form.title}
                                    onChange={e => setForm({...form, title: e.target.value})}
                                    placeholder="e.g. Read 20 pages"
                                    required
                                />
                            </div>
                            <div className="hl-form-group">
                                <label>Metric Type</label>
                                <select
                                    className="hl-form-input"
                                    value={form.metric_type}
                                    onChange={e => setForm({...form, metric_type: e.target.value})}
                                >
                                    {metricTypes.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="hl-form-group">
                                <label>Target Value</label>
                                <input
                                    type="number"
                                    className="hl-form-input"
                                    value={form.target_value}
                                    onChange={e => setForm({...form, target_value: e.target.value})}
                                    placeholder="e.g. 10000"
                                    required
                                    step="any"
                                    min="0"
                                />
                            </div>
                            <div className="hl-form-group">
                                <label>Unit</label>
                                <input
                                    type="text"
                                    className="hl-form-input"
                                    value={form.unit}
                                    onChange={e => setForm({...form, unit: e.target.value})}
                                    placeholder="e.g. steps, L, mins"
                                    required
                                />
                            </div>
                            <div className="hl-form-group hl-form-group--full">
                                <label>Color</label>
                                <div className="color-picker">
                                    {Object.entries(colorMap).map(([name, hex]) => (
                                        <div
                                            key={name}
                                            className={`color-option ${form.color === name ? 'selected' : ''}`}
                                            style={{ backgroundColor: hex }}
                                            onClick={() => setForm({...form, color: name})}
                                        >
                                            {form.color === name && <CheckCircle size={16} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="goal-modal-footer">
                        <button type="button" className="hl-btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="hl-btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader size={16} className="spin-animation" /> : <Save size={16} />}
                            {initialData ? 'Update Goal' : 'Save Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function GoalsPage() {
    const { apiFetch } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [editGoal, setEditGoal] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);

    const [logModalOpen, setLogModalOpen] = useState(false);
    const [logGoalTarget, setLogGoalTarget] = useState(null);
    const [loggingProgress, setLoggingProgress] = useState(false);

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(!sidebarCollapsed);
        setTimeout(() => setResizing(false), 350);
    };

    const showToast = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchGoals = useCallback(async () => {
        try {
            const res = await apiFetch('/goals/');
            if (res.ok) {
                const data = await res.json();
                setGoals(data);
            } else {
                showToast('error', 'Failed to load goals.');
            }
        } catch (err) {
            showToast('error', 'Network error loading goals.');
        } finally {
            setLoading(false);
        }
    }, [showToast, apiFetch]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleSaveGoal = async (payload) => {
        setSubmitting(true);
        try {
            const url = editGoal ? `/goals/${editGoal.id}/` : '/goals/';
            const method = editGoal ? 'PUT' : 'POST';
            const res = await apiFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                showToast('success', editGoal ? 'Goal updated!' : 'Goal created!');
                setGoalModalOpen(false);
                fetchGoals();
            } else {
                showToast('error', 'Failed to save goal.');
            }
        } catch (err) {
            showToast('error', 'Network error.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await apiFetch(`/goals/${deleteTarget.id}/`, {
                method: 'DELETE'
            });
            if (res.ok || res.status === 204) {
                showToast('success', 'Goal deleted.');
                fetchGoals();
            } else {
                showToast('error', 'Failed to delete goal.');
            }
        } catch (err) {
            showToast('error', 'Network error.');
        }
        setDeleteTarget(null);
    };

    const handleLogProgress = async (goalId, value) => {
        setLoggingProgress(true);
        try {
            const res = await apiFetch(`/goals/${goalId}/progress/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: getTodayString(),
                    current_value: value
                })
            });
            if (res.ok) {
                showToast('success', 'Progress logged!');
                setLogModalOpen(false);
                fetchGoals();
            } else {
                showToast('error', 'Failed to log progress.');
            }
        } catch (err) {
            showToast('error', 'Network error.');
        } finally {
            setLoggingProgress(false);
        }
    };

    const openCreate = () => {
        setEditGoal(null);
        setGoalModalOpen(true);
    };

    const openEdit = (goal) => {
        setEditGoal(goal);
        setGoalModalOpen(true);
    };

    return (
        <div className="dashboard-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

            <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                <div className="goals-header">
                    <div className="goals-title-group">
                        <h1>Your Goals</h1>
                        <p>Track your health milestones and daily objectives.</p>
                    </div>
                    <button className="dash-action-btn" onClick={openCreate}>
                        <Plus size={18} style={{ marginRight: 6 }} /> Add New Goal
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <Loader size={32} className="spin-animation" style={{ color: 'var(--text-muted)' }} />
                    </div>
                ) : goals.length === 0 ? (
                    <div className="goal-empty">
                        <div className="goal-empty-icon"><Target size={32} /></div>
                        <h3>No Goals Set</h3>
                        <p>Setting goals helps you stay on track with your health journey. Create your first goal to get started!</p>
                        <button className="dash-action-btn" onClick={openCreate}>
                            <Plus size={18} style={{ marginRight: 6 }} /> Create Goal
                        </button>
                    </div>
                ) : (
                    <div className="goals-grid">
                        {goals.map(goal => {
                            const current = goal.today_progress || 0;
                            const percent = Math.min(Math.round((current / goal.target_value) * 100), 100);
                            const iconBg = colorMap[goal.color] || colorMap.blue;
                            return (
                                <div className="goal-card" key={goal.id}>
                                    <div className="goal-card-header">
                                        <div className="goal-icon-wrap">
                                            <div className="goal-icon" style={{ backgroundColor: iconBg }}>
                                                {getIconForMetric(goal.metric_type)}
                                            </div>
                                            <div className="goal-title">{goal.title}</div>
                                        </div>
                                        <div className="goal-actions">
                                            <button className="goal-action-btn" onClick={() => openEdit(goal)}><Pencil size={16} /></button>
                                            <button className="goal-action-btn goal-action-btn--delete" onClick={() => setDeleteTarget(goal)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="goal-progress-section">
                                        <div className="goal-progress-text">
                                            <span>Progress</span>
                                            <span className="goal-progress-value">{current} / {goal.target_value} {goal.unit}</span>
                                        </div>
                                        <div className="goal-progress-bar-bg">
                                            <div
                                                className="goal-progress-bar-fill"
                                                style={{ width: `${percent}%`, backgroundColor: iconBg }}
                                            />
                                        </div>
                                    </div>
                                    {goal.metric_type === 'custom' && (
                                        <div className="goal-footer">
                                            <button
                                                className="btn-log-progress"
                                                onClick={() => { setLogGoalTarget(goal); setLogModalOpen(true); }}
                                            >
                                                <Activity size={16} /> Log Progress
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <GoalModal
                isOpen={goalModalOpen}
                onClose={() => setGoalModalOpen(false)}
                onSubmit={handleSaveGoal}
                initialData={editGoal}
                isSubmitting={submitting}
            />

            <LogProgressModal
                isOpen={logModalOpen}
                onClose={() => setLogModalOpen(false)}
                onSubmit={handleLogProgress}
                goal={logGoalTarget}
                isSubmitting={loggingProgress}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete Goal"
                message={`Are you sure you want to delete the goal "${deleteTarget?.title}"?`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isDestructive={true}
            />

            <Toast toast={toast} />
        </div>
    );
}

export default GoalsPage;
