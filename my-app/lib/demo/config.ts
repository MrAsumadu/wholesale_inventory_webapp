export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** localStorage key holding the visitor's demo dataset. */
export const DEMO_STORAGE_KEY = "wholesale-demo:data:v1";
