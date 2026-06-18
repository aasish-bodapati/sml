import os
import jwt
import time as time_lib
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_ALGORITHM = "HS256"

# Supabase JWKS configuration for ES256 verification
JWKS_URL = "https://xpyzowlshriupianmuit.supabase.co/auth/v1/.well-known/jwks.json"
jwk_client = PyJWKClient(JWKS_URL, cache_keys=True)

security = HTTPBearer()
cached_signing_key = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    global cached_signing_key
    token = credentials.credentials
    try:
        t0 = time_lib.time()
        # Fetch the public key from the JWKS endpoint
        if not cached_signing_key:
            cached_signing_key = jwk_client.get_signing_key_from_jwt(token).key
        
        t1 = time_lib.time()
        print(f"JWK Fetch took {t1 - t0:.3f} seconds")
        
        # Verify the signature using the public key and ES256 algorithm
        payload = jwt.decode(
            token,
            cached_signing_key,
            algorithms=["ES256"],
            options={"verify_aud": False}
        )
        t2 = time_lib.time()
        print(f"JWT Decode took {t2 - t1:.3f} seconds")
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing 'sub' claim."
            )
        return user_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
