'use client';

import React, { useState } from 'react';
import { Star, CheckCircle, Save, Loader2 } from 'lucide-react';

interface CandidateScorecardProps {
  applicationId: string;
  initialTechnical?: number;
  initialExperience?: number;
  initialCommunication?: number;
  initialRecommendation?: 'STRONG_YES' | 'YES' | 'NEUTRAL' | 'NO';
  initialNotes?: string;
  onSaved?: () => void;
}

export default function CandidateScorecard({
  applicationId,
  initialTechnical = 3,
  initialExperience = 3,
  initialCommunication = 3,
  initialRecommendation = 'YES',
  initialNotes = '',
  onSaved
}: CandidateScorecardProps) {
  const [technical, setTechnical] = useState<number>(initialTechnical);
  const [experience, setExperience] = useState<number>(initialExperience);
  const [communication, setCommunication] = useState<number>(initialCommunication);
  const [recommendation, setRecommendation] = useState<string>(initialRecommendation);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const overallScore = ((technical + experience + communication) / 3).toFixed(1);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/employer/applications/${applicationId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technical_rating: technical,
          experience_rating: experience,
          communication_rating: communication,
          recommendation,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save evaluation');

      setSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const renderStarRating = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: '#2563EB' }}>{value} / 5</span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: star <= value ? '#F59E0B' : '#D1D5DB',
              transition: 'color 0.15s ease-in-out'
            }}
          >
            <Star size={20} fill={star <= value ? '#F59E0B' : 'transparent'} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginTop: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>Candidate Scorecard</h3>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>Structure your review & score applicant alignment</p>
        </div>
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '20px',
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 500 }}>Overall Score:</span>
          <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 700 }}>{overallScore} / 5</span>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', padding: '10px', fontSize: '13px', marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {renderStarRating('Technical Competency', technical, setTechnical)}
      {renderStarRating('Experience & Track Record', experience, setExperience)}
      {renderStarRating('Soft Skills & Communication', communication, setCommunication)}

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
          Recommendation
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { id: 'STRONG_YES', label: 'Strong Yes', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { id: 'YES', label: 'Yes', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { id: 'NEUTRAL', label: 'Neutral', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            { id: 'NO', label: 'No', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
          ].map((item) => {
            const isSelected = recommendation === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setRecommendation(item.id)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${item.color}` : `1px solid ${item.border}`,
                  backgroundColor: isSelected ? item.bg : '#FFFFFF',
                  color: isSelected ? item.color : '#6B7280',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
          Internal Evaluator Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Leave specific feedback, key strengths, or concerns..."
          style={{
            width: '100%',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            padding: '10px',
            fontSize: '13px',
            color: '#111827',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        {success && (
          <span style={{ fontSize: '13px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <CheckCircle size={16} /> Evaluation saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Scorecard'}
        </button>
      </div>
    </div>
  );
}
