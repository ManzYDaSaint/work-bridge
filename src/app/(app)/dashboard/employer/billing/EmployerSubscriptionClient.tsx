'use client';

import React, { useState } from 'react';
import { 
  Crown, Sparkles, CheckCircle2, ShieldCheck, Zap, 
  CreditCard, ArrowRight, Folder, Users, Star, 
  MessageSquare, Lock, X
} from 'lucide-react';
import Link from 'next/link';

export default function EmployerSubscriptionClient({ employer }: { employer: any }) {
  const currentPlan = employer?.plan || 'FREE';
  const isPro = currentPlan === 'PRO' || currentPlan === 'ENTERPRISE';

  const [selectedPeriod, setSelectedPeriod] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [submitting, setSubmitting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const price = selectedPeriod === 'MONTHLY' ? 25000 : 60000;
  const periodLabel = selectedPeriod === 'MONTHLY' ? '/ month' : '/ 3 months (Save 20%)';

  const handleInitiateUpgrade = () => {
    setShowCheckout(true);
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      // Initiate PayChangu checkout for Employer Pro
      const res = await fetch('/api/employer/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'INITIATE_CHECKOUT',
          period: selectedPeriod,
          amount: price,
        }),
      });

      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      alert(err.message || 'Payment processing error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #16324F 0%, #1E40AF 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: '#FFFFFF',
        marginBottom: '32px',
        boxShadow: '0 10px 25px -5px rgba(22, 50, 79, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '12px', backdropFilter: 'blur(4px)' }}>
            <Crown size={14} style={{ color: '#F59E0B' }} /> Aganyu Employer Workspace
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Scale Your Hiring with Employer Pro
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.9, maxWidth: '640px', margin: 0, lineHeight: 1.5 }}>
            Compare plans, unlock unlimited talent pools, structured scorecard evaluations, direct 1-tap WhatsApp invitations, and verified employer badges.
          </p>
        </div>
      </div>

      {/* Period Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px', display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setSelectedPeriod('MONTHLY')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: selectedPeriod === 'MONTHLY' ? '#FFFFFF' : 'transparent',
              color: selectedPeriod === 'MONTHLY' ? '#111827' : '#6B7280',
              boxShadow: selectedPeriod === 'MONTHLY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Monthly Billing (MWK 25,000)
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('QUARTERLY')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: selectedPeriod === 'QUARTERLY' ? '#FFFFFF' : 'transparent',
              color: selectedPeriod === 'QUARTERLY' ? '#111827' : '#6B7280',
              boxShadow: selectedPeriod === 'QUARTERLY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            Quarterly Billing (Save 20%)
            <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>Best Value</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>
        {/* FREE PLAN CARD */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>Free Starter Plan</h3>
              {currentPlan === 'FREE' && (
                <span style={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px' }}>
                  Current Plan
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>Standard tier for single job postings and initial candidate testing.</p>

            <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '24px' }}>
              MWK 0 <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>/ forever</span>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Plan Caps & Restrictions:
            </h4>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#4B5563' }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} /> 1 Active Job Listing at a time
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#D97706' }}>
                <Lock size={18} style={{ color: '#D97706', flexShrink: 0 }} /> Max 1 Talent Pool folder (5 candidates max)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#D97706' }}>
                <Lock size={18} style={{ color: '#D97706', flexShrink: 0 }} /> Max 30 Candidate contact views per month
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#4B5563' }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} /> Basic Candidate Screening & Status Pipeline
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#9CA3AF' }}>
                <X size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} /> No Direct 1-Tap WhatsApp Invites
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#9CA3AF' }}>
                <X size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} /> No Verified Recruiter Badge
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '28px' }}>
            <button
              disabled
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                color: '#6B7280',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'not-allowed'
              }}
            >
              {currentPlan === 'FREE' ? 'Active Free Plan' : 'Basic Tier'}
            </button>
          </div>
        </div>

        {/* PRO PLAN CARD */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #2563EB',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.1)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: '-12px', right: '24px', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            Recommended Enterprise
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={20} style={{ color: '#2563EB' }} /> Employer Pro Plan
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>Full access to custom talent pools, evaluation scorecards, & high-velocity hiring.</p>

            <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '24px' }}>
              MWK {price.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>{periodLabel}</span>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Unlimited Pro Features:
            </h4>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <CheckCircle2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} /> Unlimited Active Job Listings
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <CheckCircle2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} /> Unlimited Custom Talent Pools & Storage
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <CheckCircle2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} /> Unlimited Candidate Contact Views
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <CheckCircle2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} /> Candidate Scorecard Evaluations (1-5★ Rubrics)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <CheckCircle2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} /> Direct 1-Tap WhatsApp Candidate Outreach
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <CheckCircle2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} /> Verified Recruiter Badge
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '28px' }}>
            {isPro ? (
              <button
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#D1FAE5',
                  color: '#065F46',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'default'
                }}
              >
                ✓ Active Employer Pro Plan
              </button>
            ) : (
              <button
                onClick={handleInitiateUpgrade}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                Upgrade to Employer Pro <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>PayChangu Online Checkout</h3>
              <button onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4B5563', marginBottom: '6px' }}>
                <span>Plan:</span>
                <strong style={{ color: '#111827' }}>Employer Pro ({selectedPeriod})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4B5563', marginBottom: '6px' }}>
                <span>Amount:</span>
                <strong style={{ color: '#2563EB', fontSize: '15px' }}>MWK {price.toLocaleString()}</strong>
              </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                  <span>Payment Method:</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#E5173F' }}>
                    <span>📱</span> Airtel Money only
                  </span>
                </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CreditCard size={18} />
              {submitting ? 'Redirecting to Gateway...' : 'Proceed to PayChangu Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
