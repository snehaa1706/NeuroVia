"""
Audio transcription endpoint using Google's free Web Speech API (via SpeechRecognition library).
This bypasses the browser's broken webkitSpeechRecognition by processing audio server-side.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import speech_recognition as sr
import tempfile
import subprocess
import os
import glob

router = APIRouter()

# === FFMPEG PATH DISCOVERY ===
# The backend server may have started before ffmpeg was installed,
# so we search common install locations and inject it into PATH + pydub config.
def _find_ffmpeg():
    """Find ffmpeg executable, searching common Windows install paths."""
    import shutil
    # Check if already in PATH
    path = shutil.which("ffmpeg")
    if path:
        return path
    # Search common winget/chocolatey/manual install locations
    search_patterns = [
        os.path.expanduser("~\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe"),
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        os.path.expanduser("~\\scoop\\shims\\ffmpeg.exe"),
    ]
    # Glob for any ffmpeg in WinGet packages (case-insensitive)
    for pattern in [
        os.path.expanduser("~\\AppData\\Local\\Microsoft\\WinGet\\Packages\\*ffmpeg*\\*\\bin\\ffmpeg.exe"),
        os.path.expanduser("~\\AppData\\Local\\Microsoft\\WinGet\\Packages\\*ffmpeg*\\*\\bin\\ffmpeg.EXE"),
        os.path.expanduser("~\\AppData\\Local\\Microsoft\\WinGet\\Packages\\*FFmpeg*\\*\\bin\\ffmpeg.EXE"),
    ]:
        search_patterns += glob.glob(pattern)
    for p in search_patterns:
        if os.path.isfile(p):
            return p
    return None

_ffmpeg_path = _find_ffmpeg()
if _ffmpeg_path:
    ffmpeg_dir = os.path.dirname(_ffmpeg_path)
    # Add to this process's PATH
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    # Configure pydub
    try:
        from pydub import AudioSegment
        AudioSegment.converter = _ffmpeg_path
        ffprobe = os.path.join(ffmpeg_dir, "ffprobe.exe") if os.name == "nt" else os.path.join(ffmpeg_dir, "ffprobe")
        if os.path.isfile(ffprobe):
            AudioSegment.ffprobe = ffprobe
        print(f"[Transcribe] ffmpeg configured: {_ffmpeg_path}")
    except ImportError:
        pass
else:
    print("[Transcribe] WARNING: ffmpeg not found! Audio conversion may fail.")


def convert_webm_to_wav(input_path: str, output_path: str) -> bool:
    """Convert webm audio to wav using pydub or subprocess ffmpeg."""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(input_path, format="webm")
        audio.export(output_path, format="wav")
        return True
    except Exception as e:
        print(f"[Transcribe] pydub conversion failed: {e}")
        # Try ffmpeg directly as fallback
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path],
                capture_output=True, timeout=15
            )
            return os.path.exists(output_path) and os.path.getsize(output_path) > 100
        except Exception as e2:
            print(f"[Transcribe] ffmpeg fallback failed: {e2}")
            return False


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts a webm/wav audio file and returns the transcribed text.
    Uses Google's free speech recognition API (no API key needed for basic use).
    """
    try:
        audio_bytes = await audio.read()
        
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Audio file too small or empty")
        
        print(f"[Transcribe] Received {len(audio_bytes)} bytes, type: {audio.content_type}")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_in:
            tmp_in.write(audio_bytes)
            input_path = tmp_in.name
        
        # Convert to wav
        wav_path = input_path.replace(".webm", ".wav")
        converted = convert_webm_to_wav(input_path, wav_path)
        
        if not converted:
            # Try treating the input directly as wav
            wav_path = input_path
        
        recognizer = sr.Recognizer()
        recognizer.energy_threshold = 300  # More sensitive to speech
        
        try:
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
            
            print(f"[Transcribe] Audio loaded, duration: {len(audio_data.frame_data) / audio_data.sample_rate / audio_data.sample_width:.1f}s")
            
            # Use Google's free speech recognition
            text = recognizer.recognize_google(audio_data, language="en-US")
            print(f"[Transcribe] Success: '{text}'")
            return {"text": text, "success": True}
            
        except sr.UnknownValueError:
            print("[Transcribe] No speech detected in audio")
            return {"text": "", "success": True, "message": "No speech detected"}
        except sr.RequestError as e:
            print(f"[Transcribe] Google API error: {e}")
            raise HTTPException(status_code=503, detail=f"Speech service error: {str(e)}")
        finally:
            for f in [input_path, wav_path]:
                try:
                    os.unlink(f)
                except:
                    pass
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

