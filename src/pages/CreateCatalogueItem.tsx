import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCreateProduct } from "@/hooks/use-products";
import { useAuth } from "@/hooks/useAuth";
import { getCatalogueName } from "@/lib/catalogues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ImagePlus } from "lucide-react";
import type { ProductDetails } from "@/types/database";

const INITIAL_DETAILS: ProductDetails = {
  description: "",
  supplier: "Focus Earth",
  productType: "",
  manufacturer: "",
  orderCode: "",
  length: "",
  width: "",
  diameter: "",
  depth: "",
  wattage: "",
  lumens: "",
  cct: "",
  cri: "",
  beamAngle: "",
  optics: "",
  thd: "",
  voltageMin: "",
  voltageMax: "",
  pricePerUnit: "",
  warranty: "",
  l70Lifetime: "",
  dimmability: "",
  colorTunable: "",
  powerFactor: "",
  cbcp: "",
  application: "",
  style: "",
  mount: "",
  shape: "",
  lensType: "",
  ingressProtection: "",
  fixtureColor: "",
  trim: "",
  certifications: "",
  buyAmerica: "",
  installationTime: "",
  deliveryDays: "",
  volumeTier1Qty: "",
  volumeTier1PPU: "",
  volumeTier2Qty: "",
  volumeTier2PPU: "",
  supplierDescription: "",
  productSpecifications: "",
  installationInstructions: "",
  productImage: "",
  compatibleOrderCodes: "",
  notes: "",
};

