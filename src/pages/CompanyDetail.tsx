import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// Mock company data
const companiesData: Record<string, {
  id: number;
  name: string;
  type: string;
  image: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  associatedUsers: string;
  website: string;
  notes: string;
  propertyTypes: Array<{ name: string; percentage: number; color: string }>;
}> = {
  "1": {
    id: 1,
    name: "Focus Earth Real Estate",
    type: "Real Estate",
    image: "🌍",
    address: "123 Main Street",
    addressLine2: "Suite 100",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    country: "USA",
    associatedUsers: "Admin Support,",
    website: "focusearth.com",
    notes: "Primary real estate partner",
    propertyTypes: [
      { name: "Office", percentage: 30, color: "#ec4899" },
      { name: "Industrial", percentage: 0, color: "#f97316" },
      { name: "Retail", percentage: 0, color: "#06b6d4" },
      { name: "Multi Family", percentage: 0, color: "#84cc16" },
      { name: "Hospitality", percentage: 20, color: "#14b8a6" },
      { name: "Parking", percentage: 20, color: "#f59e0b" },
      { name: "Horticulture", percentage: 0, color: "#eab308" },
      { name: "Healthcare", percentage: 0, color: "#3b82f6" },
      { name: "Data Center", percentage: 0, color: "#a855f7" },
      { name: "Other", percentage: 30, color: "#22c55e" },
    ],
  },
  "2": {
    id: 2,
    name: "LED LAMPS Company",
    type: "Supplier",
    image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=100&h=100&fit=crop",
    address: "Armenia",
    addressLine2: "",
    city: "Erevan",
    state: "AK",
    zipCode: "36066",
    country: "USA",
    associatedUsers: "Focus Supplier,",
    website: "Newlamps.com",
    notes: "Special Led Lamps",
    propertyTypes: [
      { name: "Office", percentage: 10, color: "#ec4899" },
      { name: "Industrial", percentage: 0, color: "#f97316" },
      { name: "Retail", percentage: 0, color: "#06b6d4" },
      { name: "Multi Family", percentage: 0, color: "#84cc16" },
      { name: "Hospitality", percentage: 10, color: "#14b8a6" },
      { name: "Parking", percentage: 10, color: "#f59e0b" },
      { name: "Horticulture", percentage: 0, color: "#eab308" },
      { name: "Healthcare", percentage: 0, color: "#3b82f6" },
      { name: "Data Center", percentage: 0, color: "#a855f7" },
      { name: "Other", percentage: 0, color: "#22c55e" },
    ],
  },
};

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const company = id ? companiesData[id] : null;

  if (!company) {
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

  const pieData = company.propertyTypes.filter(p => p.percentage > 0);

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
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Company Image */}
              {company.image.startsWith("http") ? (
                <div className="w-20 h-20 rounded overflow-hidden">
                  <img src={company.image} alt={company.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded bg-muted flex items-center justify-center text-4xl">
                  {company.image}
                </div>
              )}
              
              <div className="space-y-2">
                <Input 
                  value={company.name} 
                  readOnly={!isEditing}
                  className="text-xl font-semibold bg-card border-border"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Company Type:</Label>
                <Input 
                  value={company.type} 
                  readOnly={!isEditing}
                  className="w-32 bg-card border-border"
                />
              </div>
            </div>

            <Button 
              onClick={() => setIsEditing(!isEditing)}
              className="bg-status-orange/20 hover:bg-status-orange/30 text-status-orange border border-status-orange"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </div>

        {/* Address Info */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Address:</Label>
              <Input 
                value={company.address} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Address Line 2:</Label>
              <Input 
                value={company.addressLine2} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-primary font-medium">City:</Label>
              <Input 
                value={company.city} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">State:</Label>
              <Input 
                value={company.state} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Zip Code:</Label>
              <Input 
                value={company.zipCode} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Country:</Label>
              <Input 
                value={company.country} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Associated Users:</Label>
              <Input 
                value={company.associatedUsers} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Website:</Label>
              <Input 
                value={company.website} 
                readOnly={!isEditing}
                className="mt-1 bg-card border-border"
              />
            </div>
          </div>

          <div>
            <Label className="text-primary font-medium">Notes:</Label>
            <Textarea 
              value={company.notes} 
              readOnly={!isEditing}
              className="mt-1 bg-card border-border min-h-[100px]"
            />
          </div>
        </div>

        {/* Property Types Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-6">Serviceable Property Types:</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Property Type Cards */}
            <div className="grid grid-cols-2 gap-3">
              {company.propertyTypes.map((property) => (
                <div
                  key={property.name}
                  className="bg-card rounded-lg border border-border p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-1 h-8 rounded-full" 
                      style={{ backgroundColor: property.color }}
                    />
                    <span className="text-sm font-medium">{property.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{property.percentage}%</span>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: "No Data", percentage: 100, color: "#e5e7eb" }]}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={0}
                  >
                    {(pieData.length > 0 ? pieData : [{ name: "No Data", percentage: 100, color: "#e5e7eb" }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Uploaded Files Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid grid-cols-2 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
            <span>Uploaded Files</span>
            <span>Date</span>
          </div>
          <div className="py-8 text-center text-muted-foreground">
            No files uploaded yet
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
