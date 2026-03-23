from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, documents, users, audit
from database import engine, Base

# Create tables in DB (SQLAlchemy)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Document Management System (DMS) API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(users.router)
app.include_router(audit.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to DMS API", "docs_url": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
