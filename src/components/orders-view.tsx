'use client';

import { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Filter, 
  Check, 
  DollarSign, 
  Printer, 
  Clock, 
  Trash2, 
  Eye,
  X,
  ChevronRight,
  Globe,
  MapPin,
  MessageCircle,
  Star,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_FEE, formatINR, gstBreakup } from "@/lib/pricing";
import { StatusBadge, StatusTracker, STATUS_FLOW, STATUS_META } from "@/components/order-status";
import { formatIndianMobile, fullAddress, slotLabel } from "@/lib/hyderabad";
import type { PublicSettings } from "@/lib/settings";

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface OrderItem {
  id: string;
  service: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  platformFee: number;
  source: string;
  deliveryType: string;
  expressCharge: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string | null;
  pickupSlot?: string | null;
  area?: string | null;
  address?: string | null;
  rating?: number | null;
  pickupAgentId?: string | null;
  deliveryAgentId?: string | null;
  pickupAgent?: { id: string; name: string; phone: string } | null;
  deliveryAgent?: { id: string; name: string; phone: string } | null;
  agentNotes?: string | null;
  collectedAmount?: number | null;
  collectedVia?: string | null;
  feedback?: string | null;
  totalAmount: number;
  notes?: string | null;
  pickupDate: string;
  deliveryDate?: string | null;
  items: OrderItem[];
  createdAt: string;
}

const STATUS_STEPS = STATUS_FLOW;

