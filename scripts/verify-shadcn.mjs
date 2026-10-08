import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

let pkgPath;
try {
  pkgPath = dirname(require.resolve("shadcn/package.json"));
} catch {
  console.error(
    "\n[postinstall] Missing package \"shadcn\". Run: npm install shadcn@4.21.4\n"
  );
  process.exit(1);
}

const cssPath = join(pkgPath, "dist", "tailwind.css");
if (!existsSync(cssPath)) {
  console.error(
    `\n[postinstall] Wrong "shadcn" package at ${pkgPath} (no dist/tailwind.css).\n` +
      "Use the UI CLI package: npm install shadcn@4.21.4\n" +
      "Do not install the empty npm package shadcn@1.x.\n"
  );
  process.exit(1);
}
