// URL helpers with no build-time dependencies, usable from the integration, pages, and islands.

/** Public URL of a file in the brand folder (paths are relative to brands/<slug>/). */
export const fileUrl = (path: string) => "/" + path.split("/").map(encodeURIComponent).join("/");

export const fileName = (path: string) => path.split("/").pop() ?? path;
