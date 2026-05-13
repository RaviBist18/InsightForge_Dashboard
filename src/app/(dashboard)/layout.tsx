import { DashboardShell } from "@/components/layout/DashboardShell";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  );
}