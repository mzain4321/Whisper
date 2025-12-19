import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const text = formData.get("text");
    const fileName = formData.get("fileName") || `transcription_${Date.now()}.txt`;

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save as text file
    const uploadDir = path.join(process.cwd(), "src/app/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, text);

    // Also save to transcriptions.json
    const transFile = path.join(process.cwd(), "src/app/transcriptions.json");
    let transData = {};
    if (fs.existsSync(transFile)) transData = JSON.parse(fs.readFileSync(transFile));
    transData[fileName] = text;
    fs.writeFileSync(transFile, JSON.stringify(transData, null, 2));

    return new Response(JSON.stringify({ success: true, fileName }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}