export type AppRoute =
  | { name: "home" }
  | { name: "blog"; slug?: string };

type LocationLike = {
  hash?: string;
  origin: string;
  pathname: string;
  search?: string;
};

function cleanBasePath(base: string) {
  if (!base || base === "/") return "";
  return base.replace(/\/$/, "");
}

function safeDecodePathPart(part?: string) {
  if (!part) return undefined;
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function pathInsideBase(pathname: string, base: string) {
  const cleanBase = cleanBasePath(base);
  return (
    !cleanBase ||
    pathname === cleanBase ||
    pathname.startsWith(`${cleanBase}/`)
  );
}

function appRoutePathname(route: AppRoute, base: string) {
  if (route.name === "blog") {
    return withBasePath(
      route.slug ? `/blog/${encodeURIComponent(route.slug)}/` : "/blog/",
      base,
    );
  }

  return withBasePath("/", base);
}

export function withBasePath(
  path: string,
  base = import.meta.env.BASE_URL || "/",
) {
  const cleanBase = cleanBasePath(base);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${normalizedPath}`;
}

export function parseAppRoute(
  pathname: string,
  base = import.meta.env.BASE_URL || "/",
): AppRoute {
  const cleanBase = cleanBasePath(base);
  const path =
    cleanBase && pathInsideBase(pathname, base)
      ? pathname.slice(cleanBase.length) || "/"
      : pathname;
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "blog") {
    return {
      name: "blog",
      slug: safeDecodePathPart(parts[1]),
    };
  }

  return { name: "home" };
}

export function getClientRoutePath(
  href: string,
  current: LocationLike,
  base = import.meta.env.BASE_URL || "/",
) {
  const currentUrl = `${current.origin}${current.pathname}${current.search || ""}${current.hash || ""}`;
  let target: URL;

  try {
    target = new URL(href, currentUrl);
  } catch {
    return null;
  }

  if (target.origin !== current.origin) return null;
  if (!pathInsideBase(target.pathname, base)) return null;

  const currentSearch = current.search || "";
  const currentHash = current.hash || "";
  if (
    target.pathname === current.pathname &&
    target.search === currentSearch &&
    target.hash === currentHash
  ) {
    return null;
  }

  const route = parseAppRoute(target.pathname, base);
  const cleanBase = cleanBasePath(base);
  const isHomeRoute =
    target.pathname === withBasePath("/", base) || target.pathname === cleanBase;
  if (route.name !== "blog" && !isHomeRoute) return null;

  return `${appRoutePathname(route, base)}${target.search}${target.hash}`;
}
