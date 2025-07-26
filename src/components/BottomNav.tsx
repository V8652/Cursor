import { Home, Wallet, TrendingUp, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home
  },
  {
    name: "SMS Scan",
    href: "/expenses",
    icon: Wallet
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings
  }
];

export function BottomNav() {
  const location = useLocation();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="backdrop-blur-md bg-background/80 border-t pb-safe">
        <nav className="max-w-screen-lg mx-auto">
          <ul className="flex items-center justify-around h-16">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <li key={item.name} className="w-full h-full">
                  <Link
                    to={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-5 w-5" />
                      {isActive && (
                        <motion.div 
                          className="absolute -inset-1 bg-primary/10 rounded-full -z-10"
                          layoutId="navIndicator"
                          transition={{ type: "spring", duration: 0.5 }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
