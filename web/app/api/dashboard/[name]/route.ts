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

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name: paramName } = await context.params;
  const rawName = paramName ?? "";
  if (!rawName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const safeName = rawName.replace(SAFE_NAME_REGEX, "_");
  const dirPath = path.join(process.cwd(), "public", "configs");
  const filePath = path.join(dirPath, `${safeName}.json`);
  const listPath = path.join(dirPath, "configs.json");

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    let configs: any[] = [];
    if (fs.existsSync(listPath)) {
      try {
        const raw = fs.readFileSync(listPath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          configs = parsed;
        }
      } catch (err) {
        console.warn("Failed to parse configs.json on delete:", err);
      }
    }

    const filtered = configs.filter(
      (item) => item && item.file !== `${safeName}.json`
    );
    fs.writeFileSync(listPath, JSON.stringify(filtered, null, 2), "utf8");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete dashboard config:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to delete config" },
      { status: 500 }
    );
  }
}
