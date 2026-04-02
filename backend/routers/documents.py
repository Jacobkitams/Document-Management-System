from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
from datetime import datetime
from typing import Optional, List
from ..database import get_db, settings
from .. import models, schemas, auth

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/categories", response_model=List[schemas.Category])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

def log_activity(db: Session, user_id: int, action: str, details: str = None, ip: str = None):
    log = models.AuditLog(user_id=user_id, action=action, details=details, ip_address=ip)
    db.add(log)
    db.commit()

@router.post("/upload", response_model=schemas.Document)
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Ensure upload directory exists
    if not os.path.exists(settings.UPLOAD_DIR):
        os.makedirs(settings.UPLOAD_DIR)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create DB entry
    db_doc = models.Document(
        title=title,
        description=description,
        file_path=file_path,
        file_type=file.content_type,
        category_id=category_id,
        status=models.DocumentStatus.pending,
        uploaded_by=current_user.id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    log_activity(db, current_user.id, "UPLOAD", f"Uploaded document: {title} (ID: {db_doc.id})")
    
    return db_doc

@router.get("/", response_model=List[schemas.Document])
def list_documents(
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Document)
    
    # If not admin, only show approved or own documents
    if current_user.role == models.UserRole.user:
        query = query.filter((models.Document.status == models.DocumentStatus.approved) | (models.Document.uploaded_by == current_user.id))
    
    if status:
        query = query.filter(models.Document.status == status)
    if category_id:
        query = query.filter(models.Document.category_id == category_id)
    if search:
        query = query.filter(models.Document.title.ilike(f"%{search}%") | models.Document.description.ilike(f"%{search}%"))
        
    docs = query.all()
    # Populate uploader info
    for doc in docs:
        if doc.uploader:
            doc.uploaded_by_name = doc.uploader.username
            doc.uploaded_by_avatar = f"https://api.dicebear.com/7.x/initials/svg?seed={doc.uploader.username}"
    return docs

@router.get("/{doc_id}", response_model=schemas.Document)
def get_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check permissions
    if current_user.role == models.UserRole.user and doc.status != models.DocumentStatus.approved and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return doc

@router.get("/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check permissions
    if current_user.role == models.UserRole.user and doc.status != models.DocumentStatus.approved and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    log_activity(db, current_user.id, "DOWNLOAD", f"Downloaded document ID: {doc_id}")
    
    return FileResponse(doc.file_path, filename=os.path.basename(doc.file_path), media_type=doc.file_type)

@router.put("/{doc_id}/approve", response_model=schemas.Document)
def approve_document(doc_id: int, status: schemas.DocumentStatus, db: Session = Depends(get_db), current_user: models.User = Depends(auth.check_admin_role)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc.status = status
    doc.approved_by = current_user.id
    db.commit()
    db.refresh(doc)
    
    log_activity(db, current_user.id, f"ACTION_{status.upper()}", f"{status.capitalize()}d document ID: {doc_id}")
    
    return doc

@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Only uploader or admin can delete
    if current_user.role == models.UserRole.user and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Remove file from disk
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
        
    db.delete(doc)
    db.commit()
    
    log_activity(db, current_user.id, "DELETE", f"Deleted document ID: {doc_id}")
    
    return {"message": "Document deleted successfully"}
