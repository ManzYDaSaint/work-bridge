'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react';

interface ApplicationTimelineProps {
  applicationId: string;
  currentStatus: string;
}

const MILESTONES = [
  { key: 'PENDING', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEWING', label: 'Interview' },
  { key: 'ACCEPTED', label: 'Accepted / Hired' },
];

export default function ApplicationTimeline({ applicationId, currentStatus }: ApplicationTimelineProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/applications/${applicationId}/history`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Error fetching application timeline history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [applicationId]);

  const isRejected = currentStatus === 'REJECTED';
  const isWithdrawn = currentStatus === 'WITHDRAWN';

  const getMilestoneIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'SHORTLISTED': return 1;
      case 'INTERVIEWING': return 2;
      case 'ACCEPTED':
      case 'HIRED': return 3;
      default: return 0;
    }
  };

  const currentIndex = getMilestoneIndex(currentStatus);

  return (
    <div style={{
      backgroundColor: '#F9FAFB',
      border: '1px solid #E5E7EB',
      borderRadius: '10px',
      padding: '16px',
      marginTop: '12px'
    }}>
      <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
        Application Journey & Status Tracker
      </h4>

      {isRejected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
          <XCircle size={18} />
          <span>This application was not selected by the employer.</span>
        </div>
      ) : isWithdrawn ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
          <Clock size={18} />
          <span>You withdrew this application.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {MILESTONES.map((step, idx) => {
            const isPassed = idx <= currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <React.Fragment key={step.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isPassed ? (isCurrent ? '#2563EB' : '#059669') : '#E5E7EB',
                    color: isPassed ? '#FFFFFF' : '#9CA3AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    boxShadow: isCurrent ? '0 0 0 4px #DBEAFE' : 'none',
                    transition: 'all 0.2s ease-in-out'
                  }}>
                    {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#1E40AF' : (isPassed ? '#111827' : '#9CA3AF'),
                    marginTop: '6px'
                  }}>
                    {step.label}
                  </span>
                </div>

                {idx < MILESTONES.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: idx < currentIndex ? '#059669' : '#E5E7EB',
                    margin: '0 8px',
                    alignSelf: 'center',
                    marginBottom: '18px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Audit History Dropdown / Timeline Details */}
      {history.length > 0 && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Milestone History
          </span>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#4B5563' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronRight size={14} style={{ color: '#2563EB' }} />
                  Status changed to <strong style={{ color: '#111827' }}>{item.to_status}</strong>
                </span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
