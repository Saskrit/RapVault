export function getAppOrigin(request: Request) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.replace(
      /\/api\/auth\/google\/callback\/?$/,
      "",
    );
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost.split(",")[0].trim()}`;
  }

  const host = request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
