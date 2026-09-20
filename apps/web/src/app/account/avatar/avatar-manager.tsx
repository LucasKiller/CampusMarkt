"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicProfile } from "@campusmarkt/types";
import { avatarFallback } from "@campusmarkt/domain";

const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface AvatarManagerProps {
  initialProfile?: PublicProfile;
  onProfileUpdated?: (profile: PublicProfile) => void;
}

export function AvatarManager({
  initialProfile,
  onProfileUpdated,
}: AvatarManagerProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(
    initialProfile ?? null,
  );
  const [loading, setLoading] = useState(!initialProfile);
  const [pending, setPending] = useState(false);
  const [brokenImage, setBrokenImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File selection and crop preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; size: number }>({
    x: 0,
    y: 0,
    size: 1,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      return;
    }

    let active = true;
    async function loadProfile() {
      try {
        const res = await fetch("/api/identity/me/profile", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const body = await res.json();
          if (active && body.ok && body.data) {
            setProfile(body.data);
          }
        }
      } catch {
        // Ignored, will display fallback
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [initialProfile]);

  useEffect(() => {
    if (errorMessage && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errorMessage]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage("Choose a JPEG, PNG, or WebP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setErrorMessage("Image must be no larger than 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setCrop({ x: 0, y: 0, size: 1 });
  }

  function cancelCrop() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrorMessage(null);
  }

  async function handleSaveAvatar() {
    if (!selectedFile || !profile) return;
    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const expectedVersion = profile.avatarUrl
      ? parseInt(
          profile.avatarUrl.split("/").pop()?.replace(".webp", "") || "0",
          10,
        )
      : 0;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("crop", JSON.stringify(crop));
    formData.append("expectedVersion", expectedVersion.toString());

    try {
      const res = await fetch("/api/identity/me/avatar", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const body = await res.json();
      if (!res.ok || !body.ok) {
        if (body.code === "CONFLICT") {
          setErrorMessage(
            "Another session recently changed your avatar. Please refresh.",
          );
        } else if (body.fieldErrors?.file?.[0]) {
          setErrorMessage(body.fieldErrors.file[0]);
        } else if (body.fieldErrors?.crop?.[0]) {
          setErrorMessage(body.fieldErrors.crop[0]);
        } else {
          setErrorMessage("Failed to upload avatar. Please try again.");
        }
        return;
      }

      const updated = body.data.profile as PublicProfile;
      setProfile(updated);
      setBrokenImage(false);
      setSuccessMessage("Avatar updated successfully.");
      onProfileUpdated?.(updated);
      cancelCrop();
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile?.avatarUrl) return;
    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/identity/me/avatar", {
        method: "DELETE",
        credentials: "same-origin",
      });

      const body = await res.json();
      if (!res.ok || !body.ok) {
        setErrorMessage("Failed to remove avatar. Please try again.");
        return;
      }

      const updated = body.data.profile as PublicProfile;
      setProfile(updated);
      setBrokenImage(false);
      setSuccessMessage("Avatar removed.");
      onProfileUpdated?.(updated);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div>Loading profile avatar...</div>;
  }

  const displayName = profile?.displayName || "User";
  const fallback = avatarFallback(displayName);
  const showImage = Boolean(profile?.avatarUrl) && !brokenImage;

  return (
    <div className="avatar-manager">
      {errorMessage && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          className="error-summary"
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #f87171",
            borderRadius: "6px",
            color: "#b91c1c",
            outline: "none",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "6px",
            color: "#15803d",
          }}
        >
          <p style={{ margin: 0 }}>{successMessage}</p>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div
          className="avatar-container"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            overflow: "hidden",
            backgroundColor: "#e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "2px solid #cbd5e1",
          }}
        >
          {showImage ? (
            <img
              src={profile?.avatarUrl || ""}
              alt={`${displayName}'s avatar`}
              onError={() => setBrokenImage(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              className="avatar-fallback"
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#475569",
              }}
            >
              {fallback.kind === "initials" ? fallback.value : "👤"}
            </span>
          )}
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {!previewUrl && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <label
                className="button secondary"
                style={{
                  cursor: pending ? "not-allowed" : "pointer",
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  fontSize: "0.875rem",
                }}
              >
                <span>Choose new avatar</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload avatar image"
                  disabled={pending}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              {profile?.avatarUrl && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={pending}
                  onClick={handleRemoveAvatar}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    fontSize: "0.875rem",
                    color: "#b91c1c",
                  }}
                >
                  {pending ? "Removing..." : "Remove avatar"}
                </button>
              )}
            </div>
          )}
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            JPEG, PNG, or WebP · Max 5 MB · 512×512 square crop
          </span>
        </div>
      </div>

      {previewUrl && (
        <div
          className="crop-preview-container"
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Adjust Square Crop</h3>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
            Previewing crop region. Your avatar will be published as a 512×512
            WebP image.
          </p>

          <div
            style={{
              position: "relative",
              maxWidth: "300px",
              maxHeight: "300px",
              margin: "1rem 0",
              overflow: "hidden",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
            }}
          >
            <img
              src={previewUrl}
              alt="Avatar crop preview"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="button primary"
              disabled={pending}
              onClick={handleSaveAvatar}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                fontSize: "0.875rem",
                cursor: pending ? "not-allowed" : "pointer",
              }}
            >
              {pending ? "Saving..." : "Save avatar"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={cancelCrop}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "0.875rem",
                cursor: pending ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
