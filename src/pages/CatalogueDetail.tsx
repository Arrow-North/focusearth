import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { CreateProductDialog } from "@/components/catalogues/CreateProductDialog";

const catalogueNames: Record<string, string> = {
  "all-products": "All Products",
  "companies": "Companies",
  "fixtures": "Fixtures",
  "lamp": "Lamp",
  "power-supply": "Power Supply",
  "control": "Control",
  "accessories": "Accessories",
};

// Mock data for products
const mockProducts: Record<string, Array<{ id: number; name: string; description: string; supplier: string }>> = {
  "companies": [
    { id: 1, name: "Focus Earth Supplier Corporation", description: "LED Supplier", supplier: "Focus Earth" },
    { id: 2, name: "LED LAMPS Company", description: "Lamp Manufacturer", supplier: "LED LAMPS" },
    { id: 3, name: "Real Estate Company", description: "Property Management", supplier: "Real Estate" },
  ],
  "fixtures": [],
  "lamp": [],
  "power-supply": [],
  "control": [],
  "accessories": [],
  "all-products": [],
};

export default function CatalogueDetail() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const catalogueName = category ? catalogueNames[category] || category : "Unknown";
  const products = category ? mockProducts[category] || [] : [];

  const headerActions = (
    <Button 
      className="bg-accent hover:bg-accent/90 text-accent-foreground"
      onClick={() => setIsCreateOpen(true)}
    >
      <Plus className="h-4 w-4 mr-2" />
      New {catalogueName.replace(/s$/, '')}
    </Button>
  );

  return (
    <DashboardLayout title={`Catalogues / ${catalogueName}`} actions={headerActions}>
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/catalogues")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalogues
        </Button>

        {products.length === 0 ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              No items in this catalogue yet. Click "New {catalogueName.replace(/s$/, '')}" to add one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="font-semibold text-foreground">{product.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                <p className="text-xs text-muted-foreground mt-2">Supplier: {product.supplier}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProductDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        catalogueName={catalogueName}
      />
    </DashboardLayout>
  );
}
