import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "./LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher component", () => {
  it("renders language switcher button with German active by default", () => {
    const html = renderToString(
      <LanguageProvider initialLocale="de">
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    expect(html).toContain('data-testid="language-switcher"');
    expect(html).toContain('aria-label="Zu Englisch wechseln"');
    expect(html).toContain('data-testid="language-btn-de"');
    expect(html).toContain('data-testid="language-btn-en"');
    expect(html).toContain("DE");
    expect(html).toContain("EN");
  });

  it("renders language switcher button with English active when locale is 'en'", () => {
    const html = renderToString(
      <LanguageProvider initialLocale="en">
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    expect(html).toContain('data-testid="language-switcher"');
    expect(html).toContain('aria-label="Switch to German"');
  });

  it("includes accessible aria-pressed attribute", () => {
    const deHtml = renderToString(
      <LanguageProvider initialLocale="de">
        <LanguageSwitcher />
      </LanguageProvider>,
    );
    expect(deHtml).toContain('aria-pressed="false"');

    const enHtml = renderToString(
      <LanguageProvider initialLocale="en">
        <LanguageSwitcher />
      </LanguageProvider>,
    );
    expect(enHtml).toContain('aria-pressed="true"');
  });
});
