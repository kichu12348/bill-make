import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function prerender() {
  // Import the server build
  const { render } = await import("./dist/server/Test.js");

  // Generate the app HTML
  const appHtml = render();

  // Read the client HTML template
  const template = fs.readFileSync(
    path.resolve(__dirname, "dist/index.html"),
    "utf-8",
  );

  // Replace the placeholder with rendered HTML
  const html = template.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`,
  );

  // Write the final HTML
  fs.writeFileSync(path.resolve(__dirname, "dist/index.html"), html);

  console.log("✅ Pre-rendered HTML generated!");
}

prerender().catch((err) => {
  console.error("Pre-rendering failed:", err);
  process.exit(1);
});
