import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public/configs");
    const listPath = path.join(dir, "configs.json");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(listPath)) {
      fs.writeFileSync(listPath, JSON.stringify([], null, 2), "utf8");
    }

    const raw = fs.readFileSync(listPath, "utf8");
    let parsed: any[] = [];
    try {
      const configs = JSON.parse(raw);
      if (!Array.isArray(configs)) {
        throw new Error("configs.json must be an array");
      }
      parsed = configs as any[];
    } catch (parseErr) {
      console.warn("configs.json corrupted, resetting →", parseErr);
      parsed = [];
      fs.writeFileSync(listPath, JSON.stringify(parsed, null, 2), "utf8");
    }

    return NextResponse.json({ success: true, configs: parsed });
  } catch (err) {
    console.error("Error reading configs dir:", err);
    return NextResponse.json({ success: false, configs: [] }, { status: 500 });
  }
}
