import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider, useTranslation } from "./LanguageProvider";

function TestConsumer() {
  const { locale, dictionary } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="app-name">{dictionary.common.appName}</span>
      <span data-testid="language-label">{dictionary.nav.language}</span>
    </div>
  );
}

describe("LanguageProvider and useTranslation", () => {
  it("provides initial German locale and translations", () => {
    const html = renderToString(
      <LanguageProvider initialLocale="de">
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(html).toContain(">de<");
    expect(html).toContain(">CampusMarkt<");
    expect(html).toContain(">Sprache<");
  });

  it("provides initial English locale and translations", () => {
    const html = renderToString(
      <LanguageProvider initialLocale="en">
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(html).toContain(">en<");
    expect(html).toContain(">CampusMarkt<");
    expect(html).toContain(">Language<");
  });

  it("falls back to default English locale when useTranslation is used outside of LanguageProvider", () => {
    const html = renderToString(<TestConsumer />);
    expect(html).toContain(">en<");
    expect(html).toContain(">CampusMarkt<");
    expect(html).toContain(">Language<");
  });
});
