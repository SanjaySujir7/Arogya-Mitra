import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
    Plus, X, Loader, Pencil, Trash2, ClipboardList,
    Heart, Droplets, Moon, Footprints, Scale, Activity,
    CheckCircle, AlertCircle, Save,
} from 'lucide-react';
import './DashboardPage.css';
import './HealthLogPage.css';

/* ---------- Helpers ---------- */
function getTodayString() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDayName(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long' });
}

function getCurrentDateDisplay() {
    return new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

const emptyForm = {
    date: getTodayString(),
    weight_kg: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate_bpm: '',
    blood_sugar_mg: '',
    sleep_hours: '',
    water_intake_liters: '',
    step_count: '',
};

/* ---------- Toast Component ---------- */
function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={`hl-toast hl-toast--${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {toast.message}
        </div>
    );
}

/* ---------- Log Form Modal ---------- */
function LogFormModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }) {
    const [form, setForm] = useState(emptyForm);
    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm({
                    date: initialData.date || getTodayString(),
                    weight_kg: initialData.weight_kg ?? '',
                    systolic_bp: initialData.systolic_bp ?? '',
                    diastolic_bp: initialData.diastolic_bp ?? '',
                    heart_rate_bpm: initialData.heart_rate_bpm ?? '',
                    blood_sugar_mg: initialData.blood_sugar_mg ?? '',
                    sleep_hours: initialData.sleep_hours ?? '',
                    water_intake_liters: initialData.water_intake_liters ?? '',
                    step_count: initialData.step_count ?? '',
                });
            } else {
                setForm({ ...emptyForm, date: getTodayString() });
            }
        }
    }, [isOpen, initialData]);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Escape key handler
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Build payload — only send non-empty values
        const payload = { date: form.date };
        if (form.weight_kg !== '') payload.weight_kg = parseFloat(form.weight_kg);
        if (form.systolic_bp !== '') payload.systolic_bp = parseInt(form.systolic_bp, 10);
        if (form.diastolic_bp !== '') payload.diastolic_bp = parseInt(form.diastolic_bp, 10);
        if (form.heart_rate_bpm !== '') payload.heart_rate_bpm = parseInt(form.heart_rate_bpm, 10);
        if (form.blood_sugar_mg !== '') payload.blood_sugar_mg = parseInt(form.blood_sugar_mg, 10);
        if (form.sleep_hours !== '') payload.sleep_hours = parseFloat(form.sleep_hours);
        if (form.water_intake_liters !== '') payload.water_intake_liters = parseFloat(form.water_intake_liters);
        if (form.step_count !== '') payload.step_count = parseInt(form.step_count, 10);
        onSubmit(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="hl-modal-backdrop" onClick={onClose}>
            <div className="hl-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hl-modal-header">
                    <h2>
                        <ClipboardList size={22} />
                        {isEditing ? 'Edit Health Log' : 'Log Today\'s Health'}
                    </h2>
                    <button className="hl-modal-close" onClick={onClose} title="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="hl-modal-body">
                        <div className="hl-form-grid">
                            {/* --- DAILY HABITS --- */}
                            
                            {/* Date */}
                            <div className="hl-form-group hl-form-group--full">
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0', gridColumn: '1 / -1' }}>
                                    💡 <strong>Tip:</strong> You don't need to fill everything! Just log your daily habits, and only fill in medical tests (like Blood Sugar or BP) on the days you actually test them.
                                </p>
                                <label htmlFor="hl-date">Date</label>
                                <input
                                    id="hl-date"
                                    className="hl-form-input"
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    max={getTodayString()}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Weight */}
                            <div className="hl-form-group">
                                <label htmlFor="hl-weight">
                                    <Scale size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Weight (kg)
                                </label>
                                <input
                                    id="hl-weight"
                                    className="hl-form-input"
                                    type="number"
                                    name="weight_kg"
                                    value={form.weight_kg}
                                    onChange={handleChange}
                                    placeholder="e.g. 72.5"
                                    step="0.1"
                                    min="0"
                                />
                            </div>

                            {/* Sleep */}
                            <div className="hl-form-group">
                                <label htmlFor="hl-sleep">
                                    <Moon size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Sleep (hours)
                                </label>
                                <input
                                    id="hl-sleep"
                                    className="hl-form-input"
                                    type="number"
                                    name="sleep_hours"
                                    value={form.sleep_hours}
                                    onChange={handleChange}
                                    placeholder="e.g. 7.5"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                />
                            </div>

                            {/* Water Intake */}
                            <div className="hl-form-group">
                                <label htmlFor="hl-water">
                                    <Droplets size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Water Intake (liters)
                                </label>
                                <input
                                    id="hl-water"
                                    className="hl-form-input"
                                    type="number"
                                    name="water_intake_liters"
                                    value={form.water_intake_liters}
                                    onChange={handleChange}
                                    placeholder="e.g. 2.5"
                                    step="0.1"
                                    min="0"
                                />
                            </div>

                            {/* Step Count */}
                            <div className="hl-form-group">
                                <label htmlFor="hl-steps">
                                    <Footprints size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Step Count
                                </label>
                                <input
                                    id="hl-steps"
                                    className="hl-form-input"
                                    type="number"
                                    name="step_count"
                                    value={form.step_count}
                                    onChange={handleChange}
                                    placeholder="e.g. 8500"
                                    min="0"
                                />
                            </div>

                            {/* --- MEDICAL TESTS --- */}
                            
                            <div className="hl-form-group hl-form-group--full" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Medical / Clinical Tests</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 'normal' }}>Only log these fields if you actually performed the test today.</p>
                            </div>

                            {/* Heart Rate */}
                            <div className="hl-form-group">
                                <label htmlFor="hl-hr">
                                    <Heart size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Heart Rate
                                </label>
                                <input
                                    id="hl-hr"
                                    className="hl-form-input"
                                    type="number"
                                    name="heart_rate_bpm"
                                    value={form.heart_rate_bpm}
                                    onChange={handleChange}
                                    placeholder="e.g. 72"
                                    min="0"
                                />
                            </div>
                            
                            {/* Blood Sugar */}
                            <div className="hl-form-group">
                                <label htmlFor="hl-sugar">
                                    <Droplets size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Blood Sugar (mg/dL)
                                </label>
                                <input
                                    id="hl-sugar"
                                    className="hl-form-input"
                                    type="number"
                                    name="blood_sugar_mg"
                                    value={form.blood_sugar_mg}
                                    onChange={handleChange}
                                    placeholder="e.g. 110"
                                    min="0"
                                />
                            </div>

                            {/* Blood Pressure */}
                            <div className="hl-form-group hl-form-group--full">
                                <label>
                                    <Activity size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Blood Pressure (mmHg)
                                </label>
                                <div className="hl-bp-row">
                                    <input
                                        className="hl-form-input"
                                        type="number"
                                        name="systolic_bp"
                                        value={form.systolic_bp}
                                        onChange={handleChange}
                                        placeholder="Systolic"
                                        min="0"
                                    />
                                    <span className="hl-bp-divider">/</span>
                                    <input
                                        className="hl-form-input"
                                        type="number"
                                        name="diastolic_bp"
                                        value={form.diastolic_bp}
                                        onChange={handleChange}
                                        placeholder="Diastolic"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hl-modal-footer">
                        <button type="button" className="hl-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="hl-btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader size={16} className="healthlog-spinner" />
                            ) : (
                                <Save size={16} />
                            )}
                            {isEditing ? 'Update Log' : 'Save Log'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ---------- Cell Renderer ---------- */
function CellValue({ value, unit }) {
    if (value === null || value === undefined || value === '') {
        return <span className="hl-cell-empty">—</span>;
    }
    return (
        <span>
            <span className="hl-cell-value">{value}</span>
            {unit && <span className="hl-cell-unit">{unit}</span>}
        </span>
    );
}

function BPCell({ systolic, diastolic }) {
    if (!systolic && !diastolic) {
        return <span className="hl-cell-empty">—</span>;
    }
    return (
        <span className="hl-cell-bp">
            <span className="hl-cell-value">{systolic ?? '—'}</span>
            <span className="hl-cell-bp-divider">/</span>
            <span className="hl-cell-value">{diastolic ?? '—'}</span>
            <span className="hl-cell-unit">mmHg</span>
        </span>
    );
}

/* ========== Main Page Component ========== */
function HealthLogPage() {
    const { apiFetch } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editLog, setEditLog] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(!sidebarCollapsed);
        setTimeout(() => setResizing(false), 350);
    };

    /* Toast helper */
    const showToast = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    /* Fetch logs */
    const fetchLogs = useCallback(async () => {
        try {
            const res = await apiFetch('/health-logs/');
            if (res.ok) {
                const data = await res.json();
                // Sort newest first
                const sorted = Array.isArray(data) ? data.sort((a, b) => b.date.localeCompare(a.date)) : [];
                setLogs(sorted);
            } else {
                showToast('error', 'Failed to load health logs.');
            }
        } catch (err) {
            console.error('Fetch logs error:', err);
            showToast('error', 'Network error loading logs.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, showToast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    /* Create / Update */
    const handleSubmit = async (payload) => {
        setSubmitting(true);
        try {
            const url = editLog ? `/health-logs/${editLog.id}/` : '/health-logs/';
            const method = editLog ? 'PUT' : 'POST';
            const res = await apiFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                showToast('success', editLog ? 'Log updated successfully!' : 'Health log saved!');
                setModalOpen(false);
                setEditLog(null);
                fetchLogs();
            } else {
                const errData = await res.json().catch(() => null);
                const errMsg = errData?.detail || errData?.date?.[0] || 'Failed to save log.';
                showToast('error', errMsg);
            }
        } catch (err) {
            console.error('Submit error:', err);
            showToast('error', 'Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    /* Delete */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await apiFetch(`/health-logs/${deleteTarget.id}/`, {
                method: 'DELETE'
            });
            if (res.ok || res.status === 204) {
                showToast('success', 'Log deleted.');
                setDeleteTarget(null);
                fetchLogs();
            } else {
                showToast('error', 'Failed to delete log.');
            }
        } catch (err) {
            console.error('Delete error:', err);
            showToast('error', 'Network error deleting log.');
        }
        setDeleteTarget(null);
    };

    /* Open edit */
    const openEdit = (log) => {
        setEditLog(log);
        setModalOpen(true);
    };

    /* Open create */
    const openCreate = () => {
        setEditLog(null);
        setModalOpen(true);
    };

    return (
        <div className="dashboard-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

            <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                {/* Header */}
                <div className="healthlog-header">
                    <div className="healthlog-title-group">
                        <h1>Health Log</h1>
                        <p>{getCurrentDateDisplay()}</p>
                    </div>
                    <div className="healthlog-actions">
                        <button className="dash-action-btn" onClick={openCreate}>
                            <Plus size={18} /> Log Today's Health
                        </button>
                    </div>
                </div>

                {/* Log History Card */}
                <div className="healthlog-card">
                    <div className="healthlog-card-header">
                        <h2>
                            <ClipboardList size={20} />
                            Log History
                        </h2>
                        {!loading && logs.length > 0 && (
                            <span className="healthlog-count-badge">{logs.length}</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="healthlog-loading">
                            <Loader size={30} className="healthlog-spinner" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="healthlog-empty">
                            <div className="healthlog-empty-icon">
                                <ClipboardList size={32} />
                            </div>
                            <h3>No health logs yet</h3>
                            <p>Start tracking your health by logging your daily vitals. Every data point helps you understand your body better.</p>
                            <button className="dash-action-btn" onClick={openCreate}>
                                <Plus size={18} /> Log Your First Entry
                            </button>
                        </div>
                    ) : (
                        <div className="healthlog-table-wrap">
                            <table className="healthlog-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Weight</th>
                                        <th>Blood Pressure</th>
                                        <th>Heart Rate</th>
                                        <th>Blood Sugar</th>
                                        <th>Sleep</th>
                                        <th>Water</th>
                                        <th>Steps</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>
                                                <div className="hl-date-cell">
                                                    <span className="hl-date-main">{formatDisplayDate(log.date)}</span>
                                                    <span className="hl-date-day">{formatDayName(log.date)}</span>
                                                </div>
                                            </td>
                                            <td><CellValue value={log.weight_kg} unit="kg" /></td>
                                            <td><BPCell systolic={log.systolic_bp} diastolic={log.diastolic_bp} /></td>
                                            <td><CellValue value={log.heart_rate_bpm} unit="bpm" /></td>
                                            <td><CellValue value={log.blood_sugar_mg} unit="mg/dL" /></td>
                                            <td><CellValue value={log.sleep_hours} unit="hrs" /></td>
                                            <td><CellValue value={log.water_intake_liters} unit="L" /></td>
                                            <td><CellValue value={log.step_count} /></td>
                                            <td>
                                                <div className="hl-actions">
                                                    <button
                                                        className="hl-action-btn"
                                                        onClick={() => openEdit(log)}
                                                        title="Edit log"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        className="hl-action-btn hl-action-btn--delete"
                                                        onClick={() => setDeleteTarget(log)}
                                                        title="Delete log"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Log Form Modal */}
            <LogFormModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditLog(null); }}
                onSubmit={handleSubmit}
                initialData={editLog}
                isSubmitting={submitting}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete Health Log"
                message={`Are you sure you want to delete the log entry for ${deleteTarget ? formatDisplayDate(deleteTarget.date) : ''}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Keep It"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isDestructive={true}
            />

            {/* Toast */}
            <Toast toast={toast} />
        </div>
    );
}

export default HealthLogPage;
