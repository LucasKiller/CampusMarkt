import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { FavoriteButton, performFavoriteToggle } from "./favorite-button";
import { FavoritesProvider } from "./favorites-context";

describe("FavoriteButton component (T13)", () => {
  const listingId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  it("renders unfavorited button with accessible labels and outlined heart", () => {
    const html = renderToString(
      <FavoriteButton listingId={listingId} initialIsFavorited={false} />,
    );

    expect(html).toContain(`data-testid="favorite-button-${listingId}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Auf die Merkliste setzen"');
    expect(html).toContain('data-favorited="false"');
    expect(html).toContain('fill="none"');
  });

  it("renders favorited button with aria-pressed='true' and filled heart", () => {
    const html = renderToString(
      <FavoriteButton listingId={listingId} initialIsFavorited={true} />,
    );

    expect(html).toContain(`data-testid="favorite-button-${listingId}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Aus Merkliste entfernen"');
    expect(html).toContain('data-favorited="true"');
    expect(html).toContain('fill="#e11d48"');
  });

  it("renders within FavoritesProvider and hydrates active state from provider", () => {
    const html = renderToString(
      <FavoritesProvider initialFavoriteIds={[listingId]}>
        <FavoriteButton listingId={listingId} />
      </FavoritesProvider>,
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-favorited="true"');
  });

  it("renders details variant with details classes and text label", () => {
    const html = renderToString(
      <FavoriteButton
        listingId={listingId}
        variant="details"
        initialIsFavorited={false}
        showLabel={true}
      />,
    );

    expect(html).toContain("favorite-button-details");
    expect(html).toContain("Merken");
  });

  it("renders details variant in favorited state with 'Gemerkt' label", () => {
    const html = renderToString(
      <FavoriteButton
        listingId={listingId}
        variant="details"
        initialIsFavorited={true}
        showLabel={true}
      />,
    );

    expect(html).toContain("favorite-button-details");
    expect(html).toContain("Gemerkt");
  });

  describe("guest redirect and toggle mechanics", () => {
    it("redirects guest visitor to /login?next=... when isAuthenticated is false", async () => {
      const onNavigate = vi.fn();
      const mockToggleApi = vi.fn();

      const result = await performFavoriteToggle({
        listingId,
        isCurrentlyFavorited: false,
        isAuthenticated: false,
        currentUrl: "/listings/123?ref=feed",
        onNavigate,
        toggleApi: mockToggleApi as unknown as typeof fetch,
      });

      expect(result.redirected).toBe(true);
      expect(result.isFavorited).toBe(false);
      expect(onNavigate).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent("/listings/123?ref=feed")}`,
      );
      expect(mockToggleApi).not.toHaveBeenCalled();
    });

    it("redirects guest visitor when server responds with HTTP 401", async () => {
      const onNavigate = vi.fn();
      const mockToggleApi = vi.fn(async () => ({
        status: 401,
        ok: false,
      }));

      const result = await performFavoriteToggle({
        listingId,
        isCurrentlyFavorited: false,
        currentUrl: "/listings/123?ref=feed",
        onNavigate,
        toggleApi: mockToggleApi as unknown as typeof fetch,
      });

      expect(mockToggleApi).toHaveBeenCalledWith(
        `/api/marketplace/favorites/${listingId}`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.redirected).toBe(true);
      expect(result.isFavorited).toBe(false);
      expect(onNavigate).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent("/listings/123?ref=feed")}`,
      );
    });

    it("successfully calls API on toggle and reconciles server state", async () => {
      const onNavigate = vi.fn();
      const mockToggleApi = vi.fn(async () => ({
        status: 200,
        ok: true,
        json: async () => ({
          ok: true,
          data: { isFavorited: true, listingId },
        }),
      }));

      const result = await performFavoriteToggle({
        listingId,
        isCurrentlyFavorited: false,
        onNavigate,
        toggleApi: mockToggleApi as unknown as typeof fetch,
      });

      expect(mockToggleApi).toHaveBeenCalledWith(
        `/api/marketplace/favorites/${listingId}`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.redirected).toBe(false);
      expect(result.isFavorited).toBe(true);
    });

    it("reverts state to previous on server failure", async () => {
      const onNavigate = vi.fn();
      const mockToggleApi = vi.fn(async () => ({
        status: 500,
        ok: false,
      }));

      const result = await performFavoriteToggle({
        listingId,
        isCurrentlyFavorited: true,
        onNavigate,
        toggleApi: mockToggleApi as unknown as typeof fetch,
      });

      expect(result.redirected).toBe(false);
      expect(result.isFavorited).toBe(true); // remained true
    });
  });
});
