// src/context/WorkspaceContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Tab = "pulse" | "archives" | "forge" | "entities" | "customizer";

interface WorkspaceContextType {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    mrr: number;
    setMrr: (v: number) => void;
    churn: number;
    setChurn: (v: number) => void;
    entityCount: number;
    setEntityCount: (v: number) => void;
    snapshotCount: number;
    setSnapshotCount: (v: number) => void;
    mrrTrend: number;
    setMrrTrend: (v: number) => void;
    isWorkspacePage: boolean;
    setIsWorkspacePage: (v: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState<Tab>("pulse");
    const [mrr, setMrr] = useState(0);
    const [churn, setChurn] = useState(0);
    const [entityCount, setEntityCount] = useState(0);
    const [snapshotCount, setSnapshotCount] = useState(0);
    const [mrrTrend, setMrrTrend] = useState(0);
    const [isWorkspacePage, setIsWorkspacePage] = useState(false);

    return (
        <WorkspaceContext.Provider value={{
            activeTab, setActiveTab,
            mrr, setMrr,
            churn, setChurn,
            entityCount, setEntityCount,
            snapshotCount, setSnapshotCount,
            mrrTrend, setMrrTrend,
            isWorkspacePage, setIsWorkspacePage,
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
    return ctx;
}