"use client";

import React, { useState } from "react";
import { BlockUserModal } from "./block-modal";

export interface BlockButtonProps {
  userId: string;
  userName?: string;
  isOwner?: boolean;
}

export function BlockButton({ userId, userName, isOwner }: BlockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOwner) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="block-user-btn"
        className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-red-600"
      >
        <span aria-hidden="true">🚫</span>
        <span>Nutzer blockieren</span>
      </button>

      <BlockUserModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        blockedUserId={userId}
        blockedUserName={userName}
      />
    </>
  );
}
