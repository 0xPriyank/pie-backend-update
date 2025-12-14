import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");

function fixImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const fixedContent = content.replace(/from ['"]([^'"]+)['"]/g, (match, importPath) => {
    // Skip node_modules imports
    if (importPath.startsWith(".")) {
      // Add .js extension to local imports
      if (!importPath.endsWith(".js")) {
        return `from '${importPath}.js'`;
      }
    }
    return match;
  });
  fs.writeFileSync(filePath, fixedContent);
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith(".js")) {
      fixImports(filePath);
    }
  }
}

processDirectory(distDir);
