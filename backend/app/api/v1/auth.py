from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    print(f"Registering user: {user_data.username}")
    print(f"Generated hash (first 20 chars): {hashed_password[:20]}...")
    print(f"Hash type: {type(hashed_password)}")
    print(f"Hash length: {len(hashed_password)}")
    
    # Verify the hash works immediately after creation
    from app.core.security import verify_password
    test_verify = verify_password(user_data.password, hashed_password)
    print(f"Password verification test after hashing: {test_verify}")
    
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Verify hash is stored correctly
    print(f"Hash stored in DB (first 20 chars): {db_user.hashed_password[:20] if db_user.hashed_password else 'None'}...")
    print(f"Stored hash type: {type(db_user.hashed_password)}")
    
    return db_user


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    # Trim whitespace from username and password
    username = user_credentials.username.strip() if user_credentials.username else ""
    password = user_credentials.password
    
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Find user by username
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        print(f"Login failed: User '{username}' not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Debug: Print hash information (remove in production)
    print(f"Login attempt for user: {user.username}")
    print(f"Stored hash (first 20 chars): {user.hashed_password[:20] if user.hashed_password else 'None'}...")
    
    # Verify password
    password_valid = verify_password(password, user.hashed_password)
    print(f"Password verification result: {password_valid}")
    
    if not password_valid:
        print(f"Login failed: Password verification failed for user '{username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    print(f"Login successful for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

