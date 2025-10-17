import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAFE_NAME_REGEX = /[^a-zA-Z0-9а-яА-Я_\-]/g;

export async function GET(
  _req: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name: paramName } = await context.params;
  const rawName = paramName ?? "";
  if (!rawName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const safeName = rawName.replace(SAFE_NAME_REGEX, "_");
  const filePath = path.join(
    process.cwd(),
    "public",
    "configs",
    `${safeName}.json`
  );

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Failed to read dashboard config:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to read config" },
      { status: 500 }
    );
  }
}
