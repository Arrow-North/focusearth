import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { useProductImageUpload } from "@/hooks/use-product-image-upload";
import { getCatalogueName } from "@/lib/catalogues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ImagePlus, Check, Loader2 } from "lucide-react";
import type { ProductDetails } from "@/types/database";

const CCT_OPTIONS = [
  "2700K",
  "3000K",
  "3500K",
  "4000K",
  "5000K",
  "OtherK",
];

const APPLICATION_OPTIONS = ["Indoor", "Outdoor", "Indoor/Outdoor"];

const CERTIFICATIONS_OPTIONS = [
  "CE Marketing, DLC Approved, Energy Star",
  "DLC Approved",
  "Energy Star",
  "UL Listed",
  "CE Marketing",
  "None",
];

const BUY_AMERICA_OPTIONS = ["Yes", "No"];

const OPTICS_OPTIONS = ["None", "Diffused", "Spot", "Flood", "Wide Flood"];

// Left column: dimensions + application
const COL_1_FIELDS: {
  key: keyof ProductDetails;
  label: string;
  type?: "select";
  options?: string[];
}[] = [
  { key: "length", label: "Dimensions - Length (inches):" },
  { key: "width", label: "Dimensions - Width (inches):" },
  { key: "diameter", label: "Dimensions - Diameter (inches):" },
  { key: "depth", label: "Dimensions - Depth (inches):" },
  { key: "application", label: "Application:", type: "select", options: APPLICATION_OPTIONS },
];

// Middle column: electrical
const COL_2_FIELDS: {
  key: keyof ProductDetails;
  label: string;
  type?: "select";
  options?: string[];
}[] = [
  { key: "wattage", label: "Wattage:" },
  { key: "lumens", label: "Lumens:" },
  { key: "cct", label: "CCT (K°):", type: "select", options: CCT_OPTIONS },
  { key: "cri", label: "CRI:" },
  { key: "l70Lifetime", label: "L70 Lifetime (hours):" },
];

// Right column: compliance
const COL_3_FIELDS: {
  key: keyof ProductDetails;
  label: string;
  type?: "select";
  options?: string[];
}[] = [
  { key: "thd", label: "THD (%):" },
  { key: "beamAngle", label: "Beam Angle:" },
  { key: "optics", label: "Optics:", type: "select", options: OPTICS_OPTIONS },
  {
    key: "certifications",
    label: "Certifications:",
    type: "select",
    options: CERTIFICATIONS_OPTIONS,
  },
  { key: "buyAmerica", label: "Buy America:", type: "select", options: BUY_AMERICA_OPTIONS },
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

  const [editDetails, setEditDetails] = useState<ProductDetails>({});
  const [editRecord, setEditRecord] = useState("");
  const [dirty, setDirty] = useState(false);

  const catalogueName = getCatalogueName(category);
  const details: ProductDetails = product?.details ?? {};

  useEffect(() => {
    if (product) {
      setEditDetails(product.details ?? {});
      setEditRecord(product.airtable_record ?? "");
      setDirty(false);
    }
  }, [product]);

  const updateField = (key: keyof ProductDetails, value: string) => {
    setEditDetails((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
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
      { onSuccess: () => setDirty(false) }
    );
  };

  const handleCancel = () => {
    setEditDetails(product?.details ?? {});
    setEditRecord(product?.airtable_record ?? "");
    setDirty(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    // Reset the input so the same file can be re-selected
    e.target.value = "";

    const publicUrl = await uploadImage(file, productId, editDetails);
    if (publicUrl) {
      setEditDetails((prev) => ({ ...prev, productImage: publicUrl }));
    }
  };

  const renderInput = (
    key: keyof ProductDetails,
    label: string,
    fieldType?: "select",
    options?: string[]
  ) => {
    const value = editDetails[key] ?? "";
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
            <SelectTrigger className="bg-white border-gray-300 h-10 text-sm">
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
            className="bg-white border-gray-300 h-10 text-sm"
          />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout
      title={`Catalogues / ${catalogueName} / Detail`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
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
        <div className="max-w-6xl mx-auto">
          {/* Product Details Tab */}
          <div className="border-b border-gray-200 mb-6">
            <div className="inline-block px-4 py-2 text-sm font-semibold text-[#3b5998] border-b-2 border-[#3b5998]">
              Product Details
            </div>
          </div>

          {/* Top Section: Image + Core Fields */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex gap-8">
              {/* Left: Image + Upload */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="w-48 h-40 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                  ) : editDetails.productImage ? (
                    <img
                      src={editDetails.productImage}
                      alt="Product"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <ImagePlus className="h-16 w-16 text-gray-300" strokeWidth={1} />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  className="w-48 bg-[#3b5998] hover:bg-[#2d4373] text-white text-sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "Uploading..." : "Upload New Photo"}
                </Button>
              </div>

              {/* Right: Core product fields */}
              <div className="flex-1 space-y-4">
                {/* Product Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#3b5998] mb-1">
                    Product Description:
                  </label>
                  <Input
                    value={editDetails.description ?? ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder={`${editDetails.width ?? ""}\"x${editDetails.length ?? ""}\"x${editDetails.depth ?? ""}" ${editDetails.productType ?? ""} ${editDetails.optics ?? ""} ${editDetails.wattage ?? "0"}W ${editDetails.lumens ?? "0"}L ${editDetails.cct ?? ""}  ${editDetails.cri ?? "0"}CRI`}
                    className="bg-white border-gray-300 h-10 text-sm"
                  />
                </div>

                {/* Supplier + Product Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3b5998] mb-1">
                      Supplier:
                    </label>
                    <Input
                      value={editDetails.supplier ?? ""}
                      onChange={(e) => updateField("supplier", e.target.value)}
                      className="bg-white border-gray-300 h-10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3b5998] mb-1">
                      Product Type:
                    </label>
                    <Input
                      value={editDetails.productType ?? ""}
                      onChange={(e) =>
                        updateField("productType", e.target.value)
                      }
                      placeholder="Fixtures"
                      className="bg-white border-gray-300 h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Manufacturer + Order Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3b5998] mb-1">
                      Manufacturer:
                    </label>
                    <Input
                      value={editDetails.manufacturer ?? ""}
                      onChange={(e) =>
                        updateField("manufacturer", e.target.value)
                      }
                      className="bg-white border-gray-300 h-10 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-semibold text-[#3b5998] mb-1">
                      Order Code:
                    </label>
                    <Input
                      value={editDetails.orderCode ?? ""}
                      onChange={(e) =>
                        updateField("orderCode", e.target.value)
                      }
                      className="bg-white border-gray-300 h-10 text-sm pr-8"
                    />
                    {editDetails.orderCode && (
                      <div className="absolute right-2 top-[26px] h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specs Section: 3-column grid */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              {/* Column 1: Dimensions */}
              <div className="space-y-4">
                {COL_1_FIELDS.map((f) =>
                  renderInput(f.key, f.label, f.type, f.options)
                )}
              </div>

              {/* Column 2: Electrical */}
              <div className="space-y-4">
                {COL_2_FIELDS.map((f) =>
                  renderInput(f.key, f.label, f.type, f.options)
                )}
              </div>

              {/* Column 3: Compliance */}
              <div className="space-y-4">
                {COL_3_FIELDS.map((f) =>
                  renderInput(f.key, f.label, f.type, f.options)
                )}
              </div>
            </div>
          </div>

          {/* Save / Cancel */}
          {dirty && (
            <div className="flex items-center gap-3 pb-6">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSave}
                disabled={updateProduct.isPending}
              >
                {updateProduct.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateProduct.isPending}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
