import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { useProductImageUpload } from "@/hooks/use-product-image-upload";
import { getCatalogueName } from "@/lib/catalogues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ImagePlus, Pencil, Check, X, Loader2 } from "lucide-react";
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

// Bottom full-width fields
const BOTTOM_FIELDS: { key: keyof ProductDetails; label: string; multiline?: boolean }[] = [
  { key: "supplierDescription", label: "Supplier Product Description:" },
  { key: "productSpecifications", label: "Product Specifications (hyperlink):" },
  { key: "installationInstructions", label: "Installation Instructions (hyperlink):" },
  { key: "productImage", label: "Product Image (hyperlink):" },
  { key: "compatibleOrderCodes", label: "Compatible Product Order Codes:" },
  { key: "notes", label: "Notes:", multiline: true },
];

export default function CatalogueItemDetail() {
  const { category, itemId } = useParams<{
    category: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const productId = itemId ? parseInt(itemId, 10) : undefined;
  const { data: product, isLoading, error } = useProduct(productId);
  const updateProduct = useUpdateProduct();
  const { upload: uploadImage, isUploading } = useProductImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editDetails, setEditDetails] = useState<ProductDetails>({});
  const [editRecord, setEditRecord] = useState("");

  const catalogueName = getCatalogueName(category);

  useEffect(() => {
    if (product) {
      setEditDetails(product.details ?? {});
      setEditRecord(product.airtable_record ?? "");
    }
  }, [product]);

  const updateField = (key: keyof ProductDetails, value: string) => {
    setEditDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!productId) return;
    updateProduct.mutate(
      {
        productId,
        fields: {
          airtable_record: editRecord,
          details: editDetails,
        },
      },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    setEditDetails(product?.details ?? {});
    setEditRecord(product?.airtable_record ?? "");
    setIsEditing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    e.target.value = "";

    const publicUrl = await uploadImage(file, productId, editDetails);
    if (publicUrl) {
      setEditDetails((prev) => ({ ...prev, productImage: publicUrl }));
    }
  };

  const details = editDetails;

  // ── Render helpers ──────────────────────────────────────────────

  const renderReadOnlyRow = (label: string, value: string | undefined) => (
    <div className="flex items-baseline justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500 shrink-0 mr-4">{label}</span>
      <span className="text-sm text-gray-900 text-right truncate">{value || ""}</span>
    </div>
  );

  const renderEditField = (
    key: keyof ProductDetails,
    label: string,
    fieldType?: "select",
    options?: string[]
  ) => {
    const value = details[key] ?? "";
    return (
      <div key={key}>
        <label className="block text-xs font-semibold text-[#3b5998] mb-1">
          {label}
        </label>
        {fieldType === "select" && options ? (
          <Select
            value={value || undefined}
            onValueChange={(val) => updateField(key, val)}
          >
            <SelectTrigger className="bg-white border-gray-300 h-9 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value}
            onChange={(e) => updateField(key, e.target.value)}
            className="bg-white border-gray-300 h-9 text-sm"
          />
        )}
      </div>
    );
  };

  const renderColumn = (fields: FieldDef[]) => (
    <div className={isEditing ? "space-y-3" : ""}>
      {fields.map((f) =>
        isEditing
          ? renderEditField(f.key, f.label, f.type, f.options)
          : <div key={f.key}>{renderReadOnlyRow(f.label, details[f.key])}</div>
      )}
    </div>
  );

  return (
    <DashboardLayout
      title={
        <span>
          <Link to="/catalogues" className="hover:underline">Catalogues</Link>
          <span className="mx-2">/</span>
          <Link to={`/catalogues/${category}`} className="hover:underline">{catalogueName}</Link>
          <span className="mx-2">/</span>
          <span>{product?.details?.description || product?.airtable_record || "Detail"}</span>
        </span>
      }
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      }
    >
      {isLoading && (
        <div className="space-y-4 max-w-6xl mx-auto">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {error && (
        <p className="text-destructive">
          Failed to load product: {(error as Error).message}
        </p>
      )}

      {product && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ── Header Section ──────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Title + Edit button */}
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight flex-1 mr-4">
                {details.description || product.airtable_record || "Untitled Product"}
              </h2>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit Details
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSave}
                    disabled={updateProduct.isPending}
                  >
                    {updateProduct.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {updateProduct.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={updateProduct.isPending}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Image + Core fields */}
            <div className="flex gap-6">
              {/* Product Image */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-40 h-36 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                  ) : details.productImage ? (
                    <img
                      src={details.productImage}
                      alt="Product"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImagePlus className="h-12 w-12 text-gray-300" strokeWidth={1} />
                  )}
                </div>
                {isEditing && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-40 text-xs"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                      {isUploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </>
                )}
              </div>

              {/* Core product fields */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#3b5998] mb-1">Supplier:</label>
                        <Input value={details.supplier ?? ""} onChange={(e) => updateField("supplier", e.target.value)} className="bg-white border-gray-300 h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#3b5998] mb-1">Product Type:</label>
                        <Input value={details.productType ?? ""} onChange={(e) => updateField("productType", e.target.value)} className="bg-white border-gray-300 h-9 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#3b5998] mb-1">Manufacturer:</label>
                        <Input value={details.manufacturer ?? ""} onChange={(e) => updateField("manufacturer", e.target.value)} className="bg-white border-gray-300 h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#3b5998] mb-1">Order Code:</label>
                        <Input value={details.orderCode ?? ""} onChange={(e) => updateField("orderCode", e.target.value)} className="bg-white border-gray-300 h-9 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#3b5998] mb-1">Description:</label>
                      <Input value={details.description ?? ""} onChange={(e) => updateField("description", e.target.value)} className="bg-white border-gray-300 h-9 text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Supplier: </span>
                      <span className="text-sm text-gray-900">{details.supplier || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Product Type: </span>
                      <span className="text-sm text-gray-900">{details.productType || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Manufacturer: </span>
                      <span className="text-sm text-gray-900">{details.manufacturer || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Order Code: </span>
                      <span className="text-sm text-gray-900">{details.orderCode ? `# ${details.orderCode}` : "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Specs Section: 3-column grid ──────────────────── */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
              {renderColumn(COL_1_FIELDS)}
              {renderColumn(COL_2_FIELDS)}
              {renderColumn(COL_3_FIELDS)}
            </div>
          </div>

          {/* ── Bottom Section: Full-width fields ─────────────── */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {isEditing ? (
              <div className="space-y-4">
                {BOTTOM_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-[#3b5998] mb-1">
                      {f.label}
                    </label>
                    {f.multiline ? (
                      <Textarea
                        value={details[f.key] ?? ""}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        className="bg-white border-gray-300 text-sm min-h-[80px]"
                      />
                    ) : (
                      <Input
                        value={details[f.key] ?? ""}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        className="bg-white border-gray-300 h-9 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {BOTTOM_FIELDS.map((f) => {
                  const value = details[f.key] ?? "";
                  return (
                    <div key={f.key} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                      <span className="text-xs text-gray-500 block mb-0.5">{f.label}</span>
                      {value && (value.startsWith("http://") || value.startsWith("https://")) ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {value}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-900 break-all">{value || ""}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
