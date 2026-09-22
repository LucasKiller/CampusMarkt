"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  canTransitionStatus,
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  PICKUP_AREAS,
  type ItemCondition,
  type ListingCategory,
  type ListingStatus,
  type PickupArea,
} from "@campusmarkt/domain";
import type { ListingEntity } from "@campusmarkt/types";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  PICKUP_AREA_LABELS,
  type UploadedImage,
} from "../../new/listing-create-form";

export const STATUS_LABELS: Record<ListingStatus, string> = {
  active: "Aktiv (Active)",
  reserved: "Reserviert (Reserved)",
  sold: "Verkauft (Sold)",
  archived: "Archiviert (Archived)",
};

export const STATUS_BADGE_STYLES: Record<
  ListingStatus,
  { bg: string; color: string; border: string }
> = {
  active: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  reserved: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  sold: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  archived: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
};

export interface ListingManageEditorProps {
  listing: ListingEntity;
}

export function ListingManageEditor({ listing }: ListingManageEditorProps) {
  const router = useRouter();

  const [currentStatus, setCurrentStatus] = useState<ListingStatus>(
    listing.status,
  );
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [category, setCategory] = useState<ListingCategory>(listing.category);
  const [pickupArea, setPickupArea] = useState<PickupArea>(listing.pickupArea);
  const [condition, setCondition] = useState<ItemCondition>(listing.condition);
  const [priceEuros, setPriceEuros] = useState(
    listing.priceCents !== null ? (listing.priceCents / 100).toFixed(2) : "",
  );
  const [images, setImages] = useState<UploadedImage[]>(
    listing.media.map((m) => ({
      storagePath: m.storagePath,
      previewUrl: `/api/listings/media/preview?path=${encodeURIComponent(m.storagePath)}`,
    })),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorList = [
    ...Object.values(fieldErrors).flat(),
    ...(generalError ? [generalError] : []),
  ];

  async function handleStatusTransition(targetStatus: ListingStatus) {
    if (isTransitioning || targetStatus === currentStatus) return;

    if (!canTransitionStatus(currentStatus, targetStatus)) {
      setGeneralError(
        `Cannot transition status directly from "${STATUS_LABELS[currentStatus]}" to "${STATUS_LABELS[targetStatus]}".`,
      );
      return;
    }

    setIsTransitioning(true);
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        setGeneralError(
          data.code === "CONFLICT"
            ? "Status transition conflict. The listing may have been updated elsewhere."
            : "Failed to update status. Please try again.",
        );
        return;
      }

      setCurrentStatus(targetStatus);
      setSuccessMessage(`Listing marked as ${STATUS_LABELS[targetStatus]}.`);
    } catch {
      setGeneralError("Network error while updating status.");
    } finally {
      setIsTransitioning(false);
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 8) {
      setGeneralError("You can upload a maximum of 8 photos.");
      return;
    }

    setIsUploading(true);
    setGeneralError(null);

    try {
      const newImages: UploadedImage[] = [];

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds the 5MB size limit.`);
        }

        const intentRes = await fetch("/api/listings/media/upload-intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contentType: file.type,
            fileSizeBytes: file.size,
          }),
        });

        const intentJson = await intentRes.json();
        if (!intentRes.ok || !intentJson.ok) {
          throw new Error(
            intentJson.fieldErrors?.contentType?.[0] ||
              intentJson.fieldErrors?.fileSizeBytes?.[0] ||
              "Upload failed",
          );
        }

        const { signedUploadUrl, storagePath } = intentJson.data;

        await fetch(signedUploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });

        newImages.push({
          storagePath,
          previewUrl: URL.createObjectURL(file),
        });
      }

      setImages((prev) => [...prev, ...newImages]);
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMoveImage(index: number, direction: "left" | "right") {
    setImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const errors: Record<string, string[]> = {};
    if (title.trim().length < 5 || title.trim().length > 100) {
      errors.title = ["Title must be between 5 and 100 characters."];
    }
    if (description.trim().length < 10 || description.trim().length > 2000) {
      errors.description = [
        "Description must be between 10 and 2000 characters.",
      ];
    }

    if (listing.listingType !== "WANTED" && images.length === 0) {
      errors.images = ["Please provide at least 1 photo for offerings."];
    }

    let priceCents: number | null = null;
    if (listing.listingType === "SELL") {
      const parsed = parseFloat(priceEuros);
      if (isNaN(parsed) || parsed < 0.5 || parsed > 10000) {
        errors.priceCents = [
          "Asking price must be between €0.50 and €10,000.00.",
        ];
      } else {
        priceCents = Math.round(parsed * 100);
      }
    } else if (listing.listingType === "GIVE_AWAY") {
      priceCents = 0;
    } else if (listing.listingType === "WANTED") {
      if (priceEuros.trim() !== "") {
        const parsed = parseFloat(priceEuros);
        if (isNaN(parsed) || parsed < 0.5 || parsed > 10000) {
          errors.priceCents = [
            "Max budget must be between €0.50 and €10,000.00.",
          ];
        } else {
          priceCents = Math.round(parsed * 100);
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          pickupArea,
          condition,
          priceCents,
          mediaStoragePaths: images.map((img) => img.storagePath),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        } else {
          setGeneralError(
            data.code === "FORBIDDEN"
              ? "You are not authorized to edit this listing."
              : "Failed to update listing details.",
          );
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      setSuccessMessage("Listing details updated successfully.");
      router.refresh();
    } catch {
      setGeneralError("Network error while saving changes.");
    } finally {
      setIsPending(false);
    }
  }

  const badge = STATUS_BADGE_STYLES[currentStatus];

  return (
    <div className="listing-manage-container">
      {/* Status Bar */}
      <div
        role="region"
        aria-label="Listing Status Actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Status:</span>
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>

        {/* Status Transition Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {currentStatus === "active" && (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={isTransitioning}
                onClick={() => handleStatusTransition("reserved")}
                style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
              >
                Mark as Reserved
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isTransitioning}
                onClick={() => handleStatusTransition("sold")}
                style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
              >
                Mark as Sold
              </button>
            </>
          )}

          {currentStatus === "reserved" && (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={isTransitioning}
                onClick={() => handleStatusTransition("active")}
                style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
              >
                Reactivate (Active)
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isTransitioning}
                onClick={() => handleStatusTransition("sold")}
                style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
              >
                Mark as Sold
              </button>
            </>
          )}

          {currentStatus !== "archived" && (
            <button
              type="button"
              className="btn-secondary"
              disabled={isTransitioning}
              onClick={() => handleStatusTransition("archived")}
              style={{
                fontSize: "0.85rem",
                padding: "0.4rem 0.75rem",
                borderColor: "#fca5a5",
                color: "#b91c1c",
              }}
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "0.375rem",
            marginBottom: "1.25rem",
            fontSize: "0.9rem",
          }}
        >
          {successMessage}
        </div>
      )}

      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="manage-error-summary"
          className="error-summary"
        >
          <h2 id="manage-error-summary" className="error-summary-title">
            Please fix the following problems
          </h2>
          <ul className="error-summary-list">
            {errorList.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Immutable Listing Type Badge */}
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label className="form-label">Listing Intent (Immutable)</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.35rem 0.85rem",
                borderRadius: "0.375rem",
                background: "#17231c",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              {listing.listingType === "SELL" && "Sell (Verkaufen)"}
              {listing.listingType === "GIVE_AWAY" && "Give Away (Verschenken)"}
              {listing.listingType === "WANTED" && "Wanted (Gesucht)"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Locked to preserve listing integrity
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="edit-title" className="form-label">
            Title
          </label>
          <input
            id="edit-title"
            name="title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            aria-invalid={!!fieldErrors.title}
          />
          {fieldErrors.title && (
            <span className="form-error">{fieldErrors.title[0]}</span>
          )}
        </div>

        {/* Category & Condition */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div className="form-group">
            <label htmlFor="edit-category" className="form-label">
              Category
            </label>
            <select
              id="edit-category"
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as ListingCategory)}
            >
              {LISTING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-condition" className="form-label">
              Condition
            </label>
            <select
              id="edit-condition"
              className="form-input"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ItemCondition)}
            >
              {ITEM_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {CONDITION_LABELS[cond]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pickup Area & Price */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div className="form-group">
            <label htmlFor="edit-pickup-area" className="form-label">
              Pickup Area (Braunschweig)
            </label>
            <select
              id="edit-pickup-area"
              className="form-input"
              value={pickupArea}
              onChange={(e) => setPickupArea(e.target.value as PickupArea)}
            >
              {PICKUP_AREAS.map((area) => (
                <option key={area} value={area}>
                  {PICKUP_AREA_LABELS[area]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-price" className="form-label">
              {listing.listingType === "SELL" && "Price (€)"}
              {listing.listingType === "GIVE_AWAY" && "Price (€) - Free"}
              {listing.listingType === "WANTED" && "Max Budget (€) - Optional"}
            </label>
            <input
              id="edit-price"
              type="number"
              step="0.50"
              min="0.50"
              max="10000"
              className="form-input"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              disabled={listing.listingType === "GIVE_AWAY"}
              aria-invalid={!!fieldErrors.priceCents}
            />
            {fieldErrors.priceCents && (
              <span className="form-error">{fieldErrors.priceCents[0]}</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="edit-description" className="form-label">
            Description
          </label>
          <textarea
            id="edit-description"
            className="form-input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={2000}
            aria-invalid={!!fieldErrors.description}
          />
          {fieldErrors.description && (
            <span className="form-error">{fieldErrors.description[0]}</span>
          )}
        </div>

        {/* Photos Management */}
        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label className="form-label">Photos ({images.length}/8)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            id="manage-photo-upload"
            onChange={handleFileSelect}
          />

          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <button
              type="button"
              className="btn-secondary"
              disabled={images.length >= 8 || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Uploading..." : "+ Add Photos"}
            </button>
          </div>

          {images.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "0.75rem",
                marginTop: "1rem",
              }}
            >
              {images.map((img, idx) => (
                <div
                  key={img.storagePath}
                  style={{
                    position: "relative",
                    border:
                      idx === 0 ? "2px solid #059669" : "1px solid #e2e8f0",
                    borderRadius: "0.375rem",
                    overflow: "hidden",
                    aspectRatio: "1",
                    background: "#f8fafc",
                  }}
                >
                  <img
                    src={img.previewUrl}
                    alt={`Photo ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  {idx === 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "4px",
                        left: "4px",
                        background: "#059669",
                        color: "#ffffff",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      Cover
                    </span>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.6)",
                      display: "flex",
                      justifyContent: "space-around",
                      padding: "2px 0",
                    }}
                  >
                    {idx > 0 && (
                      <button
                        type="button"
                        aria-label="Move left"
                        onClick={() => handleMoveImage(idx, "left")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        ◀
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </button>
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        aria-label="Move right"
                        onClick={() => handleMoveImage(idx, "right")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        ▶
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isPending || isUploading}
            aria-busy={isPending}
            style={{ flex: 1 }}
          >
            {isPending ? "Saving changes..." : "Save Changes"}
          </button>
          <a
            href="/account/listings"
            className="btn-secondary"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Back to My Listings
          </a>
        </div>
      </form>
    </div>
  );
}
