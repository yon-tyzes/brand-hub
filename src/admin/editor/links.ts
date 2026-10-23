// Checks on links people paste into the editor.

/**
 * Canva edit links (canva.com/design/<id>/edit) let anyone with the link change the original design.
 * Template links end in /view or /remix, or carry a template share token.
 */
export function canvaLinkWarning(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  if (!/(^|\.)canva\.com$/.test(u.hostname)) return undefined;
  if (/\/design\/[^/]+\/edit\/?$/.test(u.pathname) || /\/design\/[^/]+\/[^/]+\/edit\/?$/.test(u.pathname)) {
    return "This looks like an edit link. Anyone who opens it can change your original design. In Canva, choose Share, then Template link, and paste that link instead.";
  }
  return undefined;
}
