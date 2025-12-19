import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { fileName } = await req.json();

    if (!fileName) return new Response(JSON.stringify({ error: "FileName required" }), { status: 400 });

    const filePath = path.join(process.cwd(), "src/app/uploads", fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const transFile = path.join(process.cwd(), "src/app/transcriptions.json");
    if (fs.existsSync(transFile)) {
      let transData = JSON.parse(fs.readFileSync(transFile));
      delete transData[fileName];
      fs.writeFileSync(transFile, JSON.stringify(transData, null, 2));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
