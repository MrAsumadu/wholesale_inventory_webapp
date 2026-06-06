import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isDemoMode } from "@/lib/demo/config";

export async function middleware(request: NextRequest) {
  if (isDemoMode()) return NextResponse.next(); // no auth in demo mode
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|manifest.json|sw.js).*)",
  ],
};
