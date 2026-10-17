"use client";

import { FolderOpen, ListMusic, PenLine } from "lucide-react";

export type MobileTab = "folders" | "songs" | "editor";

type VaultMobileNavProps = {
  active: MobileTab;
  onFolders: () => void;
  onSongs: () => void;
  onEditor: () => void;
  editorDisabled?: boolean;
};

export function VaultMobileNav({
  active,
  onFolders,
  onSongs,
  onEditor,
  editorDisabled,
}: VaultMobileNavProps) {
  const tabs = [
    { id: "folders" as const, label: "Folders", icon: FolderOpen, onClick: onFolders },
    { id: "songs" as const, label: "Songs", icon: ListMusic, onClick: onSongs },
    { id: "editor" as const, label: "Write", icon: PenLine, onClick: onEditor, disabled: editorDisabled },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1.5 py-0.5 sm:px-2 sm:py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              disabled={tab.disabled}
              className={`flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold tracking-wide transition active:scale-95 disabled:opacity-40 sm:min-h-[3.25rem] sm:gap-1 sm:py-1.5 sm:text-xs ${
                isActive ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
