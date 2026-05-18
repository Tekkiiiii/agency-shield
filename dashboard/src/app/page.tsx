"use client";

import { GovernanceProvider } from "@/lib/governance/store";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function Home() {
  return (
    <GovernanceProvider>
      <DashboardShell />
    </GovernanceProvider>
  );
}
