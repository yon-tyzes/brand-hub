import type { FieldDef } from "./types.ts";

export const photoFields: FieldDef[] = [
  {
    key: "provider",
    kind: "select",
    label: "Where the photos are",
    help: "The service that holds the photo folder.",
    options: [
      { value: "drive", label: "Google Drive" },
      { value: "dropbox", label: "Dropbox" },
      { value: "sharepoint", label: "SharePoint" },
      { value: "url", label: "Another website" },
    ],
  },
  { key: "url", kind: "url", label: "Folder link", help: "The share link to the folder. Copy it from the service's Share button." },
  {
    key: "access",
    kind: "select",
    label: "Who can open it",
    help: "Open link means anyone with the link. Sign-in required means people must log in first.",
    options: [
      { value: "open", label: "Open link" },
      { value: "sign-in", label: "Sign-in required" },
    ],
  },
  { key: "accessGroup", kind: "text", label: "Who can sign in", help: "Shown on the site, like “Anyone with a staff account.”", optional: true },
  { key: "guidelines", kind: "lines", label: "Guidelines", help: "Short notes shown on the photo card. One per line.", optional: true },
];
