from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.get("/", response_model=List[schemas.User])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.check_superadmin_role)):
    return db.query(models.User).all()

@router.post("/{user_id}/toggle", response_model=schemas.User)
def toggle_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.check_superadmin_role)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.username == "superadmin":
        raise HTTPException(status_code=400, detail="Cannot toggle superadmin")
        
    db_user.is_active = not db_user.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.check_superadmin_role)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.check_superadmin_role)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.username == "superadmin":
        raise HTTPException(status_code=400, detail="Cannot delete superadmin")
        
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}
