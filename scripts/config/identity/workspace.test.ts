import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

function manifest(relativePath: string) {
  return JSON.parse(
    readFileSync(resolve(root, relativePath), "utf8"),
  ) as Record<string, Record<string, string>>;
}

describe("identity dependency and test workspace contract", () => {
  it("pins server, schema, SMTP, image, and server-only dependencies", () => {
    const web = manifest("apps/web/package.json");
    const validation = manifest("packages/validation/package.json");

    expect(web.dependencies).toMatchObject({
      "@supabase/ssr": "0.12.7",
      "@supabase/supabase-js": "2.116.0",
      nodemailer: "8.0.1",
      "server-only": "0.0.1",
      sharp: "0.35.4",
    });
    expect(web.devDependencies).toMatchObject({
      "@types/nodemailer": "8.0.1",
    });
    expect(validation.dependencies).toEqual({ zod: "4.6.5" });
  });

  it("records exact dependency resolutions in the committed lockfile", () => {
    const lockfile = readFileSync(resolve(root, "package-lock.json"), "utf8");

    expect(lockfile).toContain('"@supabase/supabase-js": "2.116.0"');
    expect(lockfile).toContain('"@supabase/ssr": "0.12.7"');
    expect(lockfile).toContain('"sharp": "0.35.4"');
    expect(lockfile).toContain('"zod": "4.6.5"');
  });

  it("includes identity unit and integration locations in root scripts", () => {
    const rootManifest = manifest("package.json");

    expect(rootManifest.scripts["test:unit"]).toContain(
      "apps/web/src/modules/identity",
    );
    expect(rootManifest.scripts["test:integration"]).toContain(
      "tests/integration/identity",
    );
  });

  it("loads the pinned native image processor in the Node 24 runtime", async () => {
    const sharp = await import("sharp");

    expect(typeof sharp.default).toBe("function");
    expect(sharp.default.versions).toHaveProperty("vips");
  });
});
