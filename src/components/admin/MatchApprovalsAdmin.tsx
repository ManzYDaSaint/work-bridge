"use client";

import React, { useEffect, useState } from "react";

type QueueItem = any;

export default function MatchApprovalsAdmin() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [minScore, setMinScore] = useState<number>(80);
  const [showPreview, setShowPreview] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function postAction(body: any) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json?.error) console.error(json.error);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    setActioning(id);
    await postAction({ action: "APPROVE", notificationId: id });
    setActioning(null);
  }

  async function rejectItem(id: string) {
    setActioning(id);
    await postAction({ action: "REJECT", notificationId: id });
    setActioning(null);
  }

  async function requeue(id: string) {
    setActioning(id);
    await postAction({ action: "REQUEUE", notificationId: id });
    setActioning(null);
  }

  async function bulkApproveByScore() {
    setActioning("bulk-approve");
    await postAction({ action: "APPROVE", approveHighScores: true, minScore });
    setActioning(null);
  }

  async function bulkRequeueDeadLetter() {
    if (!data?.deadLetter || data.deadLetter.length === 0) return;
    const ids = data.deadLetter.map((d: any) => d.id);
    setActioning("bulk-requeue");
    await postAction({ action: "REQUEUE", notificationIds: ids });
    setActioning(null);
  }

  function toggleExpand(id: string) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  function previewList() {
    if (!data?.requiresApproval) return [];
    return data.requiresApproval.filter((item: any) => (item.payload?._scoring?.finalScore ?? item.payload?.matchScore) >= minScore);
  }

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  const previewItems = previewList();

  return (
    <div style={{ padding: 16 }}>
      <h2>Match Approvals</h2>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div><strong>Mode:</strong> {data.dispatchMode}</div>
        <div><strong>Requires Approval:</strong> {data.pendingCount}</div>
        <div><strong>Pending:</strong> {data.pendingQueueCount}</div>
        <div><strong>Dead Letter:</strong> {data.deadLetterCount}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Bulk approve matches with score {'>='} </label>
        <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} style={{ width: 80, marginRight: 8 }} />
        <button disabled={actioning === "bulk-approve"} onClick={() => setShowPreview(true)}>Preview</button>
        <button disabled={actioning === "bulk-approve"} onClick={bulkApproveByScore} style={{ marginLeft: 8 }}>Bulk Approve</button>
        <button disabled={actioning === "bulk-requeue"} onClick={bulkRequeueDeadLetter} style={{ marginLeft: 8 }}>Requeue All Dead-Letter</button>
      </div>

      {showPreview && (
        <div style={{ marginTop: 12, padding: 8, background: "#fff7e6", border: "1px solid #ffdca8" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><strong>Preview: {previewItems.length} items will be approved (score ≥ {minScore})</strong></div>
            <div>
              <button onClick={() => setShowPreview(false)}>Close</button>
            </div>
          </div>
          <ul>
            {previewItems.slice(0, 200).map((it: any) => (
              <li key={it.id}>{it.job_seekers?.full_name || 'Seeker'} — {it.jobs?.title} — Score: {it.payload?._scoring?.finalScore ?? it.payload?.matchScore}</li>
            ))}
          </ul>
        </div>
      )}

      <section style={{ marginTop: 20 }}>
        <h3>Requires Approval</h3>
        {data.requiresApproval.length === 0 ? <div>No items requiring approval</div> : (
          <div>
            {data.requiresApproval.map((item: QueueItem) => (
              <div key={item.id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{item.job_seekers?.full_name || "Seeker"}</strong> — {item.jobs?.title}
                    <div style={{ fontSize: 12, color: "#666" }}>Score: {item.payload?._scoring?.finalScore ?? item.payload?.matchScore}</div>
                  </div>
                  <div>
                    <button onClick={() => approve(item.id)} disabled={!!actioning}>Approve</button>
                    <button onClick={() => rejectItem(item.id)} disabled={!!actioning} style={{ marginLeft: 8 }}>Reject</button>
                    <button onClick={() => toggleExpand(item.id)} style={{ marginLeft: 8 }}>Details</button>
                  </div>
                </div>
                {expanded[item.id] && (
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, background: "#fafafa", padding: 8 }}>{JSON.stringify(item.payload?._scoring || item.payload, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>Pending Queue</h3>
        {data.pendingQueue.length === 0 ? <div>No pending items</div> : (
          <div>
            {data.pendingQueue.map((item: QueueItem) => (
              <div key={item.id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{item.job_seekers?.full_name || "Seeker"}</strong> — {item.jobs?.title}
                    <div style={{ fontSize: 12, color: "#666" }}>Score: {item.payload?._scoring?.finalScore ?? item.payload?.matchScore}</div>
                  </div>
                  <div>
                    <button onClick={() => requeue(item.id)} disabled={!!actioning}>Requeue</button>
                    <button onClick={() => rejectItem(item.id)} disabled={!!actioning} style={{ marginLeft: 8 }}>Reject</button>
                    <button onClick={() => toggleExpand(item.id)} style={{ marginLeft: 8 }}>Details</button>
                  </div>
                </div>
                {expanded[item.id] && (
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, background: "#fafafa", padding: 8 }}>{JSON.stringify(item.payload?._scoring || item.payload, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>Dead Letter Items</h3>
        {data.deadLetter.length === 0 ? <div>No dead-letter items</div> : (
          <div>
            {data.deadLetter.map((item: QueueItem) => (
              <div key={item.id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{item.job_seekers?.full_name || "Seeker"}</strong> — {item.jobs?.title}
                    <div style={{ fontSize: 12, color: "#666" }}>Attempts: {item.attempts} — Last error: {item.last_error}</div>
                  </div>
                  <div>
                    <button onClick={() => requeue(item.id)} disabled={!!actioning}>Requeue</button>
                    <button onClick={() => toggleExpand(item.id)} style={{ marginLeft: 8 }}>Details</button>
                  </div>
                </div>
                {expanded[item.id] && (
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, background: "#fafafa", padding: 8 }}>{JSON.stringify(item.payload?._scoring || item.payload, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
