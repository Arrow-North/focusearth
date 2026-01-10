import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Plus } from "lucide-react";

const users = [
  { id: 1, name: "ZEBIN LIN", initials: "ZL", color: "brown" as const, stripe: "yellow" as const },
  { id: 2, name: "Ben Brown", initials: "BB", color: "purple" as const, stripe: "purple" as const },
  { id: 3, name: "Pete REU Musser", initials: null, avatar: true, stripe: "purple" as const },
  { id: 4, name: "Arman Tester", initials: "AT", color: "teal" as const, stripe: "yellow" as const },
  { id: 5, name: "Narek Reu", initials: "NR", color: "teal" as const, stripe: "purple" as const },
  { id: 6, name: "Admin Support Focus ...", initials: null, avatar: true, stripe: "purple" as const },
  { id: 7, name: "Michael Haeflich", initials: "MH", color: "teal" as const, stripe: "yellow" as const },
  { id: 8, name: "Test Test", initials: "TT", color: "purple" as const, stripe: "purple" as const },
  { id: 9, name: "Test Test", initials: "TT", color: "teal" as const, stripe: "purple" as const },
  { id: 10, name: "Dong Ke", initials: "DK", color: "yellow" as const, stripe: "yellow" as const },
  { id: 11, name: "Jenya Smirnov", initials: "JS", color: "teal" as const, stripe: "purple" as const },
  { id: 12, name: "Jneya Smirnbov", initials: "JS", color: "green" as const, stripe: "purple" as const },
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

export default function UsersPage() {
  const headerActions = (
    <>
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Filter
      </Button>
      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <Plus className="h-4 w-4 mr-2" />
        Add New User
      </Button>
    </>
  );

  return (
    <DashboardLayout title="Users" actions={headerActions}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-card rounded-lg border border-border flex items-center overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Color stripe */}
            <div className={`w-1.5 h-16 ${colorMap[user.stripe]}`} />
            
            <div className="flex items-center gap-3 p-4 flex-1">
              {/* Avatar */}
              {user.avatar ? (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                    alt={user.name}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-full ${colorMap[user.color!]} flex items-center justify-center`}>
                  <span className="text-sm font-medium text-primary-foreground">{user.initials}</span>
                </div>
              )}
              
              <span className="font-medium text-foreground">{user.name}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
