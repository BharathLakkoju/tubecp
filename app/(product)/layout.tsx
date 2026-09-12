import AppShell from "@/components/AppShell";
import ProductBootstrap from "@/components/ProductBootstrap";
import { getProductBootstrap } from "@/lib/server/product-bootstrap";

export const dynamic = "force-dynamic";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bootstrap = await getProductBootstrap();

  return (
    <ProductBootstrap
      subscription={bootstrap.subscription}
      knowledgeBases={bootstrap.knowledgeBases}
    >
      <AppShell>{children}</AppShell>
    </ProductBootstrap>
  );
}
