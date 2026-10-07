import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GeneratedAvatar } from "./generated-avatar";

describe("GeneratedAvatar", () => {
  it("generic avatar is independent of display name", () => {
    const ada = renderToStaticMarkup(
      <GeneratedAvatar displayName="Ada Lovelace" />,
    );
    const grace = renderToStaticMarkup(
      <GeneratedAvatar displayName="Grace Hopper" />,
    );

    expect(ada.match(/<path[^>]+>/gu)).toEqual(grace.match(/<path[^>]+>/gu));
    expect(ada.match(/<circle[^>]+>/gu)).toEqual(
      grace.match(/<circle[^>]+>/gu),
    );
  });

  it("generic avatar uses only local vector markup", () => {
    const markup = renderToStaticMarkup(
      <GeneratedAvatar displayName="Member" />,
    );

    expect(markup).toContain('data-testid="generated-avatar"');
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<img");
    expect(markup).not.toMatch(/\b(?:src|href|xlink:href)=/u);
    expect(markup).not.toContain("<image");
    expect(markup).not.toContain("@");
  });
});
