import fs from "fs";
import path from "path";

export async function GET(req, { params }) {
  try {
    const { filename } = params;
    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
