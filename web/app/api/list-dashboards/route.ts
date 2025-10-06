import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public/configs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

    return NextResponse.json({ success: true, files });
  } catch (err) {
    console.error("Error reading configs dir:", err);
    return NextResponse.json({ success: false, files: [] });
  }
}
