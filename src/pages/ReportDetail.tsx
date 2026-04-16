import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReport, useCalculateReport, useApproveReport } from '@/hooks/use-reports';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  DollarSign,
  Zap,
  Clock,
  TrendingDown,
  Lightbulb,
  Package,
} from 'lucide-react';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const reportId = id ? Number(id) : undefined;

  const { data, isLoading } = useReport(reportId);
  const calculateMutation = useCalculateReport();
  const approveMutation = useApproveReport();

  if (isLoading) {
    return (
      <DashboardLayout title="Report">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Report Not Found">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Report not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { report, products, created_by } = data;

  const handleCalculate = () => {
    if (reportId) calculateMutation.mutate(reportId);
  };

  const handleApprove = () => {
    if (reportId && confirm('Are you sure you want to approve this report?')) {
      approveMutation.mutate(reportId);
    }
  };

  const headerActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCalculate}
        disabled={calculateMutation.isPending}
      >
        <Calculator className="h-4 w-4 mr-2" />
        {calculateMutation.isPending ? 'Calculating...' : 'Calculate'}
      </Button>
      {isAdmin && !report.approved && (
        <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
          <CheckCircle className="h-4 w-4 mr-2" />
          {approveMutation.isPending ? 'Approving...' : 'Approve'}
        </Button>
      )}
    </>
  );

  return (
    <DashboardLayout title={report.proposal_name || 'Report'} actions={headerActions}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Report Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-medium">#{report.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proposal Name</span>
                <span className="font-medium">{report.proposal_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="text-xs">
                  {report.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved</span>
                <Badge variant={report.approved ? 'default' : 'secondary'} className="text-xs">
                  {report.approved ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span>{report.active ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bidding</span>
                <span>{report.bidding ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created By</span>
                <span>
                  {created_by.first_name} {created_by.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created At</span>
                <span>{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
              {report.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p>{report.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculated Values */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Calculated Values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <DollarSign className="h-3.5 w-3.5" />
                    System Price
                  </div>
                  <p className="font-semibold text-lg">
                    {report.system_price ? `$${report.system_price}` : '--'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Lightbulb className="h-3.5 w-3.5" />
                    LED Price
                  </div>
                  <p className="font-semibold text-lg">
                    {report.led_price ? `$${report.led_price}` : '--'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    Payback
                  </div>
                  <p className="font-semibold text-lg">
                    {report.payback ? `${report.payback} yrs` : '--'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <TrendingDown className="h-3.5 w-3.5" />
                    kW Reduced
                  </div>
                  <p className="font-semibold text-lg">
                    {report.kwreduced ? `${report.kwreduced} kW` : '--'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Zap className="h-3.5 w-3.5" />
                    Cost/Year
                  </div>
                  <p className="font-semibold text-lg">
                    {report.cost_year ? `$${report.cost_year}` : '--'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Added CRI
                  </div>
                  <p className="font-semibold text-lg">{report.added_cri ?? '--'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    Added Lumens
                  </div>
                  <p className="font-semibold text-lg">{report.added_lumens ?? '--'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    ETA Days
                  </div>
                  <p className="font-semibold text-lg">{report.etadays ?? '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Rebates</p>
                <p className="font-medium">{report.rebates ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Shipping</p>
                <p className="font-medium">{report.shipping ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tax</p>
                <p className="font-medium">{report.tax ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sensors</p>
                <p className="font-medium">{report.sensors ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Color Tunable</p>
                <p className="font-medium">{report.color_tunable ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Light Count Waiver</p>
                <p className="font-medium">{report.light_count_waiver ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lumen Increase/sqft</p>
                <p className="font-medium">{report.lumen_increase_sq_ft ?? '--'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lumen Increase/fixture</p>
                <p className="font-medium">{report.lumen_increase_fixture ?? '--'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No products associated with this report.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Airtable Record
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Column Name
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">#{product.id}</td>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {product.airtable_record}
                        </td>
                        <td className="py-2 pr-4">{product.airtable_colum_name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(product.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
