import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const text = formData.get("text");
    const audioFile = formData.get("audio");
    const hasAudio = formData.get("hasAudio") === "true";
    const fileExtension = formData.get("fileExtension") || "webm";
    let fileName = formData.get("fileName");

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "src/app/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let savedAudioFileName = null;
    
    // Save audio file if present
    if (hasAudio && audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);
      savedAudioFileName = `${fileName}.${fileExtension}`;
      const audioFilePath = path.join(uploadDir, savedAudioFileName);
      fs.writeFileSync(audioFilePath, audioBuffer);
      console.log("✅ Audio saved:", {
        fileName: savedAudioFileName,
        size: audioBuffer.length,
        type: fileExtension,
        path: audioFilePath
      });
    }

    // Save text file
    const textFileName = `${fileName}.txt`;
    const textFilePath = path.join(uploadDir, textFileName);
    fs.writeFileSync(textFilePath, text);
    console.log("✅ Text saved:", textFileName);

    // Save to transcriptions.json
    const transFile = path.join(process.cwd(), "src/app/transcriptions.json");
    let transData = {};
    if (fs.existsSync(transFile)) {
      transData = JSON.parse(fs.readFileSync(transFile));
    }
    
    // Store both text and audio reference
    transData[textFileName] = text;
    if (savedAudioFileName) {
      transData[savedAudioFileName] = text; // Link audio file to same transcription
    }
    
    fs.writeFileSync(transFile, JSON.stringify(transData, null, 2));

    return new Response(JSON.stringify({ 
      success: true, 
      textFile: textFileName,
      audioFile: savedAudioFileName,
      hasAudio: !!savedAudioFileName,
      fileType: fileExtension
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (err) {
    console.error("❌ Save error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}