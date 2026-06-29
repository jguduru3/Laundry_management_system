'use client'

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import DashboardView from "@/components/dashboard-view";
import OrdersView from "@/components/orders-view";
import CustomersView from "@/components/customers-view";
import ServicesView from "@/components/services-view";

export default function Home() {
  const [currentTab, setCurrentTab] = useState("dashboard");

  const renderContent = () => {
    switch (currentTab) {
      case "dashboard":
        return <DashboardView onNavigateToOrders={() => setCurrentTab("orders")} />;
      case "orders":
        return <OrdersView />;
      case "customers":
        return <CustomersView />;
      case "services":
        return <ServicesView />;
      default:
        return <DashboardView onNavigateToOrders={() => setCurrentTab("orders")} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen lg:pl-64 p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto py-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}