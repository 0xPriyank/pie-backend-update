import { $ } from "bun";

async function run() {
  console.clear();

  console.log('[INFO] Removing "dist" directory...');
  try {
    await $`rm -rf ./dist`;
  } catch {
    console.error('[ERROR] Failed to remove "dist" directory');
    process.exit(1);
  }

  console.log("[INFO] Running lint...");
  try {
    await $`bun run lint`;
  } catch {
    console.error("[ERROR] Linting failed. Run 'bun run lint' to investigate.");
    process.exit(1);
  }

  if (process.env.FIX_LINT === "true") {
    console.log("[INFO] Attempting to fix lint issues...");
    try {
      await $`bun run lint:fix`;
    } catch {
      console.error("[ERROR] Failed to auto-fix lint issues");
      process.exit(1);
    }
  }

  console.log("[INFO] Checking code format...");
  try {
    await $`bun run format:check`;
  } catch {
    console.warn("[WARN] Code format issues found. Attempting to auto-fix...");
    try {
      await $`bun run format:write`;
      console.log("[INFO] Code has been auto-formatted");
    } catch {
      console.error("[ERROR] Failed to auto-format code");
      process.exit(1);
    }
  }

  console.log("[INFO] Building application...");
  try {
    await $`bun run build`;
  } catch {
    console.error("[ERROR] Failed to build application");
    process.exit(1);
  }

  console.log("[INFO] Starting application...");
  try {
    await $`bun run start`;
  } catch {
    console.error("[ERROR] Failed to start application");
    process.exit(1);
  }

  console.log("[INFO] Pre-deployment checks completed successfully");
  process.exit(0);
}

run();
