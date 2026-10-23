// URL helpers with no build-time dependencies, usable from the integration, pages, and islands.

/** Public URL of a file in the brand folder (paths are relative to brands/<slug>/). */
export const fileUrl = (path: string) => "/" + path.split("/").map(encodeURIComponent).join("/");

export const fileName = (path: string) => path.split("/").pop() ?? path;

/** True for a full web address, false for a page on the same site ("/demo-template/"). */
export const isExternal = (url: string) => /^[a-z][a-z0-9+.-]*:/i.test(url);
