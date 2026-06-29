'use client';

import { useState, useEffect } from "react";
import { 
  Plus, 
  Shirt, 
  Settings, 
  Trash2, 
  Edit, 
  Check, 
  X,
  Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description?: string | null;
  isActive: boolean;
}

const CATEGORIES = [
  { id: "wash", name: "Wash & Dry" },
  { id: "dry_clean", name: "Dry Cleaning" },
  { id: "ironing", name: "Ironing Only" },
  { id: "specialty", name: "Specialty Treatments" }
];

export default function ServicesView() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");

  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form States
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("wash");
  const [formPrice, setFormPrice] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formDescription, setFormDescription] = useState("");

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormName("");
    setFormCategory("wash");
    setFormPrice("");
    setFormUnit("kg");
    setFormDescription("");
    setIsOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    setFormName(s.name);
    setFormCategory(s.category);
    setFormPrice(s.price.toString());
    setFormUnit(s.unit);
    setFormDescription(s.description || "");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) {
      toast({ title: "Validation Error", description: "Name and Price are required.", variant: "destructive" });
      return;
    }

    try {
      const body: any = {
        name: formName,
        category: formCategory,
        price: parseFloat(formPrice),
        unit: formUnit,
        description: formDescription || null
      };

      if (editingService) {
        body.id = editingService.id;
        body.isActive = editingService.isActive;
      }

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to save service");

      toast({ 
        title: "Success", 
        description: editingService ? "Service updated successfully." : "New service created successfully." 
      });
      setIsOpen(false);
      loadServices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (s: Service) => {
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...s,
          isActive: !s.isActive
        })
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      toast({ 
        title: "Status Updated", 
        description: `${s.name} is now ${!s.isActive ? "active" : "inactive"}.` 
      });
      loadServices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredServices = services.filter(s => 
    activeCategory === "ALL" || s.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Services & Pricing</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage laundry catalog items and adjustment rates.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/15 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
            activeCategory === "ALL" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Items
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeCategory === cat.id 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted-foreground">Loading services catalog...</div>
      ) : filteredServices.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No services listed in this category.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div 
              key={service.id} 
              className={`bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200 ${
                service.isActive ? "border-border" : "border-border/40 opacity-70 bg-muted/20"
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted py-0.5 px-2 rounded-md mt-1">
                      {CATEGORIES.find(c => c.id === service.category)?.name || service.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(service)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit Service"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed h-12 overflow-hidden text-ellipsis">
                  {service.description || "No description provided."}
                </p>
              </div>

              {/* Price & Status Toggle */}
              <div className="border-t border-border pt-4 mt-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Service Rate</span>
                  <span className="text-xl font-bold text-foreground">
                    ${service.price.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">/ {service.unit}</span>
                  </span>
                </div>

                <button
                  onClick={() => handleToggleStatus(service)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer border transition-all duration-200 ${
                    service.isActive 
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" 
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {service.isActive ? "Active" : "Disabled"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT SERVICE DIALOG */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="font-bold text-lg">{editingService ? "Edit Service Rate" : "Add Laundry Service"}</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Dry Clean"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-border bg-background text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing Unit *</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-border bg-background text-sm"
                  >
                    <option value="kg">Per kg</option>
                    <option value="piece">Per Piece</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Price Rate ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</label>
                <textarea
                  rows={3}
                  placeholder="Explain details of this service..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
