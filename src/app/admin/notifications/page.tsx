import React from "react";
import NotificationsAdmin from "@/components/admin/NotificationsAdmin";
import { validateAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const metadata = {
  title: "Admin - Notifications"
};

export default async function AdminNotificationsPage() {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return (
    <main>
      <NotificationsAdmin />
    </main>
  );
}
