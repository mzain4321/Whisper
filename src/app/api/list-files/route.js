import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), "src/app/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const files = fs.readdirSync(uploadDir);

    const transFile = path.join(process.cwd(), "src/app/transcriptions.json");
    let transData = {};
    if (fs.existsSync(transFile)) transData = JSON.parse(fs.readFileSync(transFile));

    const fileList = files.map((f) => ({
      name: f,
      transcription: transData[f] || null,
    }));

    return new Response(JSON.stringify(fileList), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
