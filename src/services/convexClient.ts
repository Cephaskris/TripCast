import { ConvexReactClient } from "convex/react";

export const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || "https://effervescent-gnat-908.convex.cloud";

export const convex = new ConvexReactClient(CONVEX_URL, {
  unsavedChangesWarning: false,
});
