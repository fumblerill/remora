import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { name, widgets } = await req.json();

    if (!name || !widgets) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const dirPath = path.join(process.cwd(), "public", "configs");
    const listFilePath = path.join(dirPath, "configs.json");

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const safeName = name.replace(/[^a-zA-Z0-9а-яА-Я_\-]/g, "_");
    const fileName = `${safeName}.json`;
    const filePath = path.join(dirPath, fileName);

    const isUpdate = fs.existsSync(filePath);

    const dashboardData = {
      name,
      updatedAt: new Date().toISOString(),
      widgets,
    };

    // 💾 сохраняем сам конфиг
    fs.writeFileSync(filePath, JSON.stringify(dashboardData, null, 2), "utf8");

    // 📄 обновляем список configs.json
    let configs: { name: string; file: string; createdAt: string }[] = [];
    if (fs.existsSync(listFilePath)) {
      try {
        const raw = fs.readFileSync(listFilePath, "utf8");
        configs = JSON.parse(raw);
      } catch {
        configs = [];
      }
    }

    const existing = configs.find((c) => c.file === fileName);

    if (existing) {
      existing.name = name;
      existing.createdAt = dashboardData.updatedAt;
    } else {
      configs.push({
        name,
        file: fileName,
        createdAt: dashboardData.updatedAt,
      });
    }

    fs.writeFileSync(listFilePath, JSON.stringify(configs, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      file: fileName,
      updated: isUpdate,
    });
  } catch (err: any) {
    console.error("Ошибка при сохранении дашборда:", err);
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
