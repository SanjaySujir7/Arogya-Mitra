import React from 'react';
import { BellRing } from 'lucide-react';
import './AlertPanel.css';

function AlertPanel({ alerts }) {
    return (
        <div className="alert-panel">
            <div className="alert-panel-title">
                <span><BellRing size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: '#f87171' }} /></span> Recent Alerts
            </div>
            <div className="alert-list">
                {alerts.map((alert, index) => {
                    let dotColor = 'blue';
                    if (alert.type === 'critical') dotColor = 'red';
                    if (alert.type === 'warning') dotColor = 'amber';
                    if (alert.type === 'success') dotColor = 'green';
                    if (alert.type === 'info') dotColor = 'blue';

                    return (
                        <div className="alert-item" key={index}>
                            <div className={`alert-dot alert-dot--${dotColor}`} />
                            <div className="alert-item-content">
                                <div className="alert-item-text">
                                    <strong>{alert.title}</strong>: {alert.message}
                                </div>
                                <div className="alert-item-time">Just now</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AlertPanel;
