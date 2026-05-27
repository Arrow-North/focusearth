import { useState } from "react";
import logoIcon from "@/assets/LogoIconImage.png";
import notificationIcon from "@/assets/icons/notification.svg";
import notificationWhiteIcon from "@/assets/icons/notificationWhite.svg";
import projectsIcon from "@/assets/icons/projects.svg";
import projectsWhiteIcon from "@/assets/icons/projectsWhite.svg";
import ordersIcon from "@/assets/icons/orders.svg";
import ordersWhiteIcon from "@/assets/icons/ordersWhite.svg";
import catalogueIcon from "@/assets/icons/catalogue.svg";
import catalogueWhiteIcon from "@/assets/icons/catalogueWhite.svg";
import usersIcon from "@/assets/icons/users.svg";
import usersWhiteIcon from "@/assets/icons/usersWhite.svg";
import dataIcon from "@/assets/icons/data.svg";
import dataWhiteIcon from "@/assets/icons/dataWhite.svg";
import cloudUploadIcon from "@/assets/icons/cloud-upload.svg";
import cloudUploadWhiteIcon from "@/assets/icons/cloud-uploadWhite.svg";
import contactIcon from "@/assets/icons/contact.svg";
import contactWhiteIcon from "@/assets/icons/contactWhite.svg";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Globe, X, LogOut, ChevronDown, Pencil, Shield } from "lucide-react";
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

  const isOrdersActive = location.pathname.startsWith("/orders");
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
        <div className="fixed inset-0 bg-foreground/20 z-40" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[20rem] bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 ease-in-out flex flex-col shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex justify-between px-6 my-8 border-sidebar-border items-start">
          <img src={logoIcon} alt="Focus Earth" className="h-16 w-auto" />
          <button onClick={onClose} className="text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {/* Recent Activity */}
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <img
                  src={isActive ? notificationWhiteIcon : notificationIcon}
                  alt=""
                  className="h-5 w-5 group-hover:hidden"
                />
                <img
                  src={notificationWhiteIcon}
                  alt=""
                  className="h-5 w-5 hidden group-hover:block"
                />
                Recent Activity
              </>
            )}
          </NavLink>

          {/* Catalogues (Su only - before Projects) */}
          {userType === 'Su' && (
            <NavLink
              to="/catalogues"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                  isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <img src={isActive ? catalogueWhiteIcon : catalogueIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                  <img src={catalogueWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                  Catalogues
                </>
              )}
            </NavLink>
          )}

          {/* Projects */}
          <NavLink
            to="/projects"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <img
                  src={isActive ? projectsWhiteIcon : projectsIcon}
                  alt=""
                  className="h-5 w-5 group-hover:hidden"
                />
                <img
                  src={projectsWhiteIcon}
                  alt=""
                  className="h-5 w-5 hidden group-hover:block"
                />
                Projects
              </>
            )}
          </NavLink>

          {/* Orders - Direct link for Su/Reu/Eu, Dropdown for admins */}
          {userType === 'Su' || userType === 'Reu' || userType === 'Eu' ? (
            <NavLink
              to={userType === 'Su' ? '/orders/suppliers' : '/orders/real-estate'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                  isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <img src={isActive ? ordersWhiteIcon : ordersIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                  <img src={ordersWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                  Orders
                </>
              )}
            </NavLink>
          ) : (
            <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-between w-full px-10 py-3 text-m font-medium transition-colors group",
                    isOrdersActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <img src={isOrdersActive ? ordersWhiteIcon : ordersIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                    <img src={ordersWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                    Orders
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", ordersOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-1 mt-1 mb-2">
                {orderSubItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-10 py-1 text-m transition-colors",
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
          )}

          {/* Catalogues */}
          {userType !== 'Reu' && userType !== 'Su' && (
          <NavLink
            to="/catalogues"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <img src={isActive ? catalogueWhiteIcon : catalogueIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                <img src={catalogueWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                Catalogues
              </>
            )}
          </NavLink>
          )}

          {/* Users (admin only) */}
          {isAdminUser && (
            <NavLink
              to="/users"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                  isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <img src={isActive ? usersWhiteIcon : usersIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                  <img src={usersWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                  Users
                </>
              )}
            </NavLink>
          )}

          {/* Companies */}
          {userType !== 'Reu' && userType !== 'Su' && (
          <NavLink
            to="/companies"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors",
                isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
              )
            }
          >
            <Globe className="h-5 w-5" />
            Companies
          </NavLink>
          )}

          {/* Data (admin only, disabled for super admin) */}
          {showAnalytics && (
            userType === 'SUPERADMIN' ? (
              <div
                className="flex items-center gap-3 px-10 py-3 text-m font-medium text-muted-foreground/50 cursor-not-allowed"
              >
                <img src={dataIcon} alt="" className="h-5 w-5 opacity-50" />
                Data
              </div>
            ) : (
              <NavLink
                to="/analytics"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                    isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <img src={isActive ? dataWhiteIcon : dataIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                    <img src={dataWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                    Data
                  </>
                )}
              </NavLink>
            )
          )}
          {/* Upload & Contact (Reu/Su only) */}
          {(userType === 'Reu' || userType === 'Su') && (
            <>
              <NavLink
                to="/upload"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                    isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <img src={isActive ? cloudUploadWhiteIcon : cloudUploadIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                    <img src={cloudUploadWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                    Upload
                  </>
                )}
              </NavLink>
              <NavLink
                to="/contact"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-10 py-3 text-m font-medium transition-colors group",
                    isActive ? "bg-[#2C628D] text-white" : "text-sidebar-foreground hover:bg-[#2C628D] hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <img src={isActive ? contactWhiteIcon : contactIcon} alt="" className="h-5 w-5 group-hover:hidden" />
                    <img src={contactWhiteIcon} alt="" className="h-5 w-5 hidden group-hover:block" />
                    Contact
                  </>
                )}
              </NavLink>
            </>
          )}

          <div className="my-4 border-t border-sidebar-border" />

          {/* Log Out */}
          <button
            className="flex items-center gap-3 px-10 py-3 text-m font-medium text-sidebar-foreground hover:bg-[#2C628D] hover:text-white transition-colors w-full"
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
              <span className="text-m font-semibold text-primary-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-m font-medium text-foreground truncate">{displayName}</p>
              {/* {userType && (
                <p className="text-xs text-muted-foreground">{USER_TYPE_LABELS[userType]}</p>
              )} */}
            </div>
            {userType === 'SUPERADMIN' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-pink-500 hover:text-pink-600 hover:bg-pink-50 flex-shrink-0"
                onClick={() => { navigate('/admin'); onClose(); }}
                title="Admin Dashboard"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
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
