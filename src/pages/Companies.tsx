import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Plus } from "lucide-react";

const companies = [
  { 
    id: 1, 
    name: "Focus Earth Real Estate", 
    stripe: "purple" as const,
    logo: "🌍",
    hasEmoji: true
  },
  { 
    id: 2, 
    name: "LED LAMPS Company", 
    stripe: "yellow" as const,
    image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=100&h=100&fit=crop",
    hasEmoji: false
  },
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

export default function Companies() {
  const headerActions = (
    <>
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Filter
      </Button>
      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <Plus className="h-4 w-4 mr-2" />
        Add New Company
      </Button>
    </>
  );

  return (
    <DashboardLayout title="Companies" actions={headerActions}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <div
            key={company.id}
            className="bg-card rounded-lg border border-border flex items-center overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Color stripe */}
            <div className={`w-1.5 h-16 ${colorMap[company.stripe]}`} />
            
            <div className="flex items-center gap-3 p-4 flex-1">
              {/* Logo */}
              {company.hasEmoji ? (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-2xl">
                  {company.logo}
                </div>
              ) : (
                <div className="w-10 h-10 rounded overflow-hidden">
                  <img
                    src={company.image}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <span className="font-medium text-foreground">{company.name}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
