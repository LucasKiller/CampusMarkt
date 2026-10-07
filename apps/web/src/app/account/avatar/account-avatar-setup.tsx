"use client";

import Link from "next/link";
import { useState } from "react";

import { AvatarManager } from "./avatar-manager";

export function AccountAvatarSetup() {
  const [photoAdded, setPhotoAdded] = useState(false);

  return (
    <section className="avatar-setup-card" data-testid="avatar-setup">
      <div className="avatar-setup-intro">
        <span className="avatar-setup-kicker">YOUR PROFILE</span>
        <h2>Make it yours</h2>
        <p>
          Add a photo so neighbors can recognize you, or keep your CampusMarkt
          avatar for now. You can change it anytime.
        </p>
      </div>
      <AvatarManager
        onProfileUpdated={(profile) =>
          setPhotoAdded(Boolean(profile.avatarUrl))
        }
      />
      <Link className="avatar-setup-later" href="/account">
        {photoAdded ? "Continue to account" : "Do this later"}
      </Link>
    </section>
  );
}
