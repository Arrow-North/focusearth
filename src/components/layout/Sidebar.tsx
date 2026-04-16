import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ShoppingCart, BookOpen, Users, Globe, X, LogOut, ChevronDown, Pencil, FolderOpen, BarChart3, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin, getUserTypeColor, USER_TYPE_LABELS, canAccessAnalytics } from "@/lib/roles";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const orderSubItems = [
  { to: "/orders/suppliers", label: "Suppliers", color: "bg-status-yellow" },
  { to: "/orders/real-estate", label: "Real Estate", color: "bg-status-purple" },
];

const catalogueSubItems = [
  { to: "/catalogues", label: "Browse", color: "bg-status-green", exact: true },
  { to: "/catalogues/import", label: "Import", color: "bg-status-teal", adminOnly: true },
];

const colorMap: Record<string, string> = {
  yellow: "bg-status-yellow",
  purple: "bg-status-purple",
  teal: "bg-status-teal",
  blue: "bg-status-blue",
  pink: "bg-status-pink",
  orange: "bg-status-orange",
  green: "bg-status-green",
  brown: "bg-status-brown",
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, userType, signOut } = useAuth();
  const [ordersOpen, setOrdersOpen] = useState(location.pathname.startsWith("/orders"));
  const [cataloguesOpen, setCataloguesOpen] = useState(location.pathname.startsWith("/catalogues"));

  const isOrdersActive = location.pathname.startsWith("/orders");
  const isCataloguesActive = location.pathname.startsWith("/catalogues");
  const isAdminUser = isAdmin(userType);
  const showAnalytics = canAccessAnalytics(userType);

  const displayName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email
    : 'User';

  const initials = profile
    ? `${(profile.first_name ?? '')[0] ?? ''}${(profile.last_name ?? '')[0] ?? ''}`.toUpperCase()
    : 'U';

  const avatarColor = colorMap[getUserTypeColor(userType)] || 'bg-status-pink';

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transition-[transform] duration-300 ease-in-out flex flex-col shrink-0",
          "lg:sticky lg:top-0 lg:h-screen lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full lg:-ml-64"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">F</span>
              <span className="text-accent">O</span>
              <span className="text-primary">CUS</span>
            </span>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">E</span>
              <span className="text-status-yellow">A</span>
              <span className="text-primary">RTH</span>
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Recent Activity */}
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
              )
            }
          >
            <Bell className="h-5 w-5" />
            Recent Activity
          </NavLink>

          {/* Projects */}
          <NavLink
            to="/projects"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
              )
            }
          >
            <FolderOpen className="h-5 w-5" />
            Projects
          </NavLink>

          {/* Orders Dropdown */}
          <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isOrdersActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", ordersOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {orderSubItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <div className={cn("w-2 h-2 rounded-full", item.color)} />
                  {item.label}
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Catalogues Dropdown */}
          <Collapsible open={cataloguesOpen} onOpenChange={setCataloguesOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isCataloguesActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5" />
                  Catalogues
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", cataloguesOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {catalogueSubItems
                .filter(item => !item.adminOnly || isAdminUser)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                      )
                    }
                  >
                    {item.label === "Import" ? (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <div className={cn("w-2 h-2 rounded-full", item.color)} />
                    )}
                    {item.label}
                  </NavLink>
                ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Users (admin only) */}
          {isAdminUser && (
            <NavLink
              to="/users"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <Users className="h-5 w-5" />
              Users
            </NavLink>
          )}

          {/* Companies */}
          <NavLink
            to="/companies"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
              )
            }
          >
            <Globe className="h-5 w-5" />
            Companies
          </NavLink>

          {/* Data (admin only) */}
          {showAnalytics && (
            <NavLink
              to="/analytics"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <BarChart3 className="h-5 w-5" />
              Data
            </NavLink>
          )}

          <div className="my-4 border-t border-sidebar-border" />

          {/* Log Out */}
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </nav>

        {/* User Info Card */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", avatarColor)}>
              <span className="text-sm font-semibold text-primary-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              {userType && (
                <p className="text-xs text-muted-foreground">{USER_TYPE_LABELS[userType]}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => { navigate('/profile'); onClose(); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
