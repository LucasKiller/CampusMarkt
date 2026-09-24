import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { SafePickupChecklist } from "./safe-pickup-checklist";
import { CAMPUS_PICKUP_SPOTS, SAFE_PICKUP_RULES } from "@campusmarkt/domain";

describe("SafePickupChecklist component (T13)", () => {
  it("renders safe pickup checklist with accessible headings and rules", () => {
    const html = renderToString(<SafePickupChecklist />);

    expect(html).toContain('data-testid="safe-pickup-checklist"');
    expect(html).toContain('aria-labelledby="safe-pickup-heading"');
    expect(html).toContain("Sichere Übergabe auf dem Campus");
    expect(html).toContain('data-testid="safe-pickup-rules-list"');

    for (const rule of SAFE_PICKUP_RULES) {
      expect(html).toContain(rule);
    }
  });

  it("renders recommended campus pickup spots in non-compact mode", () => {
    const html = renderToString(<SafePickupChecklist compact={false} />);

    expect(html).toContain('data-testid="safe-pickup-spots-list"');
    for (const spot of CAMPUS_PICKUP_SPOTS) {
      expect(html).toContain(spot.name);
      expect(html).toContain(spot.description);
    }
  });

  it("omits recommended spots in compact mode", () => {
    const html = renderToString(<SafePickupChecklist compact={true} />);

    expect(html).toContain('data-testid="safe-pickup-rules-list"');
    expect(html).not.toContain('data-testid="safe-pickup-spots-list"');
  });

  it("renders pickup area when supplied without leaking private address", () => {
    const html = renderToString(
      <SafePickupChecklist pickupArea="Campus Nord / Bienrode" />,
    );

    expect(html).toContain("Vorgeschlagener Bereich: Campus Nord / Bienrode");
  });

  it("renders collapsed when initiallyExpanded is false", () => {
    const html = renderToString(
      <SafePickupChecklist initiallyExpanded={false} />,
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-testid="safe-pickup-rules-list"');
  });
});
