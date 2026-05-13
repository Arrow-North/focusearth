import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, ChevronLeft, ChevronRight, Search, ImageIcon } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { usePagination } from "@/hooks/use-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { getCatalogueName } from "@/lib/catalogues";

export default function CatalogueDetail() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { page, pageSize, nextPage, prevPage, resetPage } = usePagination(20);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const catalogueName = getCatalogueName(category);

  // Reset to page 1 when search changes
  useEffect(() => {
    resetPage();
  }, [debouncedSearch, resetPage]);

  const { data, isLoading } = useProducts({
    category: category,
    search: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const products = data?.rows ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((data?.total_count ?? 0) / pageSize)
  );

  const headerActions = (
    <Button
      className="bg-accent hover:bg-accent/90 text-accent-foreground"
      onClick={() => navigate(`/catalogues/${category}/new`)}
    >
      <Plus className="h-4 w-4 mr-2" />
      New {catalogueName.replace(/s$/, "")}
    </Button>
  );

  return (
    <DashboardLayout
      title={
        <span>
          <Link to="/catalogues" className="hover:underline">Catalogues</Link>
          <span className="mx-2">/</span>
          <span>{catalogueName}</span>
        </span>
      }
      actions={headerActions}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/catalogues")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalogues
          </Button>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              {debouncedSearch
                ? `No products matching "${debouncedSearch}".`
                : `No items in this catalogue yet. Click "New ${catalogueName.replace(/s$/, "")}" to add one.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const details = product.details ?? {};
                const displayName =
                  product.airtable_record || `Product #${product.id}`;
                const subtitle =
                  details.manufacturer || details.supplier || product.airtable_colum_name;

                return (
                  <div
                    key={product.id}
                    onClick={() =>
                      navigate(`/catalogues/${category}/${product.id}`)
                    }
                    className="bg-card rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  >
                    <div className="h-36 bg-muted flex items-center justify-center">
                      {details.productImage ? (
                        <img
                          src={details.productImage}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground truncate">
                        {displayName}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({data?.total_count ?? 0} total)
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
