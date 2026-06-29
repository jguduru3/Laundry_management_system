'use client';

import { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  X,
  Eye,
  Receipt
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  orderCount: number;
  totalSpend: number;
  orders?: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export default function CustomersView() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Customer Form States
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      toast({ title: "Validation Error", description: "Name and phone are required.", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail || null,
          address: formAddress || null,
          notes: formNotes || null
        })
      });

      if (!res.ok) throw new Error("Failed to create customer profile.");

      toast({ title: "Customer Added", description: `Profile for ${formName} was created successfully.` });
      setIsAddOpen(false);
      resetForm();
      loadCustomers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormNotes("");
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Customer Database</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage customer profiles and review order logs.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/15 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Search Input */}
      <div className="relative bg-card p-4 rounded-2xl border border-border shadow-sm">
        <Search className="absolute left-7 top-7 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by customer name, phone number, or email address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
        />
      </div>

      {/* Customer Grid */}
      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted-foreground">Loading database records...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No customer profiles found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div 
              key={customer.id} 
              className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Profile Title & Details */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground leading-tight">{customer.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Customer since {new Date(customer.createdAt as any).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-xl">
                    <Users className="h-4 w-4" />
                  </div>
                </div>

                {/* Contact Metadata */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{customer.email || "No email address"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{customer.address || "No address on file"}</span>
                  </div>
                </div>

                {/* Notes */}
                {customer.notes && (
                  <div className="bg-muted p-3 rounded-lg text-xs border border-border/40 text-muted-foreground">
                    <span className="font-bold text-foreground block mb-0.5">Preferences / Notes:</span>
                    {customer.notes}
                  </div>
                )}
              </div>

              {/* Stats Summary */}
              <div className="border-t border-border pt-4 mt-6 flex justify-between items-center text-xs">
                <div className="flex gap-4">
                  <div>
                    <span className="text-muted-foreground block">Orders</span>
                    <span className="font-bold text-foreground text-sm">{customer.orderCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total Spend</span>
                    <span className="font-bold text-foreground text-sm">${customer.totalSpend.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedCustomer(customer); setIsDetailsOpen(true); }}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground font-semibold flex items-center gap-1 cursor-pointer transition-colors duration-150"
                >
                  <Eye className="h-3.5 w-3.5" /> History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD CUSTOMER DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="font-bold text-lg">Add New Customer</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 555-123-4567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Home Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, Apt 4"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferences / Special Notes</label>
                <textarea
                  rows={2}
                  placeholder="Sensitive skin, starch on shirts, lavender softener..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAILS & HISTORY MODAL */}
      {isDetailsOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div>
                <h3 className="font-bold text-lg">{selectedCustomer.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats Summary row */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/80">
                <div className="text-center border-r border-border">
                  <span className="text-xs text-muted-foreground block uppercase font-semibold">Total Orders</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block">{selectedCustomer.orderCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground block uppercase font-semibold">Total Spent</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">${selectedCustomer.totalSpend.toFixed(2)}</span>
                </div>
              </div>

              {/* Order Logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Receipt className="h-4 w-4 text-muted-foreground" /> Order History
                </h4>
                
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60">
                    {selectedCustomer.orders.map((order) => {
                      let statusBg = "bg-muted text-muted-foreground";
                      if (order.status === "DELIVERED") statusBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                      else if (order.status === "READY") statusBg = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
                      else if (order.status === "WASHING" || order.status === "DRYING" || order.status === "IRONING") statusBg = "bg-orange-500/10 text-orange-600 dark:text-orange-400";
                      else if (order.status === "PENDING") statusBg = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";

                      return (
                        <div key={order.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors duration-150">
                          <div>
                            <span className="font-semibold text-foreground block text-sm">{order.orderNumber}</span>
                            <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBg}`}>
                              {order.status}
                            </span>
                            <span className="font-bold text-sm text-foreground">${order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    This customer has not placed any orders yet.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-muted border border-border hover:bg-muted/70 text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
