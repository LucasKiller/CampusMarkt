import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { SearchBar } from "./search-bar";

describe("SearchBar component (T13)", () => {
  it("renders search input, form, and submit button", () => {
    const html = renderToString(<SearchBar />);

    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Marktplatz durchsuchen"');
    expect(html).toContain('data-testid="search-input"');
    expect(html).toContain('data-testid="search-submit-button"');
    expect(html).toContain(
      'placeholder="Was suchst du? (z.B. Fahrrad, Schreibtisch...)"',
    );
    expect(html).not.toContain('data-testid="search-clear-button"');
  });

  it("renders initial query and clear button when initialQuery is provided", () => {
    const html = renderToString(
      <SearchBar initialQuery="Fahrrad Braunschweig" />,
    );

    expect(html).toContain('value="Fahrrad Braunschweig"');
    expect(html).toContain('data-testid="search-clear-button"');
    expect(html).toContain('aria-label="Suche zurücksetzen"');
  });

  it("supports custom placeholder and class name", () => {
    const html = renderToString(
      <SearchBar
        placeholder="E-Bike, Laptop suchen..."
        className="custom-search-class"
      />,
    );

    expect(html).toContain('placeholder="E-Bike, Laptop suchen..."');
    expect(html).toContain("custom-search-class");
  });
});
