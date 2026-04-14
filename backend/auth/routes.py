from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from auth.auth import verify_password, hash_password, create_access_token
from auth.models import LoginRequest, TokenResponse, ChangePasswordRequest
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Will be set from server.py
db = None


def set_db(database):
    global db
    db = database


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # Update last login
    await db.users.update_one(
        {"username": request.username},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return TokenResponse(access_token=token, username=user["username"], role=user["role"])


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    await db.token_blacklist.insert_one({
        "token": user["token"],
        "blacklisted_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    db_user = await db.users.find_one({"username": user["username"]}, {"_id": 0, "password_hash": 0})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db_user = await db.users.find_one({"username": user["username"]}, {"_id": 0})
    if not db_user or not verify_password(request.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"username": user["username"]},
        {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Password changed successfully"}
