"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicFeedItem } from "@campusmarkt/types";
import {
  formatListingPrice,
  getListingTypeLabel,
  getPickupAreaLabel,
  type SupportedLocale,
} from "@campusmarkt/domain";

function ListingTile({
  item,
  locale,
  position,
}: {
  item: PublicFeedItem;
  locale: SupportedLocale;
  position: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(item.coverImage) && !imageFailed;
  const imageSource = item.coverImage?.startsWith("http")
    ? item.coverImage
    : `/${item.coverImage}`;

  return (
    <Link
      href={`/listings/${item.id}`}
      className={`home-showcase-tile home-showcase-tile-${position} ${hasImage ? "has-image" : "has-no-image"}`}
    >
      {hasImage && (
        <img
          src={imageSource}
          alt=""
          width="640"
          height="640"
          loading="eager"
          onError={() => setImageFailed(true)}
        />
      )}
      <span className="home-showcase-copy">
        <span className="home-showcase-type">
          {getListingTypeLabel(item.listingType, locale)}
          {item.status === "reserved" &&
            (locale === "en" ? " · Reserved" : " · Reserviert")}
        </span>
        <strong>{item.title}</strong>
        <span>
          {formatListingPrice(item.listingType, item.priceCents, locale)}
          {" · "}
          {getPickupAreaLabel(item.pickupArea, locale)}
        </span>
      </span>
    </Link>
  );
}

const genericTiles = [
  {
    type: "SELL",
    href: "/search?listingType=SELL",
    en: ["Find something useful", "Browse things for sale"],
    de: ["Finde etwas Nützliches", "Verkäufe entdecken"],
  },
  {
    type: "GIVE_AWAY",
    href: "/search?listingType=GIVE_AWAY",
    en: ["Give good things another life", "Explore free items"],
    de: ["Gib Dingen ein zweites Leben", "Geschenke entdecken"],
  },
  {
    type: "WANTED",
    href: "/search?listingType=WANTED",
    en: ["See what neighbors need", "Explore wanted posts"],
    de: ["Sieh, was andere suchen", "Gesuche entdecken"],
  },
] as const;

export function HomeHeroShowcase({
  items,
  locale,
}: {
  items: PublicFeedItem[];
  locale: SupportedLocale;
}) {
  const shownItems = items.slice(0, 3);
  return (
    <div
      className="home-hero-showcase"
      data-testid="home-hero-showcase"
      role="group"
      aria-label={
        locale === "en"
          ? "Local finds in Braunschweig"
          : "Funde in Braunschweig"
      }
    >
      {shownItems.map((item, index) => (
        <ListingTile
          key={item.id}
          item={item}
          locale={locale}
          position={index + 1}
        />
      ))}
      {genericTiles.slice(shownItems.length).map((tile, index) => {
        const copy = locale === "en" ? tile.en : tile.de;
        return (
          <Link
            key={tile.type}
            href={tile.href}
            className={`home-showcase-tile home-showcase-tile-${shownItems.length + index + 1} has-no-image home-showcase-generic`}
          >
            <span className="home-showcase-copy">
              <span className="home-showcase-type">
                {getListingTypeLabel(tile.type, locale)}
              </span>
              <strong>{copy[0]}</strong>
              <span>{copy[1]}</span>
            </span>
          </Link>
        );
      })}
      <span className="home-showcase-location" aria-hidden="true">
        {locale === "en" ? "Found in Braunschweig" : "In Braunschweig gefunden"}
      </span>
    </div>
  );
}
