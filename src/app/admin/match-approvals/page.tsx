import React from "react";
import MatchApprovalsAdmin from "@/components/admin/MatchApprovalsAdmin";
import { validateAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const metadata = { title: "Admin - Match Approvals" };

export default async function Page() {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  return (
    <main>
      <MatchApprovalsAdmin />
    </main>
  );
}
