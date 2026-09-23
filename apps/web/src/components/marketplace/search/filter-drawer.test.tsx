import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { FilterBar, FilterDrawer } from "./filter-drawer";

describe("FilterBar and FilterDrawer components (T14)", () => {
  describe("FilterBar", () => {
    it("renders sort selector and verified seller checkbox", () => {
      const html = renderToString(
        <FilterBar filters={{ sort: "relevance" }} onFiltersChange={vi.fn()} />,
      );

      expect(html).toContain('data-testid="filter-bar"');
      expect(html).toContain('data-testid="sort-select"');
      expect(html).toContain('data-testid="verified-toggle"');
      expect(html).toContain("Beste Treffer (Relevanz)");
      expect(html).toContain("Nur TU Braunschweig verifiziert");
      expect(html).not.toContain('data-testid="clear-all-filters"');
    });

    it("renders clear-all button when active filters exist and onReset is provided", () => {
      const html = renderToString(
        <FilterBar
          filters={{
            categories: ["furniture"],
            verifiedOnly: true,
          }}
          onFiltersChange={vi.fn()}
          onReset={vi.fn()}
        />,
      );

      expect(html).toContain('data-testid="clear-all-filters"');
      expect(html).toContain("Alle Filter zurücksetzen");
    });
  });

  describe("FilterDrawer", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToString(
        <FilterDrawer
          isOpen={false}
          onClose={vi.fn()}
          filters={{}}
          onFiltersChange={vi.fn()}
        />,
      );

      expect(html).toBe("");
    });

    it("renders accessible bottom-sheet modal when isOpen is true", () => {
      const html = renderToString(
        <FilterDrawer
          isOpen={true}
          onClose={vi.fn()}
          filters={{
            categories: ["books_studies"],
            minPriceCents: 1000,
            maxPriceCents: 5000,
          }}
          onFiltersChange={vi.fn()}
        />,
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-label="Filtereinstellungen"');
      expect(html).toContain('data-testid="filter-drawer"');
      expect(html).toContain('data-testid="filter-drawer-close"');
      expect(html).toContain('data-testid="filter-drawer-apply"');
      expect(html).toContain('data-testid="filter-drawer-reset"');
      expect(html).toContain('data-testid="price-min-input"');
      expect(html).toContain('data-testid="price-max-input"');
      expect(html).toContain('data-testid="filter-drawer-verified"');
      expect(html).toContain("Bücher &amp; Studium");
      expect(html).toContain('value="10"');
      expect(html).toContain('value="50"');
    });
  });
});
