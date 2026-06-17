import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import {
  useEstimatesREUList,
  useUnarchiveEstimate,
} from "@/hooks/use-estimates";
import type { EstimateREUListItem } from "@/hooks/use-estimates";
import { usePagination } from "@/hooks/use-pagination";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  RotateCcw,
} from "lucide-react";
import { EstimatePDFCapture } from "@/components/estimates/EstimatePDFCapture";

const tabs = [
  "Estimates",
  "Orders",
  "Shipping",
  "Invoices",
  "Receipts",
  "Fulfilled",
  "Archived",
];

function filterByTab(
  rows: EstimateREUListItem[],
  tab: string
): EstimateREUListItem[] {
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
      return rows.filter((r) => !!r.archived);
    default:
      return rows;
  }
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatProject(
  project: { title: string; state: string | null } | null | undefined
): string {
  if (!project) return "-";
  return project.state
    ? `${project.title} (${project.state})`
    : project.title;
}

const TAB_TO_STAGE: Record<string, string> = {
  Estimates: "estimate", Orders: "order", Shipping: "shipping",
  Invoices: "invoice", Receipts: "receipt",
};

export default function OrdersRealEstate() {
  const [activeTab, setActiveTab] = useState("Estimates");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [pendingDownload, setPendingDownload] = useState<{ id: number; stage: string } | null>(null);
  const navigate = useNavigate();
  const { page, pageSize, nextPage, prevPage } = usePagination(20);
  const unarchiveMutation = useUnarchiveEstimate();

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const { data, isLoading } = useEstimatesREUList(page, pageSize);

  const allRows = data?.rows ?? [];
  const filteredRows = useMemo(
    () => filterByTab(allRows, activeTab),
    [allRows, activeTab]
  );
  const totalPages = Math.max(
    1,
    Math.ceil((data?.total_count ?? 0) / pageSize)
  );

  return (
    <DashboardLayout
      title={
        <span>
          <span>Orders</span>
          <span className="mx-2">/</span>
          <Link to="/orders/real-estate" className="hover:underline">
            Real Estate
          </Link>
          <span className="mx-2">/</span>
          <span>Estimates</span>
        </span>
      }
      mainClassName={"!p-0"}
    >
      <div>
        {/* Tabs */}
        <div className="border-b border-border pt-10">
          <nav className="flex gap-8 justify-between">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-3 font-bold transition-opacity relative text-[#619c48] w-full"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
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
              No active {activeTab.toLowerCase()} at this time — check back
              later!
            </p>
          </div>
        ) : (
          <div className="space-y-3 bg-[#f5f5f5] !p-[2.5rem]">
            {/* Column headers */}
            {activeTab === "Archived" ? (
              <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1.5fr_130px] items-center px-4 gap-4">
                <span className="font-semibold text-foreground">Reference</span>
                <span className="font-semibold text-foreground">Status</span>
                <span className="font-semibold text-foreground">Archived By</span>
                <span className="font-semibold text-foreground">Archived Date</span>
                <span className="font-semibold text-foreground">Project</span>
                <span className="font-semibold text-foreground">Mark As Active</span>
              </div>
            ) : activeTab === "Fulfilled" ? (
              <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_1fr_150px_36px] items-center px-4 gap-4">
                <span className="font-semibold text-foreground">Reference</span>
                <span className="font-semibold text-foreground">Company</span>
                <span className="font-semibold text-foreground">Project</span>
                <span className="font-semibold text-foreground">Fulfilled By</span>
                <span className="font-semibold text-foreground">Fulfillment date</span>
                <span className="font-semibold text-foreground" />
                <span />
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_160px] items-center px-4 gap-4">
                <span className="font-semibold text-foreground">Reference</span>
                <span className="font-semibold text-foreground">Company</span>
                <span className="font-semibold text-foreground">Date</span>
                <span className="font-semibold text-foreground">Project</span>
                <span className="font-semibold text-foreground text-right">Download</span>
              </div>
            )}

            {/* Card rows */}
            {filteredRows.map((item) => {
              const archivedByName = item.archived_by
                ? `${item.archived_by.first_name ?? ""} ${item.archived_by.last_name ?? ""}`.trim() || "—"
                : "—";

              const fulfilledByName = item.fulfilled_by
                ? `${item.fulfilled_by.first_name ?? ""} ${item.fulfilled_by.last_name ?? ""}`.trim() || "—"
                : "—";

              const statusLabel = item.marked_fulfilled
                ? "Fulfilled"
                : item.is_receipt
                ? "Receipt"
                : item.is_invoice
                ? "Invoice"
                : item.is_shipping
                ? "Shipping"
                : item.is_order
                ? "Order"
                : "Estimate";

              if (activeTab === "Fulfilled") {
                const isExpanded = expandedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="border-2 border-[#a9a9a9] rounded-lg overflow-hidden"
                  >
                    {/* Main row */}
                    <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_1fr_150px_36px] items-center px-4 py-4 bg-card gap-4">
                      <button
                        className="text-sm text-foreground underline text-left truncate"
                        onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                      >
                        {item.reference || `#${item.id}`}
                      </button>

                      <span
                        className="text-sm truncate cursor-pointer hover:underline"
                        onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                      >
                        {item.company?.name ?? "—"}
                      </span>

                      <span
                        className="text-sm truncate cursor-pointer hover:underline"
                        onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                      >
                        {formatProject(item.report?.project)}
                      </span>

                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-sm truncate">{fulfilledByName}</span>
                      </div>

                      <span className="text-sm text-foreground">
                        {formatDate(item.marked_fulfilled_date_created)}
                      </span>

                      <Button
                        className="bg-[#2c628d] hover:bg-[#2c628d]/90 text-white text-xs gap-2 w-full h-[30px]"
                        onClick={() => setPendingDownload({ id: item.id, stage: "estimate" })}
                        disabled={pendingDownload?.id === item.id}
                      >
                        <CloudDownload className="h-3.5 w-3.5" />
                        {pendingDownload?.id === item.id ? "..." : "Download All"}
                      </Button>

                      <button
                        className="flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpand(item.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Accordion sub-rows — one per stage */}
                    {isExpanded && (
                      <>
                        {(["Estimate", ...(item.is_order ? ["Order"] : []), ...(item.is_shipping ? ["Shipping"] : []), ...(item.is_invoice ? ["Invoice"] : []), ...(item.is_receipt ? ["Receipt"] : [])] as string[]).map((stage) => (
                          <div key={stage} className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_1fr_150px_36px] items-center px-4 py-3 bg-card gap-4 border-t border-border">
                            <span className="text-sm font-medium truncate">{stage}</span>
                            <span className="text-sm truncate">{item.company?.name ?? "—"}</span>
                            <span className="text-sm truncate">{formatProject(item.report?.project)}</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="text-sm truncate">{fulfilledByName}</span>
                            </div>
                            <span className="text-sm text-foreground">{formatDate(item.marked_fulfilled_date_created)}</span>
                            <div className="flex justify-start">
                              <Button
                                size="icon"
                                className="h-[30px] w-full bg-[#2c628d] hover:bg-[#2c628d]/90 text-white"
                                onClick={() => setPendingDownload({ id: item.id, stage: stage.toLowerCase() })}
                                disabled={pendingDownload?.id === item.id}
                              >
                                <CloudDownload className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <span />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              }

              return activeTab === "Archived" ? (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1.5fr_130px] items-center px-4 py-4 border-2 border-[#a9a9a9] rounded-lg bg-card gap-4"
                >
                  <button
                    className="text-sm text-foreground underline text-left truncate"
                    onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                  >
                    {item.reference || `#${item.id}`}
                  </button>

                  <span className="text-sm text-foreground">{statusLabel}</span>

                  <span className="text-sm text-foreground truncate">
                    {archivedByName}
                  </span>

                  <span className="text-sm text-foreground">
                    {formatShortDate(item.archived_date_created)}
                  </span>

                  <span className="text-sm text-foreground truncate">
                    {formatProject(item.report?.project)}
                  </span>

                  <Button
                    className="bg-[#2c628d] hover:bg-[#2c628d]/90 text-white text-xs whitespace-nowrap h-[30px] w-full gap-2 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      unarchiveMutation.mutate({
                        estimateId: item.id,
                        tableType: "estimate_reu",
                      });
                    }}
                    disabled={unarchiveMutation.isPending}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Activate
                  </Button>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_160px] items-center px-4 py-4 border-2 border-[#a9a9a9] rounded-lg bg-card gap-4"
                >
                  <button
                    className="text-sm text-foreground underline text-left truncate"
                    onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                  >
                    {item.reference || `#${item.id}`}
                  </button>

                  <span
                    className="text-sm truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                  >
                    {item.company?.name ?? "—"}
                  </span>

                  <span className="text-sm text-foreground">
                    {formatShortDate(item.created_at)}
                  </span>

                  <span
                    className="text-sm text-foreground truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/orders/real-estate/${item.id}`)}
                  >
                    {formatProject(item.report?.project)}
                  </span>

                  <div className="flex items-center justify-end">
                    <Button
                      size="icon"
                      className="h-[30px] w-full max-w-[90px] bg-[#2c628d] hover:bg-primary/90 text-primary-foreground rounded"
                      onClick={() => setPendingDownload({ id: item.id, stage: TAB_TO_STAGE[activeTab] ?? "estimate" })}
                      disabled={pendingDownload?.id === item.id}
                      title="Download PDF"
                    >
                      <CloudDownload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

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

      {pendingDownload && (
        <EstimatePDFCapture
          estimateId={pendingDownload.id}
          tableType="estimate_reu"
          stage={pendingDownload.stage}
          onDone={() => setPendingDownload(null)}
        />
      )}
    </DashboardLayout>
  );
}
