"use client";

import { Check, ChevronDown, Building2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { AuthSession } from "@/lib/api";

type WorkspaceSwitcherProps = {
  memberships: AuthSession["memberships"];
  activeOrganizationId: string;
  label?: string;
  onChange: (organizationId: string) => void;
};

export function WorkspaceSwitcher({
  memberships,
  activeOrganizationId,
  label = "Active workspace",
  onChange,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const activeMembership = memberships.find(
    (membership) => membership.organization_id === activeOrganizationId,
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="workspace-switcher">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="workspace-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="workspace-switcher-icon">
          <Building2 size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
            {activeMembership?.organization_name ?? "Select workspace"}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={isOpen ? "workspace-switcher-chevron is-open" : "workspace-switcher-chevron"}
        />
      </button>

      {isOpen ? (
        <div className="workspace-switcher-menu" role="listbox">
          {memberships.map((membership) => {
            const isActive = membership.organization_id === activeOrganizationId;
            return (
              <button
                key={membership.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(membership.organization_id);
                  setIsOpen(false);
                }}
                className={isActive ? "workspace-switcher-option is-active" : "workspace-switcher-option"}
              >
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold">
                    {membership.organization_name}
                  </span>
                  <span className="block truncate text-xs capitalize text-[var(--muted)]">
                    {membership.role}
                  </span>
                </span>
                {isActive ? <Check size={15} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
