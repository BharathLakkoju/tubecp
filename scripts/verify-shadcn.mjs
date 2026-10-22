import { existsSync } from "node:fs";
import { join } from "node:path";

const vendoredCss = join(process.cwd(), "app", "shadcn-tailwind.css");

if (!existsSync(vendoredCss)) {
  console.error(
    "\n[postinstall] Missing app/shadcn-tailwind.css.\n" +
      "Restore it from shadcn@4.21.4 (dist/tailwind.css) or run:\n" +
      "  npx shadcn@4.21.4 init\n"
  );
  process.exit(1);
}
