from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, auth

def create_superadmin(username, email, password):
    db = SessionLocal()
    try:
        # Update or Create
        existing_user = db.query(models.User).filter(models.User.username == username).first()
        hashed_password = auth.get_password_hash(password)
        
        if existing_user:
            existing_user.hashed_password = hashed_password
            existing_user.role = models.UserRole.superadmin
            print(f"Updated password for {username}.")
        else:
            new_user = models.User(
                username=username,
                email=email,
                hashed_password=hashed_password,
                role=models.UserRole.superadmin,
                is_active=True
            )
            db.add(new_user)
            print(f"Superadmin user '{username}' created successfully!")
        
        db.commit()
        db.refresh(new_user)
        print(f"Superadmin user '{username}' created successfully!")
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_superadmin("Jacob", "jacob@dms.com", "123456")
