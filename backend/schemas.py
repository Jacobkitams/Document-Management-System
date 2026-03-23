from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    superadmin = "superadmin"
    admin = "admin"
    user = "user"

class DocumentStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# Document Schemas
class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[DocumentStatus] = None

class Document(DocumentBase):
    id: int
    file_path: str
    file_type: str
    status: DocumentStatus
    uploaded_by: int
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogBase(BaseModel):
    action: str
    details: Optional[str] = None

class AuditLog(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
