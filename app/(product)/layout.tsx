import AppShell from "@/components/AppShell";
import ProductBootstrap from "@/components/ProductBootstrap";
import { getProductBootstrap } from "@/lib/server/product-bootstrap";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bootstrap = await getProductBootstrap();

  return (
    <ProductBootstrap
      session={bootstrap.session}
      subscription={bootstrap.subscription}
      knowledgeBases={bootstrap.knowledgeBases}
      researches={bootstrap.researches}
    >
      <AppShell>{children}</AppShell>
    </ProductBootstrap>
  );
}
