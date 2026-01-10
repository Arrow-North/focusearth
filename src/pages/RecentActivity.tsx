import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { User, ExternalLink } from "lucide-react";

const notifications = [
  { id: 1, user: "Pete Musser", action: "submitted Focus Earth Supplier Corporation for review and authorization", date: "Jan 09, 2026", companyId: "1" },
  { id: 2, user: "Focus Supplier", action: "submitted LED LAMPS Company for review and authorization", date: "Dec 11, 2025", companyId: "2" },
  { id: 3, user: "Narek Simonyan", action: "suggested edits to Real Estate Company for review and authorization", date: "Dec 09, 2025", companyId: "1" },
  { id: 4, user: "Pete REU Musser", action: "suggested edits to Focus Earth Real Estate for review and authorization", date: "Dec 05, 2025", companyId: "1" },
  { id: 5, user: "Narek Simonyan", action: "suggested edits to Real Estate Company for review and authorization", date: "Dec 04, 2025", companyId: "1" },
  { id: 6, user: "Narek Simonyan", action: "suggested edits to Real Estate Company for review and authorization", date: "Dec 04, 2025", companyId: "1" },
];

const recentActivity = [
  { id: 1, where: "Energy Portal", who: "ZEBIN LIN", what: "Signed up as a new SU", when: "Dec 30, 2025", color: "yellow" as const },
  { id: 2, where: "Energy Portal", who: "Ben Brown", what: "Signed up as a new REU", when: "Dec 16, 2025", color: "purple" as const },
  { id: 3, where: "Energy Portal", who: "Pete REU Musser", what: "Signed up as a new REU", when: "Dec 03, 2025", color: "purple" as const },
  { id: 4, where: "Energy Portal", who: "Pete SU Musser", what: "Signed up as a new REU", when: "Dec 02, 2025", color: "purple" as const },
  { id: 5, where: "Energy Portal", who: "arman tester", what: "Signed up as a new SU", when: "Nov 25, 2025", color: "yellow" as const },
  { id: 6, where: "Energy Portal", who: "arman tester", what: "Signed up as a new SU", when: "Nov 25, 2025", color: "yellow" as const },
  { id: 7, where: "Energy Portal", who: "Narek Reu", what: "Signed up as a new REU", when: "Nov 13, 2025", color: "pink" as const },
  { id: 8, where: "Energy Portal", who: "Admin Support Focus Earth", what: "Signed up as a new AU", when: "Oct 30, 2025", color: "blue" as const },
];

const colorMap = {
  yellow: "bg-status-yellow",
  purple: "bg-status-purple",
  teal: "bg-status-teal",
  blue: "bg-status-blue",
  pink: "bg-status-pink",
  orange: "bg-status-orange",
  green: "bg-status-green",
  brown: "bg-status-brown",
};

export default function RecentActivity() {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Recent Activity">
      <div className="space-y-8">
        {/* Notifications Section */}
        <section>
          <h2 className="text-xl font-semibold text-accent mb-4">Notifications</h2>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-card rounded-lg p-4 flex items-center justify-between shadow-sm border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{notification.user}</span> {notification.action}.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{notification.date}</span>
                  <Button 
                    size="sm" 
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => navigate(`/companies/${notification.companyId}`)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Company
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity Table */}
        <section>
          <div className="border-t-4 border-status-yellow pt-4">
            <h2 className="text-xl font-semibold text-accent mb-4">Recent Activity</h2>
            
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
              <span>Where</span>
              <span>Who</span>
              <span>What</span>
              <span>When</span>
              <span>How</span>
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-card rounded-lg grid grid-cols-5 gap-4 px-4 py-3 items-center shadow-sm border border-border"
                >
                  <span className="text-sm">{activity.where}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colorMap[activity.color]}`} />
                    <span className="text-sm">{activity.who}</span>
                  </div>
                  <span className="text-sm">{activity.what}</span>
                  <span className="text-sm text-muted-foreground">{activity.when}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit border-status-yellow text-foreground hover:bg-status-yellow/10"
                  >
                    View Profile
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
