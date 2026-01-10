import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Infinity, Building2, Lamp, Lightbulb, BatteryCharging, Hourglass, HelpCircle } from "lucide-react";

const catalogueItems = [
  { id: 1, icon: Infinity, title: "All Products", count: "0 Products", updatedAt: "09-01-2026 23:11:55", slug: "all-products" },
  { id: 2, icon: Building2, title: "Companies", count: "3 Companies", updatedAt: "09-01-2026 23:11:55", slug: "companies" },
  { id: 3, icon: Lamp, title: "Fixtures", count: "0 Products", updatedAt: "09-01-2026 23:11:55", slug: "fixtures" },
  { id: 4, icon: Lightbulb, title: "Lamp", count: "0 Products", updatedAt: "09-01-2026 23:11:55", slug: "lamp" },
  { id: 5, icon: BatteryCharging, title: "Power Supply", count: "0 Products", updatedAt: "09-01-2026 23:11:55", slug: "power-supply" },
  { id: 6, icon: Hourglass, title: "Control", count: "0 Products", updatedAt: "09-01-2026 23:11:55", slug: "control" },
  { id: 7, icon: HelpCircle, title: "Accessories", count: "0 Products", updatedAt: "09-01-2026 23:11:55", slug: "accessories" },
];

export default function Catalogues() {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Catalogues">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {catalogueItems.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/catalogues/${item.slug}`)}
            className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <item.icon className="h-10 w-10 text-foreground mb-4" strokeWidth={1.5} />
            <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.count}</p>
            <p className="text-xs text-muted-foreground mt-2">Updated On: {item.updatedAt}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
