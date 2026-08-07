type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function setDeferredInstallPrompt(
  event: BeforeInstallPromptEvent | null,
) {
  deferredPrompt = event;
  notify();
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
  notify();
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type { BeforeInstallPromptEvent };