export default function CreateCatalogueItem() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProduct = useCreateProduct();
  const catalogueName = getCatalogueName(category);

  const [productName, setProductName] = useState("");
  const [details, setDetails] = useState<ProductDetails>({
    ...INITIAL_DETAILS,
    productType: catalogueName.replace(/s$/, ""),
  });

  const update = (key: keyof ProductDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.id || !category) return;

    createProduct.mutate(
      {
        userId: user.id,
        airtableRecord: productName,
        airtableColumName: category,
        details,
      },
      {
        onSuccess: (newId) => {
          navigate(`/catalogues/${category}/${newId}`);
        },
      }
    );
  };

  const headerActions = (
    <Button
      onClick={() => handleSubmit()}
      disabled={createProduct.isPending || !productName.trim()}
      className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent"
    >
      <Check className="h-4 w-4 mr-2" />
      {createProduct.isPending ? "Submitting..." : "Submit"}
    </Button>
  );

  return (
    <DashboardLayout
      title={`Catalogues / Create ${catalogueName.replace(/s$/, "")}`}
      actions={headerActions}
    >
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
        {/* Top Section: Image + Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Upload Placeholder */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/50 h-48">
              <ImagePlus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No image</p>
            </div>
            <Button
              type="button"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Upload New Photo
            </Button>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-primary font-medium">Product Name:</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Product Description:</Label>
              <Input
                value={details.description}
                onChange={(e) => update("description", e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-medium">Supplier:</Label>
                <Input
                  value={details.supplier}
                  onChange={(e) => update("supplier", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-primary font-medium">Product Type:</Label>
                <Input
                  value={details.productType}
                  onChange={(e) => update("productType", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-medium">Manufacturer:</Label>
                <Input
                  value={details.manufacturer}
                  onChange={(e) => update("manufacturer", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-primary font-medium">Order Code:</Label>
                <Input
                  value={details.orderCode}
                  onChange={(e) => update("orderCode", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6" />

        {/* Middle Section: 3-column spec fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-primary font-medium">Length (inches):</Label>
            <Input value={details.length} onChange={(e) => update("length", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Wattage:</Label>
            <Input value={details.wattage} onChange={(e) => update("wattage", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">THD (%):</Label>
            <Input value={details.thd} onChange={(e) => update("thd", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Width (inches):</Label>
            <Input value={details.width} onChange={(e) => update("width", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Lumens:</Label>
            <Input value={details.lumens} onChange={(e) => update("lumens", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Beam Angle:</Label>
            <Input value={details.beamAngle} onChange={(e) => update("beamAngle", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Diameter (inches):</Label>
            <Input value={details.diameter} onChange={(e) => update("diameter", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">CCT (K):</Label>
            <Select value={details.cct} onValueChange={(v) => update("cct", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="2700">2700K</SelectItem>
                <SelectItem value="3000">3000K</SelectItem>
                <SelectItem value="3500">3500K</SelectItem>
                <SelectItem value="4000">4000K</SelectItem>
                <SelectItem value="5000">5000K</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">Optics:</Label>
            <Input value={details.optics} onChange={(e) => update("optics", e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="border-t border-border pt-6" />

        {/* Additional Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-primary font-medium">Application:</Label>
            <Select value={details.application} onValueChange={(v) => update("application", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="indoor">Indoor</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">L70 Lifetime (hours):</Label>
            <Input value={details.l70Lifetime} onChange={(e) => update("l70Lifetime", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Buy America:</Label>
            <Select value={details.buyAmerica} onValueChange={(v) => update("buyAmerica", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">Style:</Label>
            <Select value={details.style} onValueChange={(v) => update("style", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="traditional">Traditional</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">Warranty (years):</Label>
            <Input value={details.warranty} onChange={(e) => update("warranty", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Installation Time (min):</Label>
            <Input value={details.installationTime} onChange={(e) => update("installationTime", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Mount:</Label>
            <Select value={details.mount} onValueChange={(v) => update("mount", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="recessed">Recessed</SelectItem>
                <SelectItem value="pendant">Pendant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">Voltage (min):</Label>
            <Input value={details.voltageMin} onChange={(e) => update("voltageMin", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Delivery (days):</Label>
            <Input value={details.deliveryDays} onChange={(e) => update("deliveryDays", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Voltage (max):</Label>
            <Input value={details.voltageMax} onChange={(e) => update("voltageMax", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Dimmability:</Label>
            <Select value={details.dimmability} onValueChange={(v) => update("dimmability", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="0-10v">0-10V</SelectItem>
                <SelectItem value="triac">TRIAC</SelectItem>
                <SelectItem value="dali">DALI</SelectItem>
                <SelectItem value="non-dim">Non-Dimmable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">Price Per Unit ($):</Label>
            <Input value={details.pricePerUnit} onChange={(e) => update("pricePerUnit", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">CRI:</Label>
            <Input value={details.cri} onChange={(e) => update("cri", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Color Tunable:</Label>
            <Select value={details.colorTunable} onValueChange={(v) => update("colorTunable", v)}>
              <SelectTrigger className="mt-1 bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-primary font-medium">Power Factor:</Label>
            <Input value={details.powerFactor} onChange={(e) => update("powerFactor", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">CBCP:</Label>
            <Input value={details.cbcp} onChange={(e) => update("cbcp", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Vol Tier 1 Qty:</Label>
            <Input value={details.volumeTier1Qty} onChange={(e) => update("volumeTier1Qty", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Vol Tier 1 PPU ($):</Label>
            <Input value={details.volumeTier1PPU} onChange={(e) => update("volumeTier1PPU", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Vol Tier 2 Qty:</Label>
            <Input value={details.volumeTier2Qty} onChange={(e) => update("volumeTier2Qty", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Vol Tier 2 PPU ($):</Label>
            <Input value={details.volumeTier2PPU} onChange={(e) => update("volumeTier2PPU", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-primary font-medium">Certifications:</Label>
            <Input value={details.certifications} onChange={(e) => update("certifications", e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="border-t border-border pt-6" />

        {/* Bottom Section: Full-width fields */}
        <div className="space-y-4">
          <div>
            <Label className="text-primary font-medium">Supplier Product Description:</Label>
            <Input
              value={details.supplierDescription}
              onChange={(e) => update("supplierDescription", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-primary font-medium">Installation Instructions (hyperlink):</Label>
            <Input
              value={details.installationInstructions}
              onChange={(e) => update("installationInstructions", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-primary font-medium">Product Specifications (hyperlink):</Label>
            <Input
              value={details.productSpecifications}
              onChange={(e) => update("productSpecifications", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-primary font-medium">Product Image (hyperlink):</Label>
            <Input
              value={details.productImage}
              onChange={(e) => update("productImage", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-primary font-medium">Compatible Order Codes:</Label>
            <Input
              value={details.compatibleOrderCodes}
              onChange={(e) => update("compatibleOrderCodes", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-primary font-medium">Notes:</Label>
            <Textarea
              value={details.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="mt-1 min-h-[100px]"
            />
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
