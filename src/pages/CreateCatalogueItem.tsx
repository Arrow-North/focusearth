import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

const CCT_OPTIONS = ["2200K", "2500K", "2700K", "3000K", "3500K", "4000K", "4500K", "5000K", "6500K", "Other"];
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
  dimensionsLength: "",
  dimensionsWidth: "",
  dimensionsDiameter: "",
  dimensionsDepth: "",
  wattage: "",
  lumens: "",
  cct: "",
  cri: "",
  beamAngle: "",
  optics: "",
  thd: "",
  vMin: "",
  vMax: "",
  pricePerUnit: "",
  fixtureWarranty: "",
  lifetime: "",
  dimmability: "",
  colorTunable: "",
  powerFactor: "",
  cBCP: "",
  application: "",
  fixtureStyle: "",
  mount: "",
  fixtureShape: "",
  lensType: "",
  ingressProtection: "",
  fixtureColor: "",
  trim: "",
  certifications: "",
  buyAmerica: "",
  installationTime: "",
  approxDeliveryDays: "",
  volumeTier1MinQty: "",
  volumeTier1PPU: "",
  volumeTier2MinQty: "",
  volumeTier2PPU: "",
  supplierProductDescription: "",
  productSpecificationsHyperlink: "",
  installationInstructionsHyperlink: "",
  productImageHyperlink: "",
  compatibleProductOrderCodes: "",
  notes: "",
};

type StringKey = {
  [K in keyof ProductDetails]: NonNullable<ProductDetails[K]> extends string | string[] ? K : never;
}[keyof ProductDetails];

type FieldDef = {
  key: StringKey;
  label: string;
  type?: "select";
  options?: string[];
};

// Column 1: Dimensions + physical attributes
const COL_1_FIELDS: FieldDef[] = [
  { key: "dimensionsLength",   label: "Dimensions - Length (in):" },
  { key: "dimensionsWidth",    label: "Dimensions - Width (in):" },
  { key: "dimensionsDiameter", label: "Dimensions - Diameter (in):" },
  { key: "dimensionsDepth",    label: "Dimensions - Depth (in):" },
  { key: "application",        label: "Application:", type: "select", options: APPLICATION_OPTIONS },
  { key: "fixtureStyle",       label: "Style:" },
  { key: "mount",              label: "Mount:" },
  { key: "fixtureShape",       label: "Shape:" },
  { key: "lensType",           label: "Lens Type:" },
  { key: "ingressProtection",  label: "Ingress Protection:" },
  { key: "fixtureColor",       label: "Fixture Color:" },
  { key: "trim",               label: "Trim:" },
];

// Column 2: Electrical & performance
const COL_2_FIELDS: FieldDef[] = [
  { key: "wattage",         label: "Wattage:" },
  { key: "lumens",          label: "Lumens:" },
  { key: "cct",             label: "CCT (K°):", type: "select", options: CCT_OPTIONS },
  { key: "cri",             label: "CRI:" },
  { key: "lifetime",        label: "L70 Lifetime (hours):" },
  { key: "fixtureWarranty", label: "Warranty (years):" },
  { key: "vMin",            label: "Voltage (min):" },
  { key: "vMax",            label: "Voltage (max):" },
  { key: "dimmability",     label: "Dimmability:", type: "select", options: DIMMABILITY_OPTIONS },
  { key: "colorTunable",    label: "Color Tunable:", type: "select", options: COLOR_TUNABLE_OPTIONS },
  { key: "powerFactor",     label: "Power Factor:" },
  { key: "cBCP",            label: "CBCP:" },
];

