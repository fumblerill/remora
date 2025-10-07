import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const accessMap: Record<string, string[]> = {
  "/settings": ["SuperAdmin", "Admin"],
  "/configurator": ["SuperAdmin", "Admin"],
};

// URL Rust backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;
  const token = req.cookies.get("remora_token")?.value;

  // 0️⃣ Проверяем, инициализирована ли система
  try {
    const res = await fetch(`${API_URL}/api/setup/status`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();

    // если система не инициализирована → редиректим всех на /setup
    if (!data.initialized && !path.startsWith("/setup")) {
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }

    // если уже инициализирована → запрещаем доступ к /setup
    if (data.initialized && path.startsWith("/setup")) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error("Setup status check failed:", err);
    // если API недоступен — лучше не редиректить, чтобы не зациклить
    return NextResponse.next();
  }

  // 1️⃣ Если нет токена и не /login или /setup → редирект на /login
  if (!token && !path.startsWith("/login") && !path.startsWith("/setup")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2️⃣ Если токен есть и идём на /login → редирект на /
  if (token && path.startsWith("/login")) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev_secret");
      await jose.jwtVerify(token, secret);
      url.pathname = "/";
      return NextResponse.redirect(url);
    } catch {
      const res = NextResponse.next();
      res.cookies.delete("remora_token");
      return res;
    }
  }

  // 3️⃣ Проверка защищённых маршрутов
  const protectedRoute = Object.keys(accessMap).find((r) => path.startsWith(r));
  if (!protectedRoute) return NextResponse.next();

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev_secret");
    const { payload } = await jose.jwtVerify(token!, secret);
    const role = (payload as any).role;
    const allowed = accessMap[protectedRoute];

    if (allowed.includes(role)) return NextResponse.next();

    url.pathname = "/";
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("JWT decode failed:", err);
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
