import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bell, ShoppingCart, BookOpen, Users, Globe, X, LogOut, ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const orderSubItems = [
  { to: "/orders/suppliers", label: "Suppliers", color: "bg-status-yellow" },
  { to: "/orders/real-estate", label: "Real Estate", color: "bg-status-purple" },
];

const navItems = [
  { to: "/", icon: Bell, label: "Recent Activity" },
  { to: "/catalogues", icon: BookOpen, label: "Catalogues" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/companies", icon: Globe, label: "Companies" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [ordersOpen, setOrdersOpen] = useState(
    location.pathname.startsWith("/orders")
  );

  const isOrdersActive = location.pathname.startsWith("/orders");

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Recent Activity */}
          <NavLink
            to="/"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )
            }
          >
            <Bell className="h-5 w-5" />
            Recent Activity
          </NavLink>

          {/* Orders Dropdown */}
          <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isOrdersActive
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    ordersOpen && "rotate-180"
                  )}
                />
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
                      isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <div className={cn("w-2 h-2 rounded-full", item.color)} />
                  {item.label}
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Other nav items */}
          {navItems.slice(1).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}

          {/* Divider */}
          <div className="my-4 border-t border-sidebar-border" />

          {/* Log Out */}
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
            onClick={() => console.log("Logout clicked")}
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </nav>

        {/* User Info Card */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-status-pink flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">C</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Lucas Pham</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
