import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { User, ExternalLink, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotifications, useMarkSeen } from "@/hooks/use-notifications";
import { useActivities } from "@/hooks/use-activities";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate, formatActivityAction } from "@/lib/formatters";
import { getUserTypeColor } from "@/lib/roles";
import { getActivityButton } from "@/lib/activity-actions";
import type { UserType } from "@/types/database";

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

const borderColorMap: Record<string, string> = {
  yellow: "border-status-yellow",
  purple: "border-status-purple",
  teal: "border-status-teal",
  blue: "border-status-blue",
  pink: "border-status-pink",
  orange: "border-status-orange",
  green: "border-status-green",
  brown: "border-status-brown",
};

const hoverBgMap: Record<string, string> = {
  yellow: "hover:bg-status-yellow/10",
  purple: "hover:bg-status-purple/10",
  teal: "hover:bg-status-teal/10",
  blue: "hover:bg-status-blue/10",
  pink: "hover:bg-status-pink/10",
  orange: "hover:bg-status-orange/10",
  green: "hover:bg-status-green/10",
  brown: "hover:bg-status-brown/10",
};

const LoadingSpinner = () => (
  <div className="py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
  </div>
);

export default function RecentActivity() {
  const navigate = useNavigate();

  const notifPagination = usePagination(5);
  const activityPagination = usePagination(5);

  const { data: notificationsData, isLoading: notifLoading } = useNotifications(notifPagination.page, notifPagination.pageSize, true);
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities({
    page: activityPagination.page,
    pageSize: activityPagination.pageSize,
  });
  const markSeen = useMarkSeen();

  const notifications = notificationsData?.rows ?? [];
  const notifTotalCount = notificationsData?.total_count ?? 0;
  const notifTotalPages = Math.ceil(notifTotalCount / (notificationsData?.page_size ?? 20));

  const activities = activitiesData?.rows ?? [];
  const activityTotalCount = activitiesData?.total_count ?? 0;
  const activityTotalPages = Math.ceil(activityTotalCount / (activitiesData?.page_size ?? 20));

  return (
    <DashboardLayout title="Recent Activity">
      <div className="space-y-8">
        {/* Notifications Section */}
        <section>
          <h2 className="text-xl font-semibold text-accent mb-4">Notifications</h2>

          {notifLoading ? (
            <LoadingSpinner />
          ) : notifications.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center text-muted-foreground border border-border">
              No notifications
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-card rounded-lg p-4 flex items-center justify-between shadow-sm border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-accent" />
                      </div>
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{n.sender_name}</span> {n.description}.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{formatDate(n.created_at)}</span>
                      {!n.seen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markSeen.mutate([n.id])}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Seen
                        </Button>
                      )}
                      {n.company_id && (
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          onClick={() => navigate(`/companies/${n.company_id}`)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Company
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notifications Pagination */}
              {notifTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notifPagination.page <= 1}
                    onClick={notifPagination.prevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {notifPagination.page} of {notifTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notifPagination.page >= notifTotalPages}
                    onClick={notifPagination.nextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Recent Activity Table */}
        <section>
          <div className="border-t-4 border-status-yellow pt-4">
            <h2 className="text-xl font-semibold text-accent mb-4">Recent Activity</h2>

            {activitiesLoading ? (
              <LoadingSpinner />
            ) : activities.length === 0 ? (
              <div className="bg-card rounded-lg p-8 text-center text-muted-foreground border border-border">
                No recent activity
              </div>
            ) : (
              <>
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
                  {activities.map((a) => {
                    const color = getUserTypeColor(a.user_type as UserType);
                    const colorClass = colorMap[color] ?? "bg-status-yellow";
                    const btn = getActivityButton(a);
                    const route = btn.getRoute(a);
                    const btnBorder = borderColorMap[btn.color] ?? "border-status-yellow";
                    const btnHover = hoverBgMap[btn.color] ?? "hover:bg-status-yellow/10";

                    return (
                      <div
                        key={a.id}
                        className="bg-card rounded-lg grid grid-cols-5 gap-4 px-4 py-3 items-center shadow-sm border border-border"
                      >
                        <span className="text-sm">{a.project_title || "Energy Portal"}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                          <span className="text-sm">{a.user_name}</span>
                        </div>
                        <span className="text-sm">{formatActivityAction(a.action)}</span>
                        <span className="text-sm text-muted-foreground">{formatDate(a.created_at)}</span>
                        {route ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-fit ${btnBorder} text-foreground ${btnHover}`}
                            onClick={() => navigate(route)}
                          >
                            {btn.label}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Activity Pagination */}
                {activityTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activityPagination.page <= 1}
                      onClick={activityPagination.prevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {activityPagination.page} of {activityTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activityPagination.page >= activityTotalPages}
                      onClick={activityPagination.nextPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
