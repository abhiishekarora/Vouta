// Tiny app-wide notification channel; <Toaster /> in App.jsx renders the messages.
export const notify = (message) =>
  window.dispatchEvent(new CustomEvent("vouta:toast", { detail: String(message) }));
