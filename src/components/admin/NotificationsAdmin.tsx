"use client";

import React, { useEffect, useState } from "react";

type QueueItem = any;

export default function NotificationsAdmin() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

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

  async function requeue(id: string) {
    setActioning(id);
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEUE", notificationId: id })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  }

  async function approve(id: string) {
    setActioning(id);
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", notificationId: id })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  }

  async function rejectItem(id: string) {
    setActioning(id);
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", notificationId: id })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Notification Queue Admin</h2>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <strong>Dispatch Mode:</strong> {data.dispatchMode}
        </div>
        <div>
          <strong>Requires Approval:</strong> {data.pendingCount}
        </div>
        <div>
          <strong>Pending Queue:</strong> {data.pendingQueueCount}
        </div>
        <div>
          <strong>Dead Letter:</strong> {data.deadLetterCount}
        </div>
      </div>

      <section style={{ marginTop: 20 }}>
        <h3>Requires Approval</h3>
        {data.requiresApproval.length === 0 ? (
          <div>No items requiring approval</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Created</th>
                <th>Seeker</th>
                <th>Job</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.requiresApproval.map((item: QueueItem) => (
                <tr key={item.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{item.id}</td>
                  <td style={{ padding: 8 }}>{new Date(item.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{item.job_seekers?.full_name || "-"}</td>
                  <td style={{ padding: 8 }}>{item.jobs?.title || "-"}</td>
                  <td style={{ padding: 8 }}>{item.payload?._scoring?.finalScore ?? item.payload?.matchScore}</td>
                  <td style={{ padding: 8 }}>
                    <button disabled={actioning === item.id} onClick={() => approve(item.id)}>Approve</button>
                    <button disabled={actioning === item.id} onClick={() => rejectItem(item.id)} style={{ marginLeft: 8 }}>Reject</button>
                    <button disabled={actioning === item.id} onClick={() => console.log(item.payload?._scoring)} style={{ marginLeft: 8 }}>Show Scoring</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{ marginTop: 20 }}>Pending Queue</h3>
        {data.pendingQueue.length === 0 ? (
          <div>No pending items</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Created</th>
                <th>Seeker</th>
                <th>Job</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingQueue.map((item: QueueItem) => (
                <tr key={item.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{item.id}</td>
                  <td style={{ padding: 8 }}>{new Date(item.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{item.job_seekers?.full_name || "-"}</td>
                  <td style={{ padding: 8 }}>{item.jobs?.title || "-"}</td>
                  <td style={{ padding: 8 }}>{item.payload?._scoring?.finalScore ?? item.payload?.matchScore}</td>
                  <td style={{ padding: 8 }}>
                    <button disabled={actioning === item.id} onClick={() => requeue(item.id)}>Requeue</button>
                    <button disabled={actioning === item.id} onClick={() => rejectItem(item.id)} style={{ marginLeft: 8 }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{ marginTop: 20 }}>Dead Letter Items</h3>
        {data.deadLetter.length === 0 ? (
          <div>No dead-letter items</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Created</th>
                <th>Seeker</th>
                <th>Job</th>
                <th>Attempts</th>
                <th>Last Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.deadLetter.map((item: QueueItem) => (
                <tr key={item.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{item.id}</td>
                  <td style={{ padding: 8 }}>{new Date(item.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{item.job_seekers?.full_name || "-"}</td>
                  <td style={{ padding: 8 }}>{item.jobs?.title || "-"}</td>
                  <td style={{ padding: 8 }}>{item.attempts}</td>
                  <td style={{ padding: 8, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{item.last_error}</td>
                  <td style={{ padding: 8 }}>
                    <button disabled={actioning === item.id} onClick={() => requeue(item.id)}>Requeue</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

    </div>
  );
}
