# app.py
import os
# Ensure PyTorch is used
os.environ["USE_TORCH"] = "1"

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
import io
import numpy as np
from PIL import Image, UnidentifiedImageError
from doctr.models import ocr_predictor
from doctr.io import DocumentFile
from typing import List, Dict, Any, Optional

app = FastAPI(title="DocTR Text Extraction API")

# Load the OCR model once at startup
model = ocr_predictor(pretrained=True)

def extract_simple_blocks(result):
    """Extract simplified blocks with text, confidence and location"""
    blocks = []

    for page_idx, page in enumerate(result.pages):
        for block in page.blocks:
            # Extract text by iterating through lines
            block_lines = []
            all_words = []

            for line in block.lines:
                line_words = []
                for word in line.words:
                    line_words.append(word.value)
                    all_words.append(word)

                if line_words:
                    block_lines.append(" ".join(line_words))

            # Join lines with newlines
            block_text = "\n".join(block_lines)

            # Calculate average confidence for the block
            avg_confidence = sum(word.confidence for word in all_words) / len(all_words) if all_words else 0

            # Add to blocks list
            blocks.append({
                "text": block_text,
                "confidence": float(avg_confidence),
                "location": block.geometry  # [x0, y0, x1, y1] in relative coordinates
            })

    # Full text is the combination of all blocks
    full_text = "\n\n".join([b["text"] for b in blocks])

    return {
        "text": full_text,
        "blocks": blocks
    }

@app.post("/scan")
async def scan(
        file: UploadFile = File(...),
        text_only: Optional[bool] = Query(False, description="Return only extracted text without block details")
):
    """
    Extract text from an uploaded image file using docTR.

    Parameters:
    - file: The image file to process
    - text_only: Set to true to return only the text without block details
    """
    # Validation logic
    valid_image = False
    if file.content_type and file.content_type.startswith("image/"):
        valid_image = True

    if not valid_image:
        valid_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp']
        file_ext = os.path.splitext(file.filename.lower())[1] if file.filename else ''
        if file_ext in valid_extensions:
            valid_image = True

    if not valid_image:
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Process the image
        contents = await file.read()
        temp_file_path = f"/tmp/{file.filename}"
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(contents)

        doc = DocumentFile.from_images(temp_file_path)
        result = model(doc)

        try:
            os.remove(temp_file_path)
        except:
            pass

        # Return appropriate format based on parameters
        if text_only:
            # Basic text only
            extracted_text = result.render()
            return {"success": True, "text": extracted_text}
        else:
            # Simple block format by default
            simple_results = extract_simple_blocks(result)
            return {"success": True, **simple_results}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Error: {str(e)}"}
        )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