export default function OrdersView() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // New Order Form States
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
  const [formPaymentStatus, setFormPaymentStatus] = useState("UNPAID");
  const [formNotes, setFormNotes] = useState("");
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formDeliveryType, setFormDeliveryType] = useState("STANDARD");
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string; zone: string | null; isActive: boolean }[]>([]);
  const [formItems, setFormItems] = useState<Array<{ serviceId: string; quantity: number; notes: string }>>([
    { serviceId: "", quantity: 1, notes: "" }
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ordersRes = await fetch(`/api/orders?status=${statusFilter}&search=${search}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData);

      const customersRes = await fetch("/api/customers");
      const customersData = await customersRes.json();
      setCustomers(customersData);

      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) setSettings((await settingsRes.json()).settings);

      const agentsRes = await fetch("/api/agents");
      if (agentsRes.ok) setAgents(await agentsRes.json());

      const servicesRes = await fetch("/api/services");
      const servicesData = await servicesRes.json();
      setServices(servicesData.filter((s: Service) => s.id)); // filter active
    } catch (error) {
      console.error("Error loading orders data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      toast({ title: "Validation Error", description: "Please select a customer.", variant: "destructive" });
      return;
    }

    const validItems = formItems.filter(item => item.serviceId && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one laundry item.", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formCustomerId,
          paymentMethod: formPaymentMethod,
          paymentStatus: formPaymentStatus,
          notes: formNotes,
          deliveryDate: formDeliveryDate || null,
          deliveryType: formDeliveryType,
          items: validItems
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }

      toast({ title: "Success", description: "Order created successfully." });
      setIsCreateOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      const updated = await res.json();
      setSelectedOrder(updated);
      toast({ title: "Status Updated", description: `Order status changed to ${nextStatus}.` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAssign = async (orderId: string, field: "pickupAgentId" | "deliveryAgentId", agentId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: agentId || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign agent");
      setSelectedOrder(data);
      toast({ title: "Agent updated", description: agentId ? `Assigned to ${agents.find(a => a.id === agentId)?.name}.` : "Assignment cleared." });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdatePayment = async (orderId: string, paymentStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus })
      });

      if (!res.ok) throw new Error("Failed to update payment status");
      
      const updated = await res.json();
      setSelectedOrder(updated);
      toast({ title: "Payment Updated", description: "Order marked as PAID." });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Cancelling keeps the order (and its bill) on record instead of deleting it.
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this order? It will stay on record as CANCELLED.")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });
      if (!res.ok) throw new Error("Failed to cancel order");

      toast({ title: "Order Cancelled", description: "The order was marked as cancelled." });
      setIsDetailsOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormCustomerId("");
    setFormPaymentMethod("CASH");
    setFormPaymentStatus("UNPAID");
    setFormNotes("");
    setFormDeliveryDate("");
    setFormItems([{ serviceId: "", quantity: 1, notes: "" }]);
  };

  const calculateFormSubtotal = () => {
    return formItems.reduce((sum, item) => {
      const service = services.find(s => s.id === item.serviceId);
      if (!service) return sum;
      return sum + (service.price * item.quantity);
    }, 0);
  };

  // Counter orders: no delivery fee; express adds the configured surcharge.
  const formExpressCharge = () =>
    formDeliveryType === "EXPRESS" ? Math.round(calculateFormSubtotal() * (settings?.expressRate ?? 0)) / 100 : 0;
  const formPlatformFee = () => settings?.platformFee ?? PLATFORM_FEE;
  const calculateFormTotal = () => calculateFormSubtotal() + formExpressCharge() + formPlatformFee();

  const handleAddItem = () => {
    setFormItems([...formItems, { serviceId: "", quantity: 1, notes: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const billLines = (o: Order): [string, number][] => {
    const subtotal = o.items.reduce((sum, i) => sum + i.totalPrice, 0);
    const lines: [string, number][] = [["Items Subtotal", subtotal]];
    if (o.expressCharge > 0) lines.push(["Express Charge", o.expressCharge]);
    if (o.discount > 0) lines.push([`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`, -o.discount]);
    if (o.deliveryFee > 0) lines.push(["Pickup & Delivery", o.deliveryFee]);
    lines.push(["Platform Fee", o.platformFee]);
    return lines;
  };

  const whatsAppLink = (o: Order) => {
    const digits = o.customer.phone.replace(/\D/g, "");
    const to = digits.length === 10 ? `91${digits}` : digits;
    const firstName = o.customer.name.split(" ")[0];
    const status = STATUS_META[o.status]?.label ?? o.status;
    const due = o.paymentStatus === "PAID" ? "" : ` Amount due: ${formatINR(o.totalAmount)}.`;
    const text = `Hi ${firstName}, your ${settings?.businessName ?? "laundry"} order ${o.orderNumber} is now: ${status}.${due}`;
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-4xl tracking-tight">Order Management</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Track, update, and create customer laundry orders.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/15 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Create Order
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          >
            <option value="ALL">All Statuses</option>
            {[...STATUS_FLOW, "CANCELLED"].map((st) => (
              <option key={st} value={st}>{STATUS_META[st].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No orders match the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground font-semibold bg-muted/40">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orders.map((order) => {
                  const paymentBg = order.paymentStatus === "PAID" 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400";

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <td className="p-4">
                        <div className="font-semibold text-foreground">{order.orderNumber}</div>
                        {order.deliveryType === "EXPRESS" && (
                          <span className="mt-1 mr-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                            <Zap className="h-3 w-3" /> Express
                          </span>
                        )}
                        {order.source === "PORTAL" && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                            <Globe className="h-3 w-3" /> Online
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground">{order.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{formatIndianMobile(order.customer.phone)}</div>
                        {order.area && <div className="text-xs text-muted-foreground">{order.area}</div>}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("en-IN") : "Not scheduled"}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={order.status} />
                        {order.source === "PORTAL" && !["DELIVERED", "CANCELLED"].includes(order.status) && (() => {
                          const agent = order.status === "PENDING" ? order.pickupAgent : order.deliveryAgent;
                          const needsAgent = order.status === "PENDING" || ["READY", "OUT_FOR_DELIVERY"].includes(order.status);
                          if (!needsAgent) return null;
                          return (
                            <div className={`mt-1 text-[11px] ${agent ? "text-muted-foreground" : "text-amber-600 font-medium"}`}>
                              {agent ? agent.name : "No agent assigned"}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${paymentBg}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-foreground">
                        {formatINR(order.totalAmount)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); setIsReceiptOpen(true); }}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground cursor-pointer"
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="font-bold text-lg">Create New Laundry Order</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Turnaround</label>
                  <select
                    value={formDeliveryType}
                    onChange={(e) => setFormDeliveryType(e.target.value)}
                    className="w-full mb-3 py-2 px-3 rounded-xl border border-border bg-background text-sm"
                  >
                    <option value="STANDARD">Standard ({settings?.standardHours ?? 48}h)</option>
                    <option value="EXPRESS">Express ({settings?.expressHours ?? 24}h, +{settings?.expressRate ?? 0}%)</option>
                  </select>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Target Delivery Date (optional)</label>
                  <input
                    type="date"
                    value={formDeliveryDate}
                    onChange={(e) => setFormDeliveryDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Laundry Items / Services</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/40 border border-border/60 rounded-xl">
                    <select
                      value={item.serviceId}
                      onChange={(e) => handleItemChange(idx, "serviceId", e.target.value)}
                      className="flex-1 w-full sm:w-auto py-2 px-3 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="">Select Laundry Service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({formatINR(s.price)} / {s.unit})</option>
                      ))}
                    </select>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20 py-2 px-3 rounded-lg border border-border bg-background text-sm text-center"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {services.find(s => s.id === item.serviceId)?.unit || ""}
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Notes (e.g. stains, hang dry)"
                      value={item.notes}
                      onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                      className="flex-1 w-full sm:w-auto py-2 px-3 rounded-lg border border-border bg-background text-sm"
                    />

                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Status</label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-border bg-background text-sm"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-border bg-background text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="MOBILE">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Special Order Notes</label>
                  <textarea
                    rows={1}
                    placeholder="General comments..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-blue-600/5 dark:bg-blue-500/5 p-4 rounded-xl border border-blue-500/15 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Items Subtotal</span>
                  <span>{formatINR(calculateFormSubtotal())}</span>
                </div>
                {formDeliveryType === "EXPRESS" && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Express Charge</span>
                    <span>{formatINR(formExpressCharge())}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Platform Fee</span>
                  <span>{formatINR(formPlatformFee())}</span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-500/15 pt-2">
                  <div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Total Calculated Invoice:</span>
                    <p className="text-xs text-muted-foreground">Based on current rates</p>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatINR(calculateFormTotal())}
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS & TIMELINE MODAL */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div>
                <h3 className="font-bold text-lg">Order Details - {selectedOrder.orderNumber}</h3>
                <p className="text-xs text-muted-foreground">Created {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}</p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TIMELINE PROGRESS TRACKER */}
              <div className="bg-muted/40 border border-border/80 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Order Progress Tracker</h4>
                <StatusTracker status={selectedOrder.status} />
              </div>

              {/* Pickup & delivery agents (doorstep orders) */}
              {(selectedOrder.source === "PORTAL" || selectedOrder.pickupAgentId || selectedOrder.deliveryAgentId) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border p-4">
                  {([
                    ["pickupAgentId", "Pickup agent", selectedOrder.pickupAgentId, selectedOrder.status === "PENDING"],
                    ["deliveryAgentId", "Delivery agent", selectedOrder.deliveryAgentId, !["DELIVERED", "CANCELLED"].includes(selectedOrder.status)],
                  ] as const).map(([field, title, value, editable]) => (
                    <label key={field} className="block">
                      <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</span>
                      <select
                        value={value ?? ""}
                        disabled={!editable}
                        onChange={(e) => handleAssign(selectedOrder.id, field, e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm disabled:opacity-70"
                      >
                        <option value="">Unassigned</option>
                        {agents.filter(a => a.isActive || a.id === value).map(a => (
                          <option key={a.id} value={a.id}>{a.name}{a.zone ? ` (${a.zone})` : ""}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  {selectedOrder.collectedAmount != null && (
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                      Agent collected {formatINR(selectedOrder.collectedAmount)} by {selectedOrder.collectedVia === "MOBILE" ? "UPI" : "cash"}.
                    </p>
                  )}
                  {selectedOrder.agentNotes && (
                    <pre className="sm:col-span-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground rounded-xl bg-muted/60 p-3">{selectedOrder.agentNotes}</pre>
                  )}
                </div>
              )}

              {/* Customer & Order Data columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Customer Profile</h4>
                  <div>
                    <p className="font-bold text-foreground text-base">{selectedOrder.customer.name}</p>
                    <p className="text-sm text-muted-foreground">Phone: {formatIndianMobile(selectedOrder.customer.phone)}</p>
                    {(selectedOrder.address || selectedOrder.area) && (
                      <p className="text-sm text-muted-foreground mt-2 flex gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{fullAddress(selectedOrder.address, selectedOrder.area)}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Order Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <span className={`font-semibold ${selectedOrder.paymentStatus === "PAID" ? "text-emerald-600" : "text-red-500"}`}>{selectedOrder.paymentStatus}</span>
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium text-foreground">{selectedOrder.paymentMethod === "MOBILE" ? "UPI" : selectedOrder.paymentMethod}</span>
                    <span className="text-muted-foreground">Pickup:</span>
                    <span className="font-medium text-foreground">
                      {selectedOrder.pickupDate ? new Date(selectedOrder.pickupDate).toLocaleDateString("en-IN") : "N/A"}
                      {selectedOrder.pickupSlot ? `, ${slotLabel(selectedOrder.pickupSlot)}` : ""}
                    </span>
                    <span className="text-muted-foreground">Expected Delivery:</span>
                    <span className="font-medium text-foreground">{selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString("en-IN") : "N/A"}</span>
                    <span className="text-muted-foreground">Turnaround:</span>
                    <span className="font-medium text-foreground inline-flex items-center gap-1">
                      {selectedOrder.deliveryType === "EXPRESS" ? <><Zap className="h-3.5 w-3.5 text-amber-500" /> Express</> : "Standard"}
                    </span>
                    {selectedOrder.rating ? (
                      <>
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="font-medium text-foreground inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {selectedOrder.rating}/5
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Washing Items</h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-xs text-muted-foreground font-semibold border-b border-border">
                        <th className="p-3">Item / Service</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{item.service.name}</div>
                            {item.notes && <div className="text-xs text-orange-500">Note: {item.notes}</div>}
                          </td>
                          <td className="p-3 text-center text-foreground">{item.quantity} {item.service.unit}</td>
                          <td className="p-3 text-right text-muted-foreground">{formatINR(item.unitPrice)}</td>
                          <td className="p-3 text-right font-bold text-foreground">{formatINR(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                  <h4 className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-1">Order Notes</h4>
                  <p className="text-sm text-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.feedback && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Customer Feedback</h4>
                  <p className="text-sm text-foreground">{selectedOrder.feedback}</p>
                </div>
              )}

              {/* Total Cost */}
              <div className="border-t border-border pt-4 space-y-1 text-sm text-muted-foreground">
                {billLines(selectedOrder).map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className={value < 0 ? "text-emerald-600" : ""}>{value < 0 ? `- ${formatINR(-value)}` : formatINR(value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Grand Total:</span>
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{formatINR(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="p-6 border-t border-border flex flex-wrap justify-between items-center gap-3">
              {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "DELIVERED" ? (
              <button
                onClick={() => handleCancelOrder(selectedOrder.id)}
                className="px-4 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Cancel Order
              </button>
              ) : <span />}

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={whatsAppLink(selectedOrder)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/5 text-sm font-semibold flex items-center gap-1.5"
                  title="Send a status update on WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <button
                  onClick={() => setIsReceiptOpen(true)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold flex items-center gap-1.5 cursor-pointer text-foreground"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </button>

                {selectedOrder.paymentStatus !== "PAID" && (
                  <button
                    onClick={() => handleUpdatePayment(selectedOrder.id, "PAID")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Mark Paid
                  </button>
                )}

                {selectedOrder.status !== "DELIVERED" && selectedOrder.status !== "CANCELLED" && (
                  <button
                    onClick={() => {
                      const currentIdx = STATUS_STEPS.indexOf(selectedOrder.status);
                      if (currentIdx < STATUS_STEPS.length - 1) {
                        handleUpdateStatus(selectedOrder.id, STATUS_STEPS[currentIdx + 1]);
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Mark {STATUS_META[STATUS_STEPS[STATUS_STEPS.indexOf(selectedOrder.status) + 1]]?.label} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {isReceiptOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-black p-8 rounded-lg max-w-md w-full shadow-2xl relative print:p-0 print:shadow-none print:w-full">
            <button 
              onClick={() => setIsReceiptOpen(false)} 
              className="absolute top-4 right-4 p-1 text-gray-500 hover:text-black print:hidden cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Receipt Body */}
            <div className="space-y-6 text-center font-mono">
              <div>
                <h2 className="text-xl font-bold tracking-widest uppercase">{settings?.businessName ?? "AquaClean Laundry"}</h2>
                <p className="text-xs text-gray-500">{settings?.address}</p>
                <p className="text-xs text-gray-500">Tel: {settings?.phone}</p>
                {settings?.gstin && <p className="text-xs text-gray-500">GSTIN: {settings.gstin}</p>}
                <p className="text-xs font-bold mt-2">TAX INVOICE</p>
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-3 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span>ORDER NO:</span>
                  <span className="font-bold">{selectedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="font-bold">{selectedOrder.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>PHONE:</span>
                  <span>{formatIndianMobile(selectedOrder.customer.phone)}</span>
                </div>
                {selectedOrder.area && (
                  <div className="flex justify-between">
                    <span>AREA:</span>
                    <span>{selectedOrder.area}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>SERVICE:</span>
                  <span>{selectedOrder.deliveryType === "EXPRESS" ? "EXPRESS" : "STANDARD"}</span>
                </div>
              </div>

              {/* Items list */}
              <div className="text-left text-xs space-y-2">
                <div className="flex justify-between font-bold border-b border-gray-200 pb-1">
                  <span>Service Description</span>
                  <span>Qty</span>
                  <span>Sub</span>
                </div>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>{item.service.name}</span>
                      <span>{item.quantity}</span>
                      <span>{formatINR(item.totalPrice)}</span>
                    </div>
                    {item.notes && (
                      <div className="text-[10px] text-gray-600 pl-2">
                        * {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-400 pt-3 text-sm space-y-1">
                {billLines(selectedOrder).map(([label, value]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span>{label.toUpperCase()}:</span>
                    <span>{value < 0 ? `- ${formatINR(-value)}` : formatINR(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base">
                  <span>{selectedOrder.paymentStatus === "PAID" ? "TOTAL PAID:" : "TOTAL DUE:"}</span>
                  <span>{formatINR(selectedOrder.totalAmount)}</span>
                </div>
                {settings && settings.gstRate > 0 && (() => {
                  const g = gstBreakup(selectedOrder.totalAmount, settings.gstRate);
                  return (
                    <div className="text-[10px] text-gray-600 pt-1 space-y-0.5">
                      <div className="flex justify-between"><span>TAXABLE VALUE:</span><span>{formatINR(g.taxable)}</span></div>
                      <div className="flex justify-between"><span>CGST {settings.gstRate / 2}%:</span><span>{formatINR(g.cgst)}</span></div>
                      <div className="flex justify-between"><span>SGST {settings.gstRate / 2}%:</span><span>{formatINR(g.sgst)}</span></div>
                      <div className="text-left">Prices are inclusive of GST.</div>
                    </div>
                  );
                })()}
                <div className="flex justify-between text-xs text-gray-600">
                  <span>PAY METHOD:</span>
                  <span>{selectedOrder.paymentMethod === "MOBILE" ? "UPI" : selectedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>PAY STATUS:</span>
                  <span className="font-bold">{selectedOrder.paymentStatus}</span>
                </div>
              </div>

              {/* QR / Barcode mockup */}
              <div className="pt-4 flex flex-col items-center justify-center space-y-2">
                <div className="w-48 h-8 bg-black flex items-center justify-between px-1">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="h-full bg-white" style={{ width: `${Math.random() > 0.5 ? '2px' : '4px'}` }} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-500">{selectedOrder.id.toUpperCase().slice(0, 12)}</span>
              </div>

              <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                <p>Thank you for choosing {settings?.businessName ?? "AquaClean"}!</p>
                <p>Re-clean guarantee: report issues within 48 hours of delivery.</p>
              </div>
            </div>

            {/* Print trigger button */}
            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 text-sm cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
