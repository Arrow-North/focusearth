import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";

const tabs = [
  "Estimates",
  "Orders",
  "Shipping",
  "Invoices",
  "Receipts",
  "Fulfilled",
  "Archived",
];

export default function Orders() {
  const [activeTab, setActiveTab] = useState("Estimates");

  return (
    <DashboardLayout title="Orders/Supplier/Estimates">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative",
                  activeTab === tab
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-muted rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            No active {activeTab.toLowerCase()} at this time - check back later!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
