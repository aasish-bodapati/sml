import os
import uuid
import json
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlmodel import Session, select
from datetime import datetime, timezone
from openai import OpenAI
from auth import get_current_user
from db import engine
from models.wardrobe import (
    WardrobeItem, WardrobeItemRequest, WardrobeItemResponse,
    ScannedClothingItem, ScanWardrobeResponse
)

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])
llm_client = OpenAI()

UPLOAD_DIR = "static/wardrobe"
os.makedirs(UPLOAD_DIR, exist_ok=True)

VALID_CATEGORIES = {
    "shirt", "pants", "shorts", "dress", "skirt",
    "shoes", "jacket", "outerwear", "bag", "accessory", "other"
}

@router.get("", response_model=list[WardrobeItemResponse])
def get_wardrobe(category: str | None = None, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        query = select(WardrobeItem).where(WardrobeItem.user_id == user_id)
        if category and category != "all":
            query = query.where(WardrobeItem.category == category)
        query = query.order_by(WardrobeItem.added_at.desc())
        return session.exec(query).all()

@router.post("", response_model=WardrobeItemResponse)
def add_wardrobe_item(request: WardrobeItemRequest, user_id: str = Depends(get_current_user)):
    item = WardrobeItem(
        user_id=user_id,
        name=request.name,
        category=request.category.lower(),
        color=request.color,
        brand=request.brand,
        notes=request.notes,
        photo_url=request.photo_url,
        tags=request.tags or [],
    )
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

@router.put("/{item_id}", response_model=WardrobeItemResponse)
def update_wardrobe_item(item_id: int, request: WardrobeItemRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        item = session.get(WardrobeItem, item_id)
        if not item or item.user_id != user_id:
            raise HTTPException(status_code=404, detail="Item not found")
        item.name = request.name
        item.category = request.category.lower()
        item.color = request.color
        item.brand = request.brand
        item.notes = request.notes
        item.photo_url = request.photo_url
        item.tags = request.tags or []
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

@router.delete("/{item_id}")
def delete_wardrobe_item(item_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        item = session.get(WardrobeItem, item_id)
        if not item or item.user_id != user_id:
            raise HTTPException(status_code=404, detail="Item not found")
        if item.photo_url:
            filename = item.photo_url.split("/")[-1]
            local_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except Exception:
                    pass
        session.delete(item)
        session.commit()
        return {"success": True}

@router.post("/{item_id}/wear", response_model=WardrobeItemResponse)
def wear_wardrobe_item(item_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        item = session.get(WardrobeItem, item_id)
        if not item or item.user_id != user_id:
            raise HTTPException(status_code=404, detail="Item not found")
        item.times_worn += 1
        item.last_worn = datetime.now(timezone.utc)
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

SCAN_SYSTEM_PROMPT = (
    "You are a wardrobe cataloging assistant. Identify each clothing item visible on the person in this photo. "
    "Return a JSON object with a single key 'items' containing a list of objects. "
    "Each object must have these exact keys:\n"
    "- 'name': short descriptive name (e.g. 'Black Leather Jacket', 'White Oxford Shirt', 'Navy Slim Chinos')\n"
    "- 'category': one of [shirt, pants, shorts, dress, skirt, shoes, jacket, outerwear, bag, accessory, other]\n"
    "- 'color': primary color as a simple word (e.g. 'navy', 'white', 'black', 'grey', 'olive')\n"
    "- 'brand': visible brand name as a string, or null if not visible\n"
    "- 'tags': a JSON array of 3–8 short lowercase descriptive tags about the item's characteristics. "
    "Examples of good tags: ['slim fit', 'casual', 'cotton', 'summer', 'formal', 'striped', 'oversized', "
    "'linen', 'athletic', 'vintage', 'minimalist', 'graphic tee', 'business casual', 'relaxed fit', "
    "'ankle length', 'high waist', 'crew neck', 'v-neck', 'button up', 'zip up', 'leather', 'denim', "
    "'synthetic', 'warm weather', 'cold weather', 'layering piece']. "
    "Pick only tags that are clearly observable or inferable from the visible item."
)

@router.post("/scan", response_model=ScanWardrobeResponse)
async def scan_wardrobe(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    contents = await file.read()

    filename = f"{uuid.uuid4()}.jpg"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    base64_image = base64.b64encode(contents).decode("utf-8")

    try:
        response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SCAN_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this full-size outfit selfie and list all visible clothing items with their tags."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )

        data = json.loads(response.choices[0].message.content)
        items_data = data.get("items", [])

        scanned_items = []
        for raw in items_data:
            cat = raw.get("category", "other").lower()
            if cat not in VALID_CATEGORIES:
                cat = "other"
            # Sanitise tags: lowercase strings only, drop empty values
            raw_tags = raw.get("tags", [])
            tags = [str(t).lower().strip() for t in raw_tags if t and str(t).strip()]
            scanned_items.append(ScannedClothingItem(
                name=raw.get("name", "Unknown Item"),
                category=cat,
                color=raw.get("color", "unknown"),
                brand=raw.get("brand"),
                tags=tags,
            ))

        base_url = str(request.base_url).rstrip("/")
        photo_url = f"{base_url}/static/wardrobe/{filename}"

        return ScanWardrobeResponse(items=scanned_items, photo_url=photo_url)

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to scan image: {str(e)}")
