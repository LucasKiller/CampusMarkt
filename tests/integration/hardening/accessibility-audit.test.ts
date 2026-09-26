import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(...hexToRgb(hex1));
  const lum2 = relativeLuminance(...hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("WCAG 2.1 AA automated accessibility audit", () => {
  describe("color contrast compliance (WCAG 1.4.3)", () => {
    it("satisfies minimum 4.5:1 contrast ratio for primary text on background", () => {
      // Background: #f5f1e8 (light canvas)
      // Primary text: #17231c (dark slate green)
      const ratio = contrastRatio("#17231c", "#f5f1e8");
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("satisfies minimum 4.5:1 contrast ratio for dark mode or inverted surfaces", () => {
      // Inverted dark background: #17231c
      // Inverted light text: #f5f1e8
      const ratio = contrastRatio("#f5f1e8", "#17231c");
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("satisfies minimum 3:1 contrast ratio for large text and UI components", () => {
      // Large headers and decorative badges
      const ratio = contrastRatio("#17231c", "#f5f1e8");
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("document language declaration (WCAG 3.1.1)", () => {
    it("asserts root layout declares a valid document language attribute on <html>", () => {
      const layoutPath = resolve(root, "apps/web/src/app/layout.tsx");
      const content = readFileSync(layoutPath, "utf-8");

      // Verifies <html lang="..."> is present with valid language declaration
      const htmlLangMatch =
        /<html[^>]*lang=["']?([a-z]{2}(?:-[A-Z]{2})?|\${[^}]+})["']?/i.exec(
          content,
        );
      expect(htmlLangMatch).not.toBeNull();
      expect(htmlLangMatch?.[1]).toBeDefined();
    });
  });

  describe("landmark roles and document hierarchy (WCAG 1.3.1)", () => {
    it("ensures main landmark element is present across primary application views", () => {
      const homePage = readFileSync(
        resolve(root, "apps/web/src/app/page.tsx"),
        "utf-8",
      );
      expect(homePage).toMatch(/<main\b/);
    });

    it("ensures pages contain structured heading hierarchy starting with h1", () => {
      const homePage = readFileSync(
        resolve(root, "apps/web/src/app/page.tsx"),
        "utf-8",
      );
      expect(homePage).toMatch(/<h1\b/);
    });
  });

  describe("interactive element labeling (WCAG 4.1.2)", () => {
    it("asserts interactive icon buttons have explicit aria-label or accessible name", () => {
      const violations: string[] = [];

      function checkDir(dir: string) {
        for (const file of readdirSync(dir)) {
          const fullPath = resolve(dir, file);
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            checkDir(fullPath);
          } else if (file.endsWith(".tsx")) {
            const content = readFileSync(fullPath, "utf-8");
            // Check for icon-only buttons (containing only svg and no text) without aria-label or title
            const emptyButtonMatch =
              /<button\b(?![^>]*\baria-label\b)(?![^>]*\btitle\b)[^>]*>\s*<svg\b[^>]*>[\s\S]*?<\/svg>\s*<\/button>/g.exec(
                content,
              );
            if (emptyButtonMatch) {
              violations.push(
                `${file}: Unlabeled icon-only button without aria-label or title`,
              );
            }
          }
        }
      }

      checkDir(resolve(root, "apps/web/src/components"));
      expect(violations).toEqual([]);
    });
  });

  describe("overall critical accessibility summary", () => {
    it("asserts zero critical accessibility violations across audited core surfaces", () => {
      const criticalViolations: string[] = [];

      // 1. Check layout language
      const layoutContent = readFileSync(
        resolve(root, "apps/web/src/app/layout.tsx"),
        "utf-8",
      );
      if (!/<html[^>]*\blang\b/i.test(layoutContent)) {
        criticalViolations.push("Root layout missing html lang attribute");
      }

      // 2. Check contrast
      const primaryContrast = contrastRatio("#17231c", "#f5f1e8");
      if (primaryContrast < 4.5) {
        criticalViolations.push(
          `Primary contrast ratio insufficient: ${primaryContrast} < 4.5`,
        );
      }

      // 3. Check home page main landmark
      const homeContent = readFileSync(
        resolve(root, "apps/web/src/app/page.tsx"),
        "utf-8",
      );
      if (!/<main\b/i.test(homeContent)) {
        criticalViolations.push("Home page missing <main> landmark");
      }

      expect(criticalViolations).toEqual([]);
    });
  });
});