// Column 3: Compliance, pricing, volume
const COL_3_FIELDS: FieldDef[] = [
  { key: "thd",               label: "THD (%):" },
  { key: "beamAngle",         label: "Beam Angle:" },
  { key: "optics",            label: "Optics:", type: "select", options: OPTICS_OPTIONS },
  { key: "certifications",    label: "Certifications:", type: "select", options: CERTIFICATIONS_OPTIONS },
  { key: "buyAmerica",        label: "Buy America:", type: "select", options: BUY_AMERICA_OPTIONS },
  { key: "installationTime",  label: "Installation (minutes):" },
  { key: "approxDeliveryDays",label: "Delivery (days):" },
  { key: "pricePerUnit",      label: "Price Per Unit ($):" },
  { key: "volumeTier1MinQty", label: "Vol. Tier 1 (min qty):" },
  { key: "volumeTier1PPU",    label: "Vol. Tier 1 PPU ($):" },
  { key: "volumeTier2MinQty", label: "Vol. Tier 2 (min qty):" },
  { key: "volumeTier2PPU",    label: "Vol. Tier 2 PPU ($):" },
];

export default function CreateCatalogueItem() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user, userType, isAdmin } = useAuth();
  const createProduct = useCreateProduct();
  const catalogueName = getCatalogueName(category);

  const [productName, setProductName] = useState("");
  const [details, setDetails] = useState<ProductDetails>({
    ...INITIAL_DETAILS,
    productType: catalogueName.replace(/s$/, ""),
  });
  const [isExisting, setIsExisting] = useState(false);

  // REU → always false, SU → always true, admin → controlled by dropdown
  const effectiveIsExisting =
    userType === "Reu" ? false : userType === "Su" ? true : isExisting;

  const update = (key: StringKey, value: string) => {
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
        isExisting: effectiveIsExisting,
      },
      {
        onSuccess: (newId) => {
          navigate(`/catalogues/${category}/${newId}`);
        },
      }
    );
  };

  const renderField = (f: FieldDef) => {
    const value = (details[f.key] as string) ?? "";
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
      title={
        <span>
          <Link to="/catalogues" className="hover:underline">Catalogues</Link>
          <span className="mx-2">/</span>
          <Link to={`/catalogues/${category}`} className="hover:underline">{catalogueName}</Link>
          <span className="mx-2">/</span>
          <span>Create</span>
        </span>
      }
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
                  value={details.description ?? ""}
                  onChange={(e) => update("description", e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-medium text-xs">Supplier:</Label>
                  <Input value={details.supplier ?? ""} onChange={(e) => update("supplier", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-primary font-medium text-xs">Product Type:</Label>
                  <Input value={details.productType ?? ""} onChange={(e) => update("productType", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-medium text-xs">Manufacturer:</Label>
                  <Input value={details.manufacturer ?? ""} onChange={(e) => update("manufacturer", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-primary font-medium text-xs">Order Code:</Label>
                  <Input value={details.orderCode ?? ""} onChange={(e) => update("orderCode", e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              {isAdmin && (
                <div>
                  <Label className="text-primary font-medium text-xs">Listing Type:</Label>
                  <Select
                    value={isExisting ? "existing" : "recommended"}
                    onValueChange={(v) => setIsExisting(v === "existing")}
                  >
                    <SelectTrigger className="mt-1 bg-card h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="recommended">Recommended</SelectItem>
                      <SelectItem value="existing">Existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <Input value={details.supplierProductDescription ?? ""} onChange={(e) => update("supplierProductDescription", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Product Specifications (hyperlink):</Label>
            <Input value={details.productSpecificationsHyperlink ?? ""} onChange={(e) => update("productSpecificationsHyperlink", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Installation Instructions (hyperlink):</Label>
            <Input value={details.installationInstructionsHyperlink ?? ""} onChange={(e) => update("installationInstructionsHyperlink", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Product Image (hyperlink):</Label>
            <Input value={details.productImageHyperlink ?? ""} onChange={(e) => update("productImageHyperlink", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Compatible Product Order Codes:</Label>
            <Input value={(details.compatibleProductOrderCodes as string) ?? ""} onChange={(e) => update("compatibleProductOrderCodes", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-primary font-medium text-xs">Notes:</Label>
            <Textarea value={details.notes ?? ""} onChange={(e) => update("notes", e.target.value)} className="mt-1 min-h-[80px] text-sm" />
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}