import type { ReactNode } from "react";

import { DashboardShell } from "@/app/components/dashboard/shell";

const NAV = [
  { href: "/seller/dashboard", label: "Overview" },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/inquiries", label: "Inquiries" },
  { href: "/seller/profile", label: "Shop profile" },
];

export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell title="Seller" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
