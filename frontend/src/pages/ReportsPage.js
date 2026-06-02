import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
    FileText, Download, Heart, Activity, Brain, ShieldAlert,
    Loader
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './ReportsPage.css';

/* ---------- Chart Tooltip ---------- */
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color }}>
                    {p.name}: <strong>{p.value}</strong>
                </div>
            ))}
        </div>
    );
};

function ReportsPage() {
    const { apiFetch } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizing, setResizing] = useState(false);

    const handleSidebarToggle = () => {
        setResizing(true);
        setSidebarCollapsed(prev => !prev);
        setTimeout(() => setResizing(false), 300);
    };

    const fetchReports = useCallback(async () => {
        try {
            const res = await apiFetch('/reports/');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleDownloadPDF = async () => {
        setGenerating(true);
        try {
            const res = await apiFetch('/reports/download-pdf/');
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const today = new Date().toISOString().split('T')[0];
                a.download = `Arogya-Mitra-Report-${today}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('PDF download failed:', err);
        } finally {
            setGenerating(false);
        }
    };

    const axisColor = 'var(--text-secondary)';

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    const formatFullDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getMoodEmoji = (val) => {
        if (val >= 4.5) return '😄';
        if (val >= 3.5) return '🙂';
        if (val >= 2.5) return '😐';
        if (val >= 1.5) return '😕';
        return '😫';
    };

    const getSleepEmoji = (val) => {
        if (val >= 4.5) return '⭐';
        if (val >= 3.5) return '🌙';
        if (val >= 2.5) return '😴';
        return '💤';
    };

    return (
        <div className="reports-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

            <main className={`reports-main ${sidebarCollapsed ? 'reports-main--collapsed' : ''} ${resizing ? 'resizing' : ''}`}>
                {loading ? (
                    <div className="reports-loading">
                        <Loader size={22} className="spin-animation" />
                        Loading reports...
                    </div>
                ) : !data ? (
                    <div className="report-empty">
                        <div className="report-empty-icon">📊</div>
                        <p>Unable to load report data. Please try again later.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="reports-header">
                            <div>
                                <h1><FileText size={28} /> Health Reports</h1>
                                <p>Your comprehensive health summary and trends</p>
                            </div>
                            <button
                                className="btn-download-pdf"
                                onClick={handleDownloadPDF}
                                disabled={generating}
                            >
                                {generating ? <Loader size={16} className="spin-animation" /> : <Download size={16} />}
                                {generating ? 'Generating...' : 'Download PDF'}
                            </button>
                        </div>

                        <div>

                            {/* Summary Cards */}
                            <div className="reports-summary-row report-fade-in" style={{ animationDelay: '0.1s' }}>
                                <div className="report-summary-card">
                                    <span className="report-summary-label">Health Score</span>
                                    <span className="report-summary-value" style={{ color: data.summary.health_score >= 70 ? '#4ade80' : data.summary.health_score >= 40 ? '#fbbf24' : '#f87171' }}>
                                        {data.summary.health_score}
                                    </span>
                                    <span className="report-summary-sub">out of 100</span>
                                </div>
                                <div className="report-summary-card">
                                    <span className="report-summary-label">Risk Level</span>
                                    <span className="report-summary-value" style={{ color: data.summary.risk_level === 'High' ? '#f87171' : '#4ade80', fontSize: '1.3rem' }}>
                                        {data.summary.risk_level}
                                    </span>
                                    <span className="report-summary-sub">current status</span>
                                </div>
                                <div className="report-summary-card">
                                    <span className="report-summary-label">BMI</span>
                                    <span className="report-summary-value">{data.summary.bmi || '—'}</span>
                                    <span className="report-summary-sub">{data.summary.bmi ? (data.summary.bmi < 18.5 ? 'Underweight' : data.summary.bmi < 25 ? 'Normal' : data.summary.bmi < 30 ? 'Overweight' : 'Obese') : 'No data'}</span>
                                </div>
                                <div className="report-summary-card">
                                    <span className="report-summary-label">Health Logs</span>
                                    <span className="report-summary-value">{data.summary.total_logs}</span>
                                    <span className="report-summary-sub">total entries</span>
                                </div>
                                <div className="report-summary-card">
                                    <span className="report-summary-label">Check-ins</span>
                                    <span className="report-summary-value">{data.summary.total_checkins}</span>
                                    <span className="report-summary-sub">daily logs</span>
                                </div>
                                <div className="report-summary-card">
                                    <span className="report-summary-label">Member Since</span>
                                    <span className="report-summary-value" style={{ fontSize: '1.1rem' }}>{formatFullDate(data.summary.member_since)}</span>
                                </div>
                            </div>

                            {/* Prediction History */}
                            <div className="report-section report-fade-in" style={{ animationDelay: '0.2s' }}>
                                <div className="report-section-title">
                                    <ShieldAlert size={20} color="#f87171" />
                                    AI Prediction History
                                </div>
                                {data.prediction_history.length > 0 ? (
                                    <div className="report-table-wrap">
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Result</th>
                                                <th>Confidence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.prediction_history.map((pred, i) => (
                                                <tr key={i}>
                                                    <td>{formatFullDate(pred.created_at)}</td>
                                                    <td style={{ textTransform: 'capitalize' }}>{pred.prediction_type.replace('_', ' ')}</td>
                                                    <td>
                                                        <span className={`badge-risk badge-risk--${pred.prediction === 'High Risk' ? 'high' : 'low'}`}>
                                                            {pred.prediction}
                                                        </span>
                                                    </td>
                                                    <td>{(pred.confidence * 100).toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                ) : (
                                    <div className="report-empty">
                                        <p>No AI predictions yet. Visit the Predictions page to run your first analysis!</p>
                                    </div>
                                )}
                            </div>

                            {/* Health Trends Charts */}
                            {data.health_trends.length >= 2 && (
                                <div className="reports-charts-row report-fade-in" style={{ animationDelay: '0.3s' }}>
                                    {/* BP Trend */}
                                    {data.health_trends.some(h => h.systolic_bp) && (
                                        <div className="report-section" style={{ margin: 0 }}>
                                            <div className="report-section-title">
                                                <Heart size={20} color="#f87171" />
                                                Blood Pressure (30 Days)
                                            </div>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <LineChart data={data.health_trends.filter(h => h.systolic_bp)}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                                    <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickFormatter={formatDate} />
                                                    <YAxis stroke={axisColor} fontSize={11} />
                                                    <Tooltip content={<ChartTooltip />} />
                                                    <Legend />
                                                    <Line type="monotone" dataKey="systolic_bp" name="Systolic" stroke="#f87171" strokeWidth={2.5} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="diastolic_bp" name="Diastolic" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* Weight Trend */}
                                    {data.health_trends.some(h => h.weight_kg) && (
                                        <div className="report-section" style={{ margin: 0 }}>
                                            <div className="report-section-title">
                                                <Activity size={20} color="#a78bfa" />
                                                Weight Trend (30 Days)
                                            </div>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <LineChart data={data.health_trends.filter(h => h.weight_kg)}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                                    <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickFormatter={formatDate} />
                                                    <YAxis stroke={axisColor} fontSize={11} />
                                                    <Tooltip content={<ChartTooltip />} />
                                                    <Line type="monotone" dataKey="weight_kg" name="Weight (kg)" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Check-in Summary */}
                            {data.checkin_summary && data.checkin_summary.total_checkins > 0 && (
                                <div className="report-section report-fade-in" style={{ animationDelay: '0.4s' }}>
                                    <div className="report-section-title">
                                        <Brain size={20} color="#8b5cf6" />
                                        Daily Check-in Summary ({data.checkin_summary.total_checkins} check-ins)
                                    </div>
                                    <div className="checkin-stats-grid">
                                        <div className="checkin-stat-card">
                                            <div className="checkin-stat-icon">{getMoodEmoji(data.checkin_summary.avg_mood)}</div>
                                            <div className="checkin-stat-value">{data.checkin_summary.avg_mood.toFixed(1)}</div>
                                            <div className="checkin-stat-label">Avg Mood (out of 5)</div>
                                        </div>
                                        <div className="checkin-stat-card">
                                            <div className="checkin-stat-icon">{getSleepEmoji(data.checkin_summary.avg_sleep)}</div>
                                            <div className="checkin-stat-value">{data.checkin_summary.avg_sleep.toFixed(1)}</div>
                                            <div className="checkin-stat-label">Avg Sleep Quality (out of 5)</div>
                                        </div>
                                        <div className="checkin-stat-card">
                                            <div className="checkin-stat-icon">💧</div>
                                            <div className="checkin-stat-value">{data.checkin_summary.water_goal_hit_pct}%</div>
                                            <div className="checkin-stat-label">Water Goal Hit Rate</div>
                                        </div>
                                        <div className="checkin-stat-card">
                                            <div className="checkin-stat-icon">🏃</div>
                                            <div className="checkin-stat-value">{data.checkin_summary.exercise_goal_hit_pct}%</div>
                                            <div className="checkin-stat-label">Exercise Goal Hit Rate</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default ReportsPage;
