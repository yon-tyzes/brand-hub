// Fonts page: the type tester sets every family's sample to the viewer's words and size, and "Copy page
// link" copies this page's address for opening on a computer.
import { copyText } from "./client.ts";

const root = document.querySelector<HTMLElement>("[data-font-tester-root]");
const text = root?.querySelector<HTMLInputElement>("[data-font-tester-text]");
const size = root?.querySelector<HTMLInputElement>("[data-font-tester-size]");
const readout = root?.querySelector<HTMLElement>("[data-font-tester-readout]");
const samples = [...(root?.querySelectorAll<HTMLElement>("[data-font-sample]") ?? [])];

text?.addEventListener("input", () => {
  const words = text.value.trim() ? text.value : (text.dataset.default ?? "");
  for (const s of samples) s.textContent = words;
});
size?.addEventListener("input", () => {
  root!.style.setProperty("--sample-size", `${size.value}px`);
  if (readout) readout.textContent = `${size.value}px`;
});

document.querySelector("[data-copy-page]")?.addEventListener("click", () => copyText(location.href, "Page link copied"));
