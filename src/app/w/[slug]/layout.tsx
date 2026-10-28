'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopNav } from '@/components/navigation/TopNav';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { QuickCreateModal } from '@/components/navigation/QuickCreateModal';
import { X } from 'lucide-react';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Auto-collapse sidebar on tablet viewports (<1024px)
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

