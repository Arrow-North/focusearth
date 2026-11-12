import { useNavigate } from "react-router-dom";
import { ChevronDown, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATALOGUE_CATEGORIES } from "@/lib/catalogues";
import { useCategoryCounts } from "@/hooks/use-products";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/roles";
import { formatDate } from "@/lib/formatters";

export default function Catalogues() {
  const navigate = useNavigate();
  const { userType } = useAuth();
  const { data: categoryCounts } = useCategoryCounts();
  const isAdminUser = isAdmin(userType);

  const now = new Date();
  const updatedAtStr = formatDate(now.toISOString()) || now.toLocaleString();

  return (
    <DashboardLayout
      title="Catalogues"
      actions={
        isAdminUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Import</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userType === 'SUPERADMIN' && <DropdownMenuItem
                className="flex-col items-start gap-0.5"
                onClick={() => navigate("/catalogues/import")}
              >
                <span className="font-medium">Supplier catalogue</span>
                <span className="text-xs text-muted-foreground">
                  Save products, review duplicates, and choose files from public
                  Dropbox links. A product image is required.
                </span>
              </DropdownMenuItem>}
              <DropdownMenuItem
                className="flex-col items-start gap-0.5"
                onClick={() => navigate("/catalogues/import/products")}
              >
                <span className="font-medium">Resolve assets to CSV</span>
                <span className="text-xs text-muted-foreground">
                  CSV or Excel for one company and luminaire type. Mirrors
                  images and spec sheets to storage and returns a CSV.
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATALOGUE_CATEGORIES.map((item) => {
          const n = categoryCounts?.[item.slug] ?? 0;
          const count =
            item.slug === "companies"
              ? "Companies"
              : `${n} Product${n !== 1 ? "s" : ""}`;

          return (
            <div
              key={item.id}
              onClick={() =>
                item.slug === "companies"
                  ? navigate("/companies")
                  : navigate(`/catalogues/${item.slug}`)
              }
              className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <item.icon
                className="h-10 w-10 text-foreground mb-4"
                strokeWidth={1.5}
              />
              <h3 className="font-semibold text-foreground mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">{count}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Updated On: {updatedAtStr}
              </p>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
