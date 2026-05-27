import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import {
  Loader2,
  Upload,
  RefreshCw,
  UserPlus,
  PlusCircle,
  MinusCircle,
  Trash2,
  CheckCircle,
  Pencil,
  X,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/use-companies";
import { useUsers } from "@/hooks/use-users";
import { COMPANY_TYPE_LABELS } from "@/lib/roles";
import type { PropertyPriority } from "@/types/database";

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const PROPERTY_COLORS: Record<string, string> = {
  "Office": "#ec4899",
  "Industrial": "#f97316",
  "Retail": "#93c5fd",
  "Multi Family": "#84cc16",
  "Hospitality": "#14b8a6",
  "Parking": "#d97706",
  "Horticulture": "#facc15",
  "Healthcare": "#3b82f6",
  "Data Center": "#a855f7",
  "Other": "#22c55e",
};

function getPropertyColor(name: string, color?: string): string {
  return color || PROPERTY_COLORS[name] || "#6b7280";
}

const ADMIN_COMPANY_TYPES: Record<string, string> = {
  Admin: "Admin",
  ...COMPANY_TYPE_LABELS,
};

interface FormState {
  name: string;
  type: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  website: string;
  notes: string;
  property_priorities: PropertyPriority[];
}

// Reusable display field component to match the screenshot style
function DisplayField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">{label}</Label>
      <div className="bg-white border border-gray-200 rounded px-4 py-3 text-foreground min-h-[44px]">
        {value || "—"}
      </div>
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading, error } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);

  // Fetch associated users for this company
  const { data: usersData } = useUsers({ companyId: company?.id, pageSize: 50 });
  const associatedUsers = usersData?.rows ?? [];

  const [form, setForm] = useState<FormState>({
    name: "",
    type: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    website: "",
    notes: "",
    property_priorities: [],
  });

  const resetForm = () => {
    if (company) {
      setForm({
        name: company.name ?? "",
        type: company.type ?? "",
        address: company.address ?? "",
        address2: company.address2 ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        zip_code: company.zip_code ?? "",
        country: company.country ?? "",
        website: company.website ?? "",
        notes: company.notes ?? "",
        property_priorities: company.property_priorities?.map((p) => ({ ...p })) ?? [],
      });
    }
  };

  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const handleChange = (field: keyof Omit<FormState, "property_priorities">, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const STEP = 5;

  const handlePriorityChange = (index: number, direction: 1 | -1) => {
    setForm((prev) => {
      const updated = [...prev.property_priorities];
      const current = updated[index].percentage;
      const total = updated.reduce((s, p) => s + p.percentage, 0);

      if (direction === 1) {
        const room = 100 - total;
        if (room <= 0) return prev;
        const increment = Math.min(STEP, room);
        updated[index] = { ...updated[index], percentage: current + increment };
      } else {
        const decrement = Math.min(STEP, current);
        if (decrement <= 0) return prev;
        updated[index] = { ...updated[index], percentage: current - decrement };
      }

      return { ...prev, property_priorities: updated };
    });
  };

  const handleSave = () => {
    if (!company) return;

    const changed: Record<string, unknown> = {};

    if (form.name !== (company.name ?? "")) changed.name = form.name;
    if (form.type !== (company.type ?? "")) changed.type = form.type;
    if (form.address !== (company.address ?? "")) changed.address = form.address;
    if (form.address2 !== (company.address2 ?? "")) changed.address2 = form.address2;
    if (form.city !== (company.city ?? "")) changed.city = form.city;
    if (form.state !== (company.state ?? "")) changed.state = form.state;
    if (form.zip_code !== (company.zip_code ?? "")) changed.zip_code = form.zip_code;
    if (form.country !== (company.country ?? "")) changed.country = form.country;
    if (form.website !== (company.website ?? "")) changed.website = form.website;
    if (form.notes !== (company.notes ?? "")) changed.notes = form.notes;

    const origPriorities = company.property_priorities ?? [];
    const prioritiesChanged = form.property_priorities.some((p, i) => {
      const orig = origPriorities[i];
      return !orig || p.name !== orig.name || p.percentage !== orig.percentage;
    }) || form.property_priorities.length !== origPriorities.length;

    if (prioritiesChanged) {
      changed.property_priorities = form.property_priorities;
    }

    if (Object.keys(changed).length > 0) {
      updateCompany.mutate({ companyId: company.id, fields: changed });
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!company) return;
    if (window.confirm(`Are you sure you want to delete "${company.name}"?`)) {
      deleteCompany.mutate(company.id, {
        onSuccess: () => navigate("/companies"),
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title={<span><Link to="/companies" className="hover:underline">Companies</Link><span className="mx-2">/</span><span>...</span></span>}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout title={<span><Link to="/companies" className="hover:underline">Companies</Link><span className="mx-2">/</span><span>Not Found</span></span>}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Company not found</p>
          <Button variant="ghost" onClick={() => navigate("/companies")} className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const allProperties = form.property_priorities.map((p) => ({
    ...p,
    color: getPropertyColor(p.name, p.color),
  }));

  const totalPercentage = allProperties.reduce((s, p) => s + p.percentage, 0);
  const pieSlices = allProperties.filter((p) => p.percentage > 0);
  const remainder = 100 - totalPercentage;
  const pieData =
    pieSlices.length === 0
      ? [{ name: "Empty", percentage: 100, color: "#d1d5db" }]
      : remainder > 0
        ? [...pieSlices, { name: "Unallocated", percentage: remainder, color: "#d1d5db" }]
        : pieSlices;

  const companyImage = company.image ?? "";

  const associatedUserNames = associatedUsers.map((u) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email
  ).join(", ");

  // Check if company is in review status
  const isInReview = company.status === "REVIEW";

  // Check if company type is electrician for serviceable areas
  const isElectricianType = company.type === "EU";

  return (
    <DashboardLayout title={<span><Link to="/companies" className="hover:underline">Companies</Link><span className="mx-2">/</span><span>{company.name}</span></span>}>
      <div className="px-10 pt-8 pb-16">
        {/* Accept/Decline Buttons for Review Status */}
        {isInReview && (
          <div className="flex gap-6 mb-6">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white px-6"
              onClick={() => {
                // Handle accept logic
              }}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              className="border-red-400 text-red-500 hover:bg-red-50 px-6"
              onClick={() => {
                // Handle decline logic
              }}
            >
              Decline
            </Button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex items-start justify-between gap-8 mb-0">
          <div className="flex items-center gap-6">
            {/* Company Logo */}
            {companyImage.startsWith("http") ? (
              <div className="w-[106px] h-[101px] border-2 border-gray-300 overflow-hidden shrink-0">
                <img
                  src={companyImage}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-[106px] h-[101px] border-2 border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                {companyImage && <span className="text-4xl">{companyImage}</span>}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />

            {/* Company Name in bordered box */}
            {isEditing ? (
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="text-2xl font-semibold bg-white border-gray-200 h-[60px] min-w-[450px]"
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded px-6 py-4 min-w-[450px]">
                <span className="text-2xl font-semibold text-foreground">{company.name}</span>
              </div>
            )}
          </div>

          {/* Company Type + Edit Button */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <span className="text-lg text-muted-foreground">Company Type:</span>
              {isEditing ? (
                <Select
                  value={form.type}
                  onValueChange={(val) => handleChange("type", val)}
                >
                  <SelectTrigger className="w-[200px] bg-white border-gray-200 h-[50px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADMIN_COMPANY_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="bg-white border border-gray-200 rounded px-6 py-3 min-w-[200px]">
                  <span className="text-foreground">{ADMIN_COMPANY_TYPES[company.type] ?? company.type}</span>
                </div>
              )}
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-[#E8A99C] hover:bg-[#dea090] text-foreground"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            )}
            {isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-status-green hover:bg-status-green/90 text-white border-status-green"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-status-yellow hover:bg-status-yellow/90 text-foreground border-status-yellow"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Company
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-status-green hover:bg-status-green/90 text-white border-status-green"
                  onClick={() => navigate(`/companies/${company.id}/invite`)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 my-8" />

        {/* Details Section */}
        <div className="space-y-6">
          {/* Address Row */}
          <div className="grid grid-cols-2 gap-8">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">Address:</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">Address Line 2:</Label>
                  <Input
                    value={form.address2}
                    onChange={(e) => handleChange("address2", e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
              </>
            ) : (
              <>
                <DisplayField label="Address:" value={company.address || ""} />
                <DisplayField label="Address Line 2:" value={company.address2 || ""} />
              </>
            )}
          </div>

          {/* City / State / Zip Code / Country Row */}
          <div className="grid grid-cols-4 gap-6">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">City:</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">State:</Label>
                  <Select
                    value={form.state}
                    onValueChange={(val) => handleChange("state", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">Zip Code:</Label>
                  <Input
                    value={form.zip_code}
                    onChange={(e) => handleChange("zip_code", e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">Country:</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
              </>
            ) : (
              <>
                <DisplayField label="City:" value={company.city || ""} />
                <DisplayField label="State:" value={company.state || ""} />
                <DisplayField label="Zip Code:" value={company.zip_code || ""} />
                <DisplayField label="Country:" value={company.country || ""} />
              </>
            )}
          </div>

          {/* Associated Users / Website Row */}
          <div className="grid grid-cols-2 gap-8">
            <DisplayField
              label="Associated Users:"
              value={associatedUserNames || "No associated users"}
            />
            {isEditing ? (
              <div>
                <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">Website:</Label>
                <Input
                  value={form.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="bg-white border-gray-200"
                />
              </div>
            ) : (
              <DisplayField label="Website:" value={company.website || ""} />
            )}
          </div>

          {/* Notes - Full Width */}
          <div>
            <Label className="text-[#2C628D] font-semibold text-sm mb-2 block">Notes:</Label>
            {isEditing ? (
              <Textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="bg-white border-gray-200 min-h-[120px]"
              />
            ) : (
              <Textarea
                value={company.notes || ""}
                readOnly
                className="bg-white border-gray-200 min-h-[120px] resize-none"
              />
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 my-10" />

        {/* Serviceable Property Types Section */}
        <div>
          <h3 className="font-semibold text-lg text-foreground mb-6">
            Serviceable Property Types:
          </h3>

          <div className="flex gap-8">
            {/* Property Type Cards - 2 columns */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {allProperties.map((property, index) => (
                <div
                  key={property.name}
                  className="bg-white rounded shadow-sm border-l-4 flex items-center justify-between px-4 py-3"
                  style={{ borderLeftColor: property.color }}
                >
                  <span className="text-sm font-medium text-foreground">{property.name}</span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePriorityChange(index, 1)}
                          className="text-[#5B6FAF] hover:text-[#4a5d99] transition-colors"
                        >
                          <PlusCircle className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePriorityChange(index, -1)}
                          className="text-[#5B6FAF] hover:text-[#4a5d99] transition-colors"
                        >
                          <MinusCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                      {property.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="h-[300px] w-[300px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    innerRadius={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 my-10" />

        {/* Serviceable Areas Section (for Electrician types) */}
        {isElectricianType && (
          <>
            <div className="mb-8">
              <h3 className="font-semibold text-lg text-foreground mb-4">
                Serviceable Areas:
              </h3>
              <p className="text-sm font-semibold text-[#2C628D] mb-2">
                Serviceable Areas - States &amp; Counties
              </p>
              <div className="border border-gray-300 rounded p-3">
                <p className="text-foreground">—</p>
              </div>
            </div>
            <hr className="border-gray-200 my-10" />
          </>
        )}

        {/* Uploaded Files Section */}
        <div>
          <div className="grid grid-cols-[40%_20%_40%] mb-4">
            <h3 className="font-semibold text-lg text-foreground">Uploaded Files</h3>
            <h3 className="font-semibold text-lg text-foreground">Date</h3>
            <div></div>
          </div>

          {/* File list - placeholder */}
          <div className="py-4 text-muted-foreground">
            No files uploaded yet
          </div>
        </div>

        {/* Bottom Action Buttons — only in edit mode */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-8">
            <Button
              variant="outline"
              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
              onClick={handleDelete}
              disabled={deleteCompany.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteCompany.isPending ? "Deleting..." : "Delete Company"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              className="bg-[#C8D84D] hover:bg-[#b8c844] text-foreground border-[#C8D84D]"
              onClick={handleSave}
              disabled={updateCompany.isPending}
            >
              {updateCompany.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Done
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
