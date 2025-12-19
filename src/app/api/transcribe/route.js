import { exec } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = path.join(process.cwd(), "src/app/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);


    const transcription = await new Promise((resolve, reject) => {
      exec(
        `python transcribe.py "${filePath}"`,
        { encoding: "utf8", maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) reject(err);
          else resolve(stdout.trim());
        }
      );
    });

    const transFile = path.join(process.cwd(), "src/app/transcriptions.json");
    let transData = {};
    if (fs.existsSync(transFile)) transData = JSON.parse(fs.readFileSync(transFile));
    transData[file.name] = transcription;
    fs.writeFileSync(transFile, JSON.stringify(transData, null, 2));

    return new Response(JSON.stringify({ transcription, fileName: file.name }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
