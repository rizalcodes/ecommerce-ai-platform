import type { ReactNode } from "react";

import { SiteFooter } from "@/app/components/site/site-footer";
import { SiteHeader } from "@/app/components/site/site-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
