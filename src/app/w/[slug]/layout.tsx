'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopNav } from '@/components/navigation/TopNav';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { QuickCreateModal } from '@/components/navigation/QuickCreateModal';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { X } from 'lucide-react';

// Full-page skeleton shown while workspace data loads
function WorkspaceLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F0F1F3] flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-64 h-screen bg-[#082F1B] flex-col shrink-0">
        <div className="p-4 border-b border-[#14482E]">
          <div className="h-8 w-32 bg-[#0F4A2A] rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 p-3 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-[#0F4A2A] animate-pulse" style={{ opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-white border-b border-[#E5E9E6] flex items-center px-8 gap-4">
          <div className="h-5 w-48 bg-[#E5E9E6] rounded-lg animate-pulse" />
          <div className="flex-1 max-w-md mx-auto h-9 bg-[#F0F1F3] rounded-xl animate-pulse" />
          <div className="h-8 w-20 bg-[#E5E9E6] rounded-xl animate-pulse" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          <div className="h-8 w-64 bg-white rounded-xl animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-white rounded-2xl animate-pulse" />
            <div className="h-64 bg-white rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Inner layout — has access to WorkspaceContext
function WorkspaceLayoutInner({ children }: { children: React.ReactNode }) {
  const { loading } = useWorkspace();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Auto-collapse sidebar on tablet viewports (<1100px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1100) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) return <WorkspaceLoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[#F0F1F3] flex flex-col antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden md:flex"
      />

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-xs flex">
          <div className="relative w-72 max-w-[80%] h-full bg-[#082F1B] shadow-2xl flex flex-col">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#849E8E] hover:text-white bg-[#06351F] border border-[#14482E]"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              className="w-full relative border-none"
            />
          </div>
          <div
            className="flex-1"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area Offset by Sidebar */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        {/* Sticky Top Navigation */}
        <TopNav
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenQuickCreate={() => setQuickCreateOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>

      {/* Global Interactive Overlays */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenQuickCreate={() => setQuickCreateOpen(true)}
      />

      <QuickCreateModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
      />
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
    </WorkspaceProvider>
  );
}
