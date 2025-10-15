import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";
import { getApiUrl, getJwtSecret } from "@/lib/env";

const API_URL =
  process.env.NODE_ENV === "production"
    ? "http://127.0.0.1:8080"
    : getApiUrl();

const JWT_SECRET = getJwtSecret();

console.log("🧩 Middleware connected to", API_URL);

const accessMap: Record<string, string[]> = {
  "/settings": ["SuperAdmin", "Admin"],
  "/configurator": ["SuperAdmin", "Admin"],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;
  const token = req.cookies.get("remora_token")?.value;

  // Проверка инициализации
  try {
    const res = await fetch(`${API_URL}/api/setup/status`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();

    if (!data.initialized && !path.startsWith("/setup")) {
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }

    if (data.initialized && path.startsWith("/setup")) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error("⚠️ Backend not reachable:", err);
    return NextResponse.next();
  }

  // Если нет токена
  if (!token && !path.startsWith("/login") && !path.startsWith("/setup")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Если токен есть и пользователь идёт на /login — редиректим на /
  if (token && path.startsWith("/login")) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jose.jwtVerify(token, secret);
      url.pathname = "/";
      return NextResponse.redirect(url);
    } catch {
      const res = NextResponse.next();
      res.cookies.delete("remora_token");
      return res;
    }
  }

  // Проверка ролей
  const protectedRoute = Object.keys(accessMap).find((r) => path.startsWith(r));
  if (!protectedRoute) return NextResponse.next();

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token!, secret);
    const role = (payload as any).role;
    if (accessMap[protectedRoute].includes(role)) return NextResponse.next();

    url.pathname = "/";
    return NextResponse.redirect(url);
  } catch {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
