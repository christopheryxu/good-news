from __future__ import annotations
import asyncio
from pathlib import Path
from google import genai
from google.genai import types


async def generate_image(prompt: str, api_key: str, dest_path: Path) -> bool:
    """Generate a 9:16 portrait image via Google Imagen (AI Studio)."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        client = genai.Client(api_key=api_key)
        response = await asyncio.to_thread(
            client.models.generate_images,
            model="imagen-3.0-generate-002",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="9:16",
                output_mime_type="image/jpeg",
            ),
        )
        image_bytes = response.generated_images[0].image.image_bytes
        dest_path.write_bytes(image_bytes)
        return True
    except Exception as exc:
        print(f"[imagen] generate_image failed: {exc}")
        return False
