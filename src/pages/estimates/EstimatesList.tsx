import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEstimates } from '@/hooks/use-estimates';
import { useAuth } from '@/hooks/useAuth';
import type { EstimateTableType, EstimateSU, EstimateREU } from '@/types/database';
import { Plus, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface EstimatesListProps {
  tableType: EstimateTableType;
}

type TabKey = 'estimates' | 'orders' | 'shipping' | 'invoiced' | 'fulfilled' | 'archived';

const TAB_FILTERS: Record<TabKey, { isOrder?: boolean; archived?: boolean }> = {
  estimates: { isOrder: false, archived: false },
  orders: { isOrder: true, archived: false },
  shipping: { isOrder: true, archived: false },
  invoiced: { isOrder: true, archived: false },
  fulfilled: { isOrder: true, archived: false },
  archived: { archived: true },
};

export default function EstimatesList({ tableType }: EstimatesListProps) {
  const navigate = useNavigate();
  const { companyId, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('estimates');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const tabFilters = TAB_FILTERS[activeTab];

  const { data, isLoading } = useEstimates({
    tableType,
    companyId: !isAdmin ? (companyId ?? undefined) : undefined,
    isOrder: tabFilters.isOrder,
    archived: tabFilters.archived,
    page,
    pageSize,
  });

  const estimates = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isSU = tableType === 'estimate';
  const basePath = isSU ? '/orders/suppliers' : '/orders/real-estate';

  const getEstimateReference = (est: EstimateSU | EstimateREU): string => {
    return est.reference ?? `#${est.id}`;
  };

  const getEstimateStatus = (est: EstimateSU | EstimateREU): string => {
    if ('archived' in est && est.archived) return 'archived';
    if ('marked_fulfilled' in est && est.marked_fulfilled) return 'fulfilled';
    if ('is_receipt' in est && est.is_receipt) return 'receipt';
    if ('is_invoice' in est && est.is_invoice) return 'invoice';
    if ('is_shipping' in est && est.is_shipping) return 'shipping';
    if ('is_order' in est && est.is_order) return 'order';
    if ('is_estimate' in est && est.is_estimate) return 'estimate';
    return 'created';
  };

  const statusColors: Record<string, string> = {
    created: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    estimate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    order: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    shipping: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    invoice: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    receipt: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    archived: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isSU ? 'Supplier' : 'Real Estate'} Estimates & Orders
        </h2>
        <Button size="sm" onClick={() => navigate(`${basePath}/create`)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Estimate
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as TabKey);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="invoiced">Invoiced</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : estimates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No {activeTab} found</p>
              <p className="text-sm mt-1">
                Items will appear here when they reach this stage.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {estimates.map((est) => {
                const status = getEstimateStatus(est);
                return (
                  <Card
                    key={est.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`${basePath}/${est.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {getEstimateReference(est)}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs capitalize ${statusColors[status] ?? ''}`}
                            >
                              {status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>ID: #{est.id}</span>
                            {est.order_uid && <span>Order: {est.order_uid}</span>}
                            {est.created_at && (
                              <span>
                                Created: {new Date(est.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {est.company_id && <p>Company #{est.company_id}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
