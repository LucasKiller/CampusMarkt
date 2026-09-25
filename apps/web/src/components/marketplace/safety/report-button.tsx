"use client";

import React, { useState } from "react";
import { ReportModal } from "./report-modal";
import type { ReportTargetType } from "@campusmarkt/types";

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  isOwner?: boolean;
}

export function ReportButton({
  targetType,
  targetId,
  targetTitle,
  isOwner,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOwner) {
    return null;
  }

  const label = targetType === "listing" ? "Inserat melden" : "Nutzer melden";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid={`report-btn-${targetType}`}
        className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-red-600"
      >
        <span aria-hidden="true">🚩</span>
        <span>{label}</span>
      </button>

      <ReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetTitle={targetTitle}
      />
    </>
  );
}
