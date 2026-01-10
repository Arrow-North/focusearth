import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  title: string;
  children: React.ReactNode;
  showSearch?: boolean;
  actions?: React.ReactNode;
}

export function DashboardLayout({ title, children, showSearch = true, actions }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showSearch={showSearch}
          actions={actions}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
