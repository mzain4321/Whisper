import whisper
import sys
import warnings

warnings.filterwarnings("ignore")

audio_file = sys.argv[1]
# model = whisper.load_model("base")
model = whisper.load_model("tiny")
# model = whisper.load_model("base", device="cuda", compute_type="float16")
# model = whisper.load_model("base", device="cuda")

result = model.transcribe(audio_file)
text = result.get("text", "").strip()
print(text, flush=True)
