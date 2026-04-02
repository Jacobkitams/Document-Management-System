from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/", response_model=List[schemas.AuditLog])
def list_audit_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.check_admin_role)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).all()
