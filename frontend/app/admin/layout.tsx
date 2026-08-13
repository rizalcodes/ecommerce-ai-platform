import type { ReactNode } from "react";

import { DashboardShell } from "@/app/components/dashboard/shell";

const NAV = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/users", label: "Accounts" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell title="Admin" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
