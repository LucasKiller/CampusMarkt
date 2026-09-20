import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProfileService } from "../../../modules/identity/server/profile";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

function formatMonth(monthStr: string) {
  try {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const service = getProfileService();
  const result = await service.getPublicProfile(publicId);

  if (result.status !== "found") {
    return {
      title: "Profile Not Found · CampusMarkt",
    };
  }

  return {
    title: `${result.profile.displayName} · CampusMarkt Profile`,
    description: `Public marketplace profile of ${result.profile.displayName}.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { publicId } = await params;
  const service = getProfileService();
  const result = await service.getPublicProfile(publicId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status !== "found") {
    return (
      <main>
        <section className="auth-container">
          <p>Profile is temporarily unavailable. Please try again later.</p>
        </section>
      </main>
    );
  }

  const profile = result.profile;
  const initials = profile.displayName.slice(0, 2).toUpperCase();

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt Startseite">
          CampusMarkt
        </a>
        <span className="language-note" aria-label="Verfügbare Sprachen">
          DE · EN
        </span>
      </header>

      <section className="auth-container" aria-labelledby="profile-heading">
        <div className="info-card" style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                className="avatar-fallback"
                aria-hidden="true"
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  backgroundColor: "#2d6a4f",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  fontWeight: "bold",
                }}
              >
                {initials}
              </div>
            )}
          </div>

          <h1
            id="profile-heading"
            style={{ margin: "0.5rem 0", fontSize: "1.5rem" }}
          >
            {profile.displayName}
          </h1>

          <p style={{ color: "#526b59", margin: "0.25rem 0" }}>
            Member since {formatMonth(profile.joinedMonth)}
          </p>

          <p
            style={{ fontSize: "0.75rem", color: "#8a9e90", marginTop: "1rem" }}
          >
            Public ID: {profile.publicId}
          </p>
        </div>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
