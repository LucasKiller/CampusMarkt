import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as Record<
    string,
    unknown
  >;
}

describe("workspace quality contract", () => {
  it("pins Node 24 and the approved npm workspaces", () => {
    const manifest = readJson("package.json");

    expect(manifest.engines).toEqual({ node: "24.x", npm: "11.x" });
    expect(manifest.workspaces).toEqual(["apps/*", "packages/*"]);
  });

  it("defines every required root quality command", () => {
    const scripts = readJson("package.json").scripts as Record<string, string>;

    expect(Object.keys(scripts)).toEqual(
      expect.arrayContaining([
        "typecheck",
        "lint",
        "format:check",
        "test:unit",
        "test:architecture",
        "test:integration",
        "test:db",
        "test:stack",
        "test:operations",
        "test:e2e",
        "build",
        "check",
        "verify",
      ]),
    );
  });

  it("uses one npm lockfile with exact root tool versions", () => {
    const manifest = readJson("package.json");
    const lockfile = readJson("package-lock.json");
    const versions = Object.values(
      manifest.devDependencies as Record<string, string>,
    );

    expect(versions.every((version) => /^\d+\.\d+\.\d+$/.test(version))).toBe(
      true,
    );
    expect(lockfile.lockfileVersion).toBe(3);
    expect(lockfile.packages).toBeDefined();
  });
});
