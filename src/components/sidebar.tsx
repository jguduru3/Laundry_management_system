import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Shirt,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  Settings,
  Bike,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { useState, useEffect } from "react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onSignOut: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, onSignOut }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from document element class
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Receipt },
    { id: "customers", label: "Customers", icon: Users },
    { id: "agents", label: "Delivery Agents", icon: Bike },
    { id: "services", label: "Services & Pricing", icon: Shirt },
    { id: "settings", label: "Settings & Offers", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-card border border-border shadow-md text-foreground cursor-pointer"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-border bg-card flex flex-col justify-between p-4 transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-border">
            <BrandMark />
            <div>
              <h1 className="font-display text-[1.4rem] leading-none tracking-tight">AquaClean</h1>
              <span className="text-xs text-muted-foreground">Laundry Manager</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-border space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <div className={`
              w-9 h-5 rounded-full p-0.5 transition-colors duration-200
              ${isDark ? "bg-blue-600" : "bg-muted-foreground/30"}
            `}>
              <div className={`
                w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200
                ${isDark ? "translate-x-4" : "translate-x-0"}
              `} />
            </div>
          </button>

          <Link
            href="/portal"
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <ExternalLink className="h-4 w-4" />
            Customer portal
          </Link>

          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
