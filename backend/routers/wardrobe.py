import os
import uuid
import json
import base64
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
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

@router.get("", response_model=list[WardrobeItemResponse])
def get_wardrobe(category: str | None = None, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        query = select(WardrobeItem).where(WardrobeItem.user_id == user_id)
        if category:
            query = query.where(WardrobeItem.category == category)
        # Order by newest added
        query = query.order_by(WardrobeItem.added_at.desc())
        items = session.exec(query).all()
        return items

@router.post("", response_model=WardrobeItemResponse)
def add_wardrobe_item(request: WardrobeItemRequest, user_id: str = Depends(get_current_user)):
    item = WardrobeItem(
        user_id=user_id,
        name=request.name,
        category=request.category.lower(),
        color=request.color,
        brand=request.brand,
        notes=request.notes,
        photo_url=request.photo_url
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
        
        # Optional: Delete associated photo from static directory if it was a local file
        if item.photo_url:
            filename = item.photo_url.split("/")[-1]
            local_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except Exception:
                    pass  # Don't fail if we can't remove file

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
    
    system_prompt = (
        "You are a wardrobe cataloging assistant. Identify each clothing item visible on the person in this photo. "
        "Return a JSON object with a single key 'items' containing a list of objects. Each object must have these keys:\n"
        "- 'name': short descriptive name of the clothing item (e.g. 'Black Leather Jacket', 'White Tennis Shoes', 'Navy Chinos')\n"
        "- 'category': one of [shirt, pants, shorts, dress, skirt, shoes, jacket, outerwear, bag, accessory, other]\n"
        "- 'color': primary color as a simple word (e.g. 'navy', 'white', 'black', 'grey', 'blue')\n"
        "- 'brand': visible brand name or null if not visible"
    )
    
    try:
        response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this full-size outfit selfie and list all visible items."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        items_data = data.get("items", [])
        
        scanned_items = []
        valid_categories = {
            "shirt", "pants", "shorts", "dress", "skirt", 
            "shoes", "jacket", "outerwear", "bag", "accessory", "other"
        }
        for item in items_data:
            cat = item.get("category", "other").lower()
            if cat not in valid_categories:
                cat = "other"
            scanned_items.append(ScannedClothingItem(
                name=item.get("name", "Unknown Item"),
                category=cat,
                color=item.get("color", "unknown"),
                brand=item.get("brand")
            ))
            
        base_url = str(request.base_url).rstrip('/')
        photo_url = f"{base_url}/static/wardrobe/{filename}"
        
        return ScanWardrobeResponse(items=scanned_items, photo_url=photo_url)
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to scan image: {str(e)}")
