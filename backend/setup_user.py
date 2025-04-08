from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    db = SessionLocal()
    
    # Check if user already exists
    if db.query(User).filter(User.email == "admin@abstract.com").first():
        print("Test user already exists!")
        return
    
    # Create test user
    hashed_password = pwd_context.hash("admin123")
    test_user = User(
        email="admin@abstract.com",
        full_name="Admin User",
        hashed_password=hashed_password,
        role="admin"
    )
    
    db.add(test_user)
    db.commit()
    print("Test user created successfully!")
    print("Email: admin@abstract.com")
    print("Password: admin123")

if __name__ == "__main__":
    create_test_user() 