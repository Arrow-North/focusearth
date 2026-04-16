import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CATALOGUE_CATEGORIES } from "@/lib/catalogues";
import { useProducts } from "@/hooks/use-products";
import { formatDate } from "@/lib/formatters";

export default function Catalogues() {
  const navigate = useNavigate();
  const { data } = useProducts({ page: 1, pageSize: 1 });
  const totalProducts = data?.total_count ?? 0;

  const now = new Date();
  const updatedAtStr = formatDate(now.toISOString()) || now.toLocaleString();

  return (
    <DashboardLayout title="Catalogues">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATALOGUE_CATEGORIES.map((item) => {
          const count =
            item.slug === "all-products"
              ? `${totalProducts} Product${totalProducts !== 1 ? "s" : ""}`
              : item.slug === "companies"
                ? "Companies"
                : "0 Products";

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
