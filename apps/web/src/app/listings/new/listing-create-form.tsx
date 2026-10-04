"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { uploadSignedListingPhoto } from "../../../modules/listings/client/upload-photo";
import {
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_TYPES,
  PICKUP_AREAS,
  type ItemCondition,
  type ListingCategory,
  type ListingType,
  type PickupArea,
} from "@campusmarkt/domain";

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  furniture: "Möbel & Wohnen (Furniture)",
  electronics: "Elektronik & Technik (Electronics)",
  books_studies: "Bücher & Studium (Books & Studies)",
  bicycles_mobility: "Fahrräder & Mobilität (Bicycles & Mobility)",
  clothing: "Kleidung & Accessoires (Clothing)",
  home_kitchen: "Küche & Haushalt (Home & Kitchen)",
  other: "Sonstiges (Other)",
};

export const PICKUP_AREA_LABELS: Record<PickupArea, string> = {
  innenstadt: "Innenstadt",
  campus_tu_altgebaeude: "Campus / TU-Altgebäude",
  campus_nord_bienrode: "Campus Nord / Bienrode",
  oestliches_ringgebiet: "Östliches Ringgebiet",
  westliches_ringgebiet: "Westliches Ringgebiet",
  noerdliches_ringgebiet_siegfriedviertel:
    "Nördliches Ringgebiet / Siegfriedviertel",
  viewegs_garten_bebelhof: "Viewegs Garten / Bebelhof",
  heidberg_melverode: "Heidberg / Melverode",
  weststadt: "Weststadt",
  lehndorf_kanzlerfeld: "Lehndorf / Kanzlerfeld",
};

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: "Neu (New)",
  LIKE_NEW: "Wie neu (Like new)",
  GOOD: "Gut (Good condition)",
  FAIR: "Akzeptabel (Fair / Signs of wear)",
};

export interface UploadedImage {
  storagePath: string;
  previewUrl: string;
}

