import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

interface DashboardLayoutProps {
  title: string;
  children: React.ReactNode;
  showSearch?: boolean;
  actions?: React.ReactNode;
}

export function DashboardLayout({ title, children, showSearch = true, actions }: DashboardLayoutProps) {
  const { isOpen, toggle, close } = useSidebar();

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar isOpen={isOpen} onClose={close} />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header
          title={title}
          onMenuClick={toggle}
          showSearch={showSearch}
          actions={actions}
        />

        <main className="flex-1 p-6 overflow-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
