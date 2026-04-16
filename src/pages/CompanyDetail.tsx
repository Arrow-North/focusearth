import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Loader2,
  Upload,
  RefreshCw,
  UserPlus,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  Search,
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
  "Retail": "#06b6d4",
  "Multi Family": "#84cc16",
  "Hospitality": "#14b8a6",
  "Parking": "#f59e0b",
  "Horticulture": "#eab308",
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
        // Only allow increase if total won't exceed 100
        const room = 100 - total;
        if (room <= 0) return prev;
        const increment = Math.min(STEP, room);
        updated[index] = { ...updated[index], percentage: current + increment };
      } else {
        // Decrease, floor at 0
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
      <DashboardLayout title="Companies / ...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout title="Company Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Company not found</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
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

  return (
    <DashboardLayout title={`Companies / ${company.name}`}>
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Company Header */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="shrink-0">
              {companyImage.startsWith("http") ? (
                <div className="w-20 h-20 rounded border border-border overflow-hidden">
                  <img
                    src={companyImage}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded border border-border bg-muted flex items-center justify-center text-4xl">
                  {companyImage || company.name?.charAt(0) || "?"}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
            </div>

            {/* Name + Type */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-6">
                {isEditing ? (
                  <Input
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="text-xl font-semibold bg-card border-border max-w-md"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-foreground">{company.name}</h2>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-muted-foreground whitespace-nowrap">Company Type:</Label>
                  {isEditing ? (
                    <Select
                      value={form.type}
                      onValueChange={(val) => handleChange("type", val)}
                    >
                      <SelectTrigger className="w-40 bg-card border-border">
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
                    <span className="text-sm font-medium text-foreground">
                      {ADMIN_COMPANY_TYPES[company.type] ?? company.type}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-status-green hover:bg-status-green/90 text-white border-status-green"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <div className="flex items-center gap-2">
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
                  </>
                ) : (
                  <div className="ml-auto">
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-status-orange/20 hover:bg-status-orange/30 text-status-orange border border-status-orange"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address & Details */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          {/* Address row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Address:</Label>
              {isEditing ? (
                <Input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="mt-1 bg-card border-border"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.address || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-primary font-medium">Address Line 2:</Label>
              {isEditing ? (
                <Input
                  value={form.address2}
                  onChange={(e) => handleChange("address2", e.target.value)}
                  className="mt-1 bg-card border-border"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.address2 || "—"}</p>
              )}
            </div>
          </div>

          {/* City / State / Zip / Country */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-primary font-medium">City:</Label>
              {isEditing ? (
                <Input
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="mt-1 bg-card border-border"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.city || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-primary font-medium">State:</Label>
              {isEditing ? (
                <Select
                  value={form.state}
                  onValueChange={(val) => handleChange("state", val)}
                >
                  <SelectTrigger className="mt-1 bg-card border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.state || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-primary font-medium">Zip Code:</Label>
              {isEditing ? (
                <Input
                  value={form.zip_code}
                  onChange={(e) => handleChange("zip_code", e.target.value)}
                  className="mt-1 bg-card border-border"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.zip_code || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-primary font-medium">Country:</Label>
              {isEditing ? (
                <Input
                  value={form.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="mt-1 bg-card border-border"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.country || "—"}</p>
              )}
            </div>
          </div>

          {/* Associated Users + Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Associated Users:</Label>
              <div className="relative mt-1">
                <Input
                  value={associatedUserNames || "No associated users"}
                  readOnly
                  className="bg-card border-border pr-10"
                />
                {associatedUsers.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-[#C8D84D] hover:bg-[#b8c844] rounded"
                    onClick={() => navigate(`/users/${associatedUsers[0]?.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-primary font-medium">Website:</Label>
              {isEditing ? (
                <Input
                  value={form.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="mt-1 bg-card border-border"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{company.website || "—"}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-primary font-medium">Notes:</Label>
            {isEditing ? (
              <Textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="mt-1 bg-card border-border min-h-[100px]"
              />
            ) : (
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{company.notes || "—"}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Property Types Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">
              Serviceable Property Types:
            </h3>
            {isEditing && (
              <span
                className={`text-sm font-medium ${
                  totalPercentage === 100
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                Total: {totalPercentage}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
            {/* Property Type Cards */}
            <div className="grid grid-cols-2 gap-3">
              {allProperties.map((property, index) => (
                <div
                  key={property.name}
                  className="bg-card rounded-lg border border-border p-3 flex items-center gap-2"
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: property.color }}
                  />
                  <span className="text-sm font-medium flex-1 truncate">
                    {property.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePriorityChange(index, 1)}
                          className="text-[#5B6FAF] hover:text-[#4a5d99] transition-colors"
                        >
                          <PlusCircle className="h-6 w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePriorityChange(index, -1)}
                          className="text-[#5B6FAF] hover:text-[#4a5d99] transition-colors"
                        >
                          <MinusCircle className="h-6 w-6" />
                        </button>
                      </>
                    )}
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {property.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="h-64 w-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
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
        <hr className="border-border" />

        {/* Uploaded Files Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="grid grid-cols-2 flex-1 gap-4 text-sm font-medium text-muted-foreground">
              <span>Uploaded Files</span>
              <span>Date</span>
            </div>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="bg-[#5B6FAF] hover:bg-[#4a5d99] text-white border-[#5B6FAF]"
              >
                <Search className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            )}
          </div>
          <div className="py-8 text-center text-muted-foreground border-t border-border">
            No files uploaded yet
          </div>
        </div>

        {/* Bottom Action Buttons — only in edit mode */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pb-6">
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
