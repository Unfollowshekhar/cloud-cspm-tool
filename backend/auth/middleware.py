from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.auth import verify_token

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(credentials.credentials)
    return {
        "username": payload.get("sub"),
        "role": payload.get("role"),
        "token": credentials.credentials,
    }


def require_role(minimum_role: str):
    role_hierarchy = {"viewer": 0, "analyst": 1, "admin": 2}
    min_level = role_hierarchy.get(minimum_role, 0)

    async def role_checker(user: dict = Depends(get_current_user)):
        user_level = role_hierarchy.get(user.get("role"), 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {minimum_role}",
            )
        return user

    return role_checker
