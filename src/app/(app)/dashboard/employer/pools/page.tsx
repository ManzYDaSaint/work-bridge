import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, UserPlus, FolderOpen, Loader2, ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import CandidateDetailDrawer, { ApplicantProfile } from '@/components/dashboard/employer/CandidateDetailDrawer';
import { toggleSaveTalent } from '@/app/(app)/dashboard/employer/actions';

export default function EmployerTalentPoolsPage() {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  
  // Selected Drawer State
  const [selectedSeekerId, setSelectedSeekerId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ApplicantProfile | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // New Pool Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [newPoolDesc, setNewPoolDesc] = useState('');
  const [newPoolColor, setNewPoolColor] = useState('#3B82F6');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPools();
  }, []);

  const openCandidateDrawer = (seekerId: string) => {
    setSelectedSeekerId(seekerId);
    setSelectedProfile(null);
    setDrawerError(null);
  };

  useEffect(() => {
    if (!selectedSeekerId) return;

    setDrawerLoading(true);
    setDrawerError(null);

    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/employer/discover/${selectedSeekerId}`);
        if (!active) return;
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Candidate profile not available");
        }
        const data = await res.json();
        if (active) setSelectedProfile(data);
      } catch (err: any) {
        if (active) setDrawerError(err.message || "Failed to load candidate details");
      } finally {
        if (active) setDrawerLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedSeekerId]);

  const fetchPools = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/talent-pools');
      if (res.ok) {
        const data = await res.json();
        setPools(data.pools || []);
        if (data.pools && data.pools.length > 0 && !selectedPool) {
          selectPool(data.pools[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching pools:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectPool = async (pool: any) => {
    setSelectedPool(pool);
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/employer/talent-pools/${pool.id}/members`);
      if (res.ok) {
        const data = await res.json();
        const memberList = data.members || [];
        setMembers(memberList);
        setPools((prevPools) =>
          prevPools.map((p) => (p.id === pool.id ? { ...p, member_count: memberList.length } : p))
        );
      }
    } catch (err) {
      console.error('Error fetching pool members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/talent-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPoolName,
          description: newPoolDesc,
          color_tag: newPoolColor,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPools([data.pool, ...pools]);
        selectPool(data.pool);
        setNewPoolName('');
        setNewPoolDesc('');
        setIsCreating(false);
      } else {
        alert(data.error || 'Failed to create talent pool.');
      }
    } catch (err: any) {
      console.error('Error creating pool:', err);
      alert(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (seekerId: string) => {
    if (!selectedPool) return;
    try {
      const res = await fetch(`/api/employer/talent-pools/${selectedPool.id}/members?seeker_id=${seekerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMembers(members.filter((m) => m.seeker.id !== seekerId));
        setPools(pools.map((p) => p.id === selectedPool.id ? { ...p, member_count: Math.max(0, p.member_count - 1) } : p));
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Talent Pools & Candidate CRM</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>Organize candidates into custom talent folders for instant requisition outreach</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> New Talent Pool
          </button>
        </div>

        {/* Modal for creating a pool */}
        {isCreating && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
          }}>
            <form onSubmit={handleCreatePool} style={{
              backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Create New Talent Pool</h3>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Pool Name</label>
                <input
                  type="text"
                  required
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  placeholder="e.g. Senior Software Engineers, Finance Interns"
                  style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={2}
                  value={newPoolDesc}
                  onChange={(e) => setNewPoolDesc(e.target.value)}
                  placeholder="Short note on what talent belongs in this pool..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Folder Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewPoolColor(c)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c, border: newPoolColor === c ? '3px solid #111827' : 'none', cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  style={{ padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: '6px', background: '#FFFFFF', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Grid View */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Pools Sidebar */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Your Folders ({pools.length})
            </h3>

            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}><Loader2 className="animate-spin" /></div>
            ) : pools.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#6B7280' }}>
                <FolderOpen size={32} style={{ margin: '0 auto 8px auto', color: '#9CA3AF' }} />
                <p style={{ fontSize: '14px', margin: 0 }}>No pools created yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pools.map((p) => {
                  const isSelected = selectedPool?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectPool(p)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${p.color_tag}` : '1px solid #E5E7EB',
                        backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: p.color_tag }} />
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{p.name}</h4>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>{p.member_count} candidates</span>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: isSelected ? p.color_tag : '#9CA3AF' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members Content Panel */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px' }}>
            {selectedPool ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>{selectedPool.name}</h2>
                    {selectedPool.description && (
                      <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>{selectedPool.description}</p>
                    )}
                  </div>
                  <Link
                    href="/dashboard/employer/discover"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none', backgroundColor: '#EFF6FF', padding: '8px 12px', borderRadius: '6px'
                    }}
                  >
                    <UserPlus size={16} /> Discover More Talent
                  </Link>
                </div>

                {membersLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                    <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
                    <span>Loading candidates...</span>
                  </div>
                ) : members.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
                    <Users size={40} style={{ margin: '0 auto 12px auto', color: '#9CA3AF' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: 0 }}>No candidates in this pool</h3>
                    <p style={{ fontSize: '14px', margin: '4px 0 16px 0' }}>Browse candidate discovery to add talent to this folder.</p>
                    <Link
                      href="/dashboard/employer/discover"
                      style={{
                        backgroundColor: '#2563EB', color: '#FFFFFF', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      Go to Candidate Discover <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {members.map(({ seeker, notes, id }) => (
                      <div
                        key={id}
                        style={{
                          border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px'
                            }}>
                              {seeker?.full_name ? seeker.full_name[0] : 'C'}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>{seeker?.full_name}</h4>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>{seeker?.location || 'Malawi'}</span>
                            </div>
                          </div>

                          {seeker?.skills && seeker.skills.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                              {seeker.skills.slice(0, 3).map((s: string) => (
                                <span key={s} style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E5E7EB', marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => openCandidateDrawer(seeker.id)}
                            style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            View Profile & Actions
                          </button>
                          <button
                            onClick={() => handleRemoveMember(seeker.id)}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            title="Remove from pool"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Select a pool to view members.</div>
            )}
          </div>
        </div>

        <CandidateDetailDrawer
          open={!!selectedSeekerId}
          profile={selectedProfile}
          loading={drawerLoading}
          error={drawerError}
          isSaved={false}
          onClose={() => setSelectedSeekerId(null)}
          onToggleSave={async (e) => {
            if (!selectedSeekerId) return;
            await toggleSaveTalent(selectedSeekerId, false);
          }}
        />
      </div>
  );
}
