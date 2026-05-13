import { Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface HeaderProps {
  title: React.ReactNode;
  onMenuClick: () => void;
  showSearch?: boolean;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuClick, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="h-14 bg-header text-header-foreground flex items-center justify-between px-4 shadow-md">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-header-foreground hover:bg-header-foreground/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        {actions}
        <NotificationBell />
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-header-foreground/60" />
            <Input
              placeholder="Search"
              className="w-48 pl-9 bg-header-foreground/10 border-header-foreground/20 text-header-foreground placeholder:text-header-foreground/60 focus:bg-header-foreground/20"
            />
          </div>
        )}
      </div>
    </header>
  );
}
