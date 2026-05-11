export function joinRemote(dir: string, name: string): string {
  const base = dir === "/" ? "" : dir.replace(/\/$/, "");
  return `${base}/${name}`.replace(/\/{2,}/g, "/") || "/";
}

export function parentPath(remotePath: string): string {
  const trimmed = remotePath.replace(/\/+$/, "") || "/";
  if (trimmed === "/") return "/";
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) return "/";
  return trimmed.slice(0, idx) || "/";
}
