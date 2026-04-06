from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models, auth

def create_user(username, email, password, role):
    db = SessionLocal()
    try:
        # Check if already exists
        existing_user = db.query(models.User).filter(models.User.username == username).first()
        if existing_user:
            print(f"User '{username}' already exists. Skipping.")
            return

        hashed_password = auth.get_password_hash(password)
        new_user = models.User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role=role,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"User '{username}' created successfully as '{role.value}'!")
    except Exception as e:
        db.rollback()
        print(f"Error creating user {username}: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Create regular user
    create_user("Michel", "michel@example.com", "password123", models.UserRole.user)
    
    # Create admin user
    create_user("AdminUser", "admin@example.com", "admin123", models.UserRole.admin)
