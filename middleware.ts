import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Permitir acceso directo a todas las rutas sin autenticación obligatoria
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};