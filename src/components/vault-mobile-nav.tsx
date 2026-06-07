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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              disabled={tab.disabled}
              className={`flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition active:scale-95 disabled:opacity-40 sm:text-xs ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-accent" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