export function ListingCreateForm() {
  const router = useRouter();

  const [listingType, setListingType] = useState<ListingType>("SELL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory>("furniture");
  const [pickupArea, setPickupArea] = useState<PickupArea>("innenstadt");
  const [condition, setCondition] = useState<ItemCondition>("GOOD");
  const [priceEuros, setPriceEuros] = useState("10.00");
  const [images, setImages] = useState<UploadedImage[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorList = [
    ...Object.values(fieldErrors).flat(),
    ...(generalError ? [generalError] : []),
  ];

  function handleTypeChange(type: ListingType) {
    setListingType(type);
    if (type === "GIVE_AWAY") {
      setPriceEuros("0");
    } else if (type === "WANTED") {
      setPriceEuros("");
    } else if (priceEuros === "0" || priceEuros === "") {
      setPriceEuros("10.00");
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || isUploading) return;

    if (images.length + files.length > 8) {
      setGeneralError("You can upload a maximum of 8 photos.");
      return;
    }

    setIsUploading(true);
    setGeneralError(null);
    const newImages: UploadedImage[] = [];

    try {
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error(`File "${file.name}" must be JPEG, PNG, or WebP.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds the 5MB size limit.`);
        }

        // 1. Get upload intent
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

        // 2. Upload file
        await uploadSignedListingPhoto(signedUploadUrl, file);

        newImages.push({
          storagePath,
          previewUrl: URL.createObjectURL(file),
        });
      }
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
    } finally {
      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
      setIsUploading(false);
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await uploadFiles(files);
  }

  function handleFileDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    void uploadFiles(Array.from(e.dataTransfer.files));
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

    // Client-side quick checks
    const errors: Record<string, string[]> = {};
    if (title.trim().length < 5 || title.trim().length > 100) {
      errors.title = ["Title must be between 5 and 100 characters."];
    }
    if (description.trim().length < 10 || description.trim().length > 2000) {
      errors.description = [
        "Description must be between 10 and 2000 characters.",
      ];
    }

    if (listingType !== "WANTED" && images.length === 0) {
      errors.images = ["Please upload at least 1 photo of the item."];
    }

    let priceCents: number | null = null;
    if (listingType === "SELL") {
      const parsed = parseFloat(priceEuros);
      if (isNaN(parsed) || parsed < 0.5 || parsed > 10000) {
        errors.priceCents = [
          "Asking price must be between €0.50 and €10,000.00.",
        ];
      } else {
        priceCents = Math.round(parsed * 100);
      }
    } else if (listingType === "GIVE_AWAY") {
      priceCents = 0;
    } else if (listingType === "WANTED") {
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
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingType,
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
            data.code === "RATE_LIMITED"
              ? "You have reached the creation rate limit (20/hour). Please try again later."
              : "Unable to create listing. Please check your inputs.",
          );
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      const targetId = data.data?.id ?? data.data?.listing?.id;
      router.push(`/listings/${targetId}/manage`);
    } catch {
      setGeneralError(
        "Network connection failed. Please try again in a few moments.",
      );
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="listing-form-container">
      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="listing-error-summary"
          className="error-summary"
        >
          <h2 id="listing-error-summary" className="error-summary-title">
            Please fix the following problems
          </h2>
          <ul className="error-summary-list">
            {errorList.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Prohibited Goods Policy Callout */}
      <div
        className="policy-callout"
        role="region"
        aria-label="Marketplace Policy Guidance"
        style={{
          background: "#fffbeb",
          border: "1px solid #fef3c7",
          borderLeft: "4px solid #f59e0b",
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "0.95rem",
            color: "#92400e",
            fontWeight: 700,
          }}
        >
          CampusMarkt Policy Guidance
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "#78350f",
            lineHeight: 1.45,
          }}
        >
          Physical goods only in Braunschweig. Prohibited items include alcohol,
          tobacco, drugs, weapons, fireworks, adult content, live animals,
          digital goods/keys, and housing or services. Keep transactions safe
          and in person.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Listing Type Toggle */}
        <fieldset
          className="form-group"
          style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}
        >
          <legend className="form-label" style={{ marginBottom: "0.5rem" }}>
            Listing Intent
          </legend>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {LISTING_TYPES.map((type) => {
              const active = listingType === type;
              return (
                <button
                  type="button"
                  key={type}
                  className={`btn-type-selector ${active ? "active" : ""}`}
                  style={{
                    padding: "0.65rem 1rem",
                    borderRadius: "0.375rem",
                    border: `2px solid ${active ? "#17231c" : "#cbd5e1"}`,
                    background: active ? "#17231c" : "#ffffff",
                    color: active ? "#ffffff" : "#17231c",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  onClick={() => handleTypeChange(type)}
                >
                  {type === "SELL" && "Sell (Verkaufen)"}
                  {type === "GIVE_AWAY" && "Give Away (Verschenken)"}
                  {type === "WANTED" && "Wanted (Gesucht)"}
                </button>
              );
            })}
          </div>
          <span className="form-hint" style={{ marginTop: "0.4rem" }}>
            Note: The listing intent cannot be changed once published.
          </span>
        </fieldset>

        {/* Title */}
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="listing-title" className="form-label">
            Title
          </label>
          <input
            id="listing-title"
            name="title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. IKEA Schreibtisch Micke weiß"
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? "title-error" : "title-hint"}
          />
          <span id="title-hint" className="form-hint">
            Between 5 and 100 characters. Be concise and descriptive.
          </span>
          {fieldErrors.title && (
            <span id="title-error" className="form-error">
              {fieldErrors.title[0]}
            </span>
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
            <label htmlFor="listing-category" className="form-label">
              Category
            </label>
            <select
              id="listing-category"
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
            <label htmlFor="listing-condition" className="form-label">
              Condition
            </label>
            <select
              id="listing-condition"
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
            <label htmlFor="listing-pickup-area" className="form-label">
              Pickup Area (Braunschweig)
            </label>
            <select
              id="listing-pickup-area"
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
            <span className="form-hint">
              Neighborhood zone for in-person pickup. No street address shown.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="listing-price" className="form-label">
              {listingType === "SELL" && "Price (€)"}
              {listingType === "GIVE_AWAY" && "Price (€) - Free"}
              {listingType === "WANTED" && "Max Budget (€) - Optional"}
            </label>
            <input
              id="listing-price"
              type="number"
              step="0.50"
              min="0.50"
              max="10000"
              className="form-input"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              disabled={listingType === "GIVE_AWAY"}
              placeholder={listingType === "WANTED" ? "e.g. 50.00" : "10.00"}
              aria-invalid={!!fieldErrors.priceCents}
              aria-describedby={
                fieldErrors.priceCents ? "price-error" : "price-hint"
              }
            />
            <span id="price-hint" className="form-hint">
              {listingType === "SELL" && "Between €0.50 and €10,000.00."}
              {listingType === "GIVE_AWAY" &&
                "Giveaway items cannot carry a price."}
              {listingType === "WANTED" &&
                "Leave empty or enter your maximum budget."}
            </span>
            {fieldErrors.priceCents && (
              <span id="price-error" className="form-error">
                {fieldErrors.priceCents[0]}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="listing-description" className="form-label">
            Description
          </label>
          <textarea
            id="listing-description"
            name="description"
            className="form-input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={2000}
            placeholder="Describe the condition, measurements, pickup availability, and reason for giving away or selling..."
            aria-invalid={!!fieldErrors.description}
            aria-describedby={
              fieldErrors.description ? "desc-error" : "desc-hint"
            }
          />
          <span id="desc-hint" className="form-hint">
            Between 10 and 2000 characters. Plain text only.
          </span>
          {fieldErrors.description && (
            <span id="desc-error" className="form-error">
              {fieldErrors.description[0]}
            </span>
          )}
        </div>

        {/* Image Uploader & Preview */}
        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label className="form-label">Photos (Up to 8)</label>
          <p
            className="form-hint"
            style={{ marginTop: 0, marginBottom: "0.5rem" }}
          >
            {listingType === "WANTED"
              ? "Optional. Add up to 8 reference photos (JPEG, PNG, or WebP up to 5MB)."
              : "At least 1 photo required. The first photo will be used as the cover preview."}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            id="photo-upload-input"
            onChange={handleFileSelect}
          />

          <div
            id="photo-drop-zone"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center",
              border: `2px dashed ${isDragOver ? "#0b665e" : "#cbd5e1"}`,
              borderRadius: "8px",
              padding: "1rem",
              background: isDragOver ? "#eef7f3" : "transparent",
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              disabled={images.length >= 8 || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Uploading..." : "+ Upload Photos"}
            </button>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Drag photos here or choose files · {images.length}/8 uploaded
            </span>
          </div>

          {fieldErrors.images && (
            <span
              className="form-error"
              style={{ display: "block", marginTop: "0.5rem" }}
            >
              {fieldErrors.images[0]}
            </span>
          )}

          {/* Photo Gallery with Cover Badge */}
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
                    alt={`Listing photo ${idx + 1}`}
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

        {/* Submit Actions */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isPending || isUploading}
            aria-busy={isPending}
            style={{ flex: 1 }}
          >
            {isPending ? "Publishing listing..." : "Publish Listing"}
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
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
