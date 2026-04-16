import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { useEstimates } from "@/hooks/use-estimates";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EstimateSU } from "@/types/database";

const tabs = [
  "Estimates",
  "Orders",
  "Shipping",
  "Invoices",
  "Receipts",
  "Fulfilled",
  "Archived",
];

function filterByTab(rows: EstimateSU[], tab: string): EstimateSU[] {
  switch (tab) {
    case "Estimates":
      return rows.filter((r) => !r.is_order && !r.archived);
    case "Orders":
      return rows.filter((r) => r.is_order && !r.is_shipping && !r.archived);
    case "Shipping":
      return rows.filter(
        (r) => r.is_order && r.is_shipping && !r.is_invoice && !r.archived
      );
    case "Invoices":
      return rows.filter(
        (r) => r.is_order && r.is_invoice && !r.is_receipt && !r.archived
      );
    case "Receipts":
      return rows.filter(
        (r) => r.is_order && r.is_receipt && !r.marked_fulfilled && !r.archived
      );
    case "Fulfilled":
      return rows.filter(
        (r) => r.is_order && r.marked_fulfilled && !r.archived
      );
    case "Archived":
      return rows.filter((r) => r.archived);
    default:
      return rows;
  }
}

export default function OrdersSuppliers() {
  const [activeTab, setActiveTab] = useState("Estimates");
  const navigate = useNavigate();
  const { page, pageSize, nextPage, prevPage } = usePagination(20);

  const { data, isLoading } = useEstimates({
    tableType: "estimate",
    page,
    pageSize,
  });

  const allRows = (data?.rows ?? []) as EstimateSU[];
  const filteredRows = useMemo(
    () => filterByTab(allRows, activeTab),
    [allRows, activeTab]
  );
  const totalPages = Math.max(1, Math.ceil((data?.total_count ?? 0) / pageSize));

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
        {isLoading ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              No active {activeTab.toLowerCase()} at this time - check back
              later!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Reference
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Order UID
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 text-foreground">
                        {item.reference || `#${item.id}`}
                      </td>
                      <td className="py-3 text-foreground">
                        {item.order_uid || "-"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {item.su_approved ? "Approved" : "Pending"}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/orders/suppliers/${item.id}`)
                          }
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
