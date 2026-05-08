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

const CCT_OPTIONS = ["2700K", "3000K", "3500K", "4000K", "5000K", "OtherK"];
const APPLICATION_OPTIONS = ["Indoor", "Outdoor", "Indoor/Outdoor"];
const CERTIFICATIONS_OPTIONS = [
  "CE Marketing, DLC Approved, Energy Star",
  "DLC Approved",
  "Energy Star",
  "UL Listed",
  "ETL",
  "CE Marketing",
  "None",
];
const BUY_AMERICA_OPTIONS = ["Yes", "No"];
const OPTICS_OPTIONS = ["None", "Diffused", "Spot", "Flood", "Wide Flood"];
const DIMMABILITY_OPTIONS = ["0-10V", "TRIAC", "DALI", "None"];
const COLOR_TUNABLE_OPTIONS = ["Yes", "No"];

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

type FieldDef = {
  key: keyof ProductDetails;
  label: string;
  type?: "select";
  options?: string[];
};

// Column 1: Dimensions + physical attributes
const COL_1_FIELDS: FieldDef[] = [
  { key: "length", label: "Dimensions - Length (in):" },
  { key: "width", label: "Dimensions - Width (in):" },
  { key: "diameter", label: "Dimensions - Diameter (in):" },
  { key: "depth", label: "Dimensions - Depth (in):" },
  { key: "application", label: "Application:", type: "select", options: APPLICATION_OPTIONS },
  { key: "style", label: "Style:" },
  { key: "mount", label: "Mount:" },
  { key: "shape", label: "Shape:" },
  { key: "lensType", label: "Lens Type:" },
  { key: "ingressProtection", label: "Ingress Protection:" },
  { key: "fixtureColor", label: "Fixture Color:" },
  { key: "trim", label: "Trim:" },
];

// Column 2: Electrical & performance
const COL_2_FIELDS: FieldDef[] = [
  { key: "wattage", label: "Wattage:" },
  { key: "lumens", label: "Lumens:" },
  { key: "cct", label: "CCT (K°):", type: "select", options: CCT_OPTIONS },
  { key: "cri", label: "CRI:" },
  { key: "l70Lifetime", label: "L70 Lifetime (hours):" },
  { key: "warranty", label: "Warranty (years):" },
  { key: "voltageMin", label: "Voltage (min):" },
  { key: "voltageMax", label: "Voltage (max):" },
  { key: "dimmability", label: "Dimmability:", type: "select", options: DIMMABILITY_OPTIONS },
  { key: "colorTunable", label: "Color Tunable:", type: "select", options: COLOR_TUNABLE_OPTIONS },
  { key: "powerFactor", label: "Power Factor:" },
  { key: "cbcp", label: "CBCP:" },
];

// Column 3: Compliance, pricing, volume
const COL_3_FIELDS: FieldDef[] = [
  { key: "thd", label: "THD (%):" },
  { key: "beamAngle", label: "Beam Angle:" },
  { key: "optics", label: "Optics:", type: "select", options: OPTICS_OPTIONS },
  { key: "certifications", label: "Certifications:", type: "select", options: CERTIFICATIONS_OPTIONS },
  { key: "buyAmerica", label: "Buy America:", type: "select", options: BUY_AMERICA_OPTIONS },
  { key: "installationTime", label: "Installation (minutes):" },
  { key: "deliveryDays", label: "Delivery (days):" },
  { key: "pricePerUnit", label: "Price Per Unit ($):" },
  { key: "volumeTier1Qty", label: "Vol. Tier 1 (min qty):" },
  { key: "volumeTier1PPU", label: "Vol. Tier 1 PPU ($):" },
  { key: "volumeTier2Qty", label: "Vol. Tier 2 (min qty):" },
  { key: "volumeTier2PPU", label: "Vol. Tier 2 PPU ($):" },
];

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

  const renderField = (f: FieldDef) => {
    const value = details[f.key] ?? "";
    return (
      <div key={f.key}>
        <Label className="text-primary font-medium text-xs">{f.label}</Label>
        {f.type === "select" && f.options ? (
          <Select value={value || undefined} onValueChange={(v) => update(f.key, v)}>
            <SelectTrigger className="mt-1 bg-card h-9 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              {f.options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value}
            onChange={(e) => update(f.key, e.target.value)}
            className="mt-1 h-9 text-sm"
          />
        )}
      </div>
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
      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
        {/* ── Top Section: Image + Basic Info ────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex gap-6">
            {/* Image placeholder */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-40 h-36 border-2 border-dashed border-border rounded-lg bg-muted/50 flex items-center justify-center">
                <ImagePlus className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-40 text-xs"
              >
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                Upload Photo
              </Button>
            </div>

            {/* Core fields */}
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-primary font-medium text-xs">Product Name:</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-primary font-medium text-xs">Product Description:</Label>
                <Input
                  value={details.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-medium text-xs">Supplier:</Label>
                  <Input value={details.supplier} onChange={(e) => update("supplier", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-primary font-medium text-xs">Product Type:</Label>
                  <Input value={details.productType} onChange={(e) => update("productType", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-medium text-xs">Manufacturer:</Label>
                  <Input value={details.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-primary font-medium text-xs">Order Code:</Label>
                  <Input value={details.orderCode} onChange={(e) => update("orderCode", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Specs Section: 3-column grid ──────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
            <div className="space-y-3">
              {COL_1_FIELDS.map(renderField)}
            </div>
            <div className="space-y-3">
              {COL_2_FIELDS.map(renderField)}
            </div>
            <div className="space-y-3">
              {COL_3_FIELDS.map(renderField)}
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Full-width fields ─────────────── */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <Label className="text-primary font-medium text-xs">Supplier Product Description:</Label>
            <Input value={details.supplierDescription} onChange={(e) => update("supplierDescription", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Product Specifications (hyperlink):</Label>
            <Input value={details.productSpecifications} onChange={(e) => update("productSpecifications", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Installation Instructions (hyperlink):</Label>
            <Input value={details.installationInstructions} onChange={(e) => update("installationInstructions", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Product Image (hyperlink):</Label>
            <Input value={details.productImage} onChange={(e) => update("productImage", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Compatible Product Order Codes:</Label>
            <Input value={details.compatibleOrderCodes} onChange={(e) => update("compatibleOrderCodes", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Notes:</Label>
            <Textarea value={details.notes} onChange={(e) => update("notes", e.target.value)} className="mt-1 min-h-[80px] text-sm" />
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
