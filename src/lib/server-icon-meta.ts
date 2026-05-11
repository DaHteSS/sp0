export const SERVER_ICON_IDS = [
  "server",
  "cloud",
  "hardDrive",
  "database",
  "globe",
  "cpu",
  "laptop",
  "monitor",
  "box",
] as const;

export type ServerIconId = (typeof SERVER_ICON_IDS)[number];
