import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogueName: string;
}

export function CreateProductDialog({ open, onOpenChange, catalogueName }: CreateProductDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: "",
    supplier: "Focus Earth",
    productType: catalogueName.replace(/s$/, ''),
    manufacturer: "",
    orderCode: "",
    length: "",
    wattage: "",
    thd: "",
    width: "",
    lumens: "",
    beamAngle: "",
    diameter: "",
    cct: "",
    optics: "",
    application: "",
    l70Lifetime: "",
    buyAmerica: "",
    style: "",
    warranty: "",
    installationTime: "",
    mount: "",
    voltageMin: "",
    deliveryDays: "",
    shape: "",
    voltageMax: "",
    pricePerUnit: "",
    ingressProtection: "",
    dimmability: "",
    volumeTier1Qty: "",
    lensType: "",
    colorTunable: "",
    volumeTier1PPU: "",
    fixtureColor: "",
    powerFactor: "",
    volumeTier2Qty: "",
    trim: "",
    cbcp: "",
    volumeTier2PPU: "",
    supplierDescription: "",
    installationInstructions: "",
    productSpecifications: "",
    productImage: "",
    compatibleOrderCodes: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Product Created",
      description: `New ${catalogueName.replace(/s$/, '')} has been created successfully.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-accent">Product Details</DialogTitle>
          <Button 
            onClick={handleSubmit}
            className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent"
          >
            <Check className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/50 h-48">
                <ImagePlus className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No image</p>
              </div>
              <Button type="button" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <ImagePlus className="h-4 w-4 mr-2" />
                Upload New Photo
              </Button>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label className="text-primary font-medium">Product Description:</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-medium">Supplier:</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-primary font-medium">Product Type:</Label>
                  <Input
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-medium">Manufacturer:</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-primary font-medium">Order Code:</Label>
                  <Input
                    value={formData.orderCode}
                    onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6" />

          {/* Dimensions and Specs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-primary font-medium">Dimensions - Length (inches):</Label>
              <Input
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Wattage:</Label>
              <Input
                value={formData.wattage}
                onChange={(e) => setFormData({ ...formData, wattage: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">THD (%):</Label>
              <Input
                value={formData.thd}
                onChange={(e) => setFormData({ ...formData, thd: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Dimensions - Width (inches):</Label>
              <Input
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Lumens:</Label>
              <Input
                value={formData.lumens}
                onChange={(e) => setFormData({ ...formData, lumens: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Beam Angle:</Label>
              <Input
                value={formData.beamAngle}
                onChange={(e) => setFormData({ ...formData, beamAngle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Dimensions - Diameter (inches):</Label>
              <Input
                value={formData.diameter}
                onChange={(e) => setFormData({ ...formData, diameter: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">CCT (K°):</Label>
              <Select>
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
              <Input
                value={formData.optics}
                onChange={(e) => setFormData({ ...formData, optics: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="border-t border-border pt-6" />

          {/* Additional Specs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-primary font-medium">Application:</Label>
              <Select>
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
              <Input
                value={formData.l70Lifetime}
                onChange={(e) => setFormData({ ...formData, l70Lifetime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Buy America:</Label>
              <Select>
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
              <Select>
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
              <Input
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Approx. Installation Time (minutes):</Label>
              <Input
                value={formData.installationTime}
                onChange={(e) => setFormData({ ...formData, installationTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Mount:</Label>
              <Select>
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
              <Input
                value={formData.voltageMin}
                onChange={(e) => setFormData({ ...formData, voltageMin: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Approx. Delivery (days):</Label>
              <Input
                value={formData.deliveryDays}
                onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Price Per Unit ($):</Label>
              <Input
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Dimmability:</Label>
              <Select>
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
          </div>

          <div className="border-t border-border pt-6" />

          {/* Notes Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-primary font-medium">Supplier Product Description:</Label>
              <Input
                value={formData.supplierDescription}
                onChange={(e) => setFormData({ ...formData, supplierDescription: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Installation Instructions (hyperlink):</Label>
              <Input
                value={formData.installationInstructions}
                onChange={(e) => setFormData({ ...formData, installationInstructions: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Product Specifications (hyperlink):</Label>
              <Input
                value={formData.productSpecifications}
                onChange={(e) => setFormData({ ...formData, productSpecifications: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-primary font-medium">Notes:</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="destructive" className="bg-destructive hover:bg-destructive/90">
              Delete Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
