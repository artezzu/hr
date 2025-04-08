from database import Base, engine
from models import User, Application, StatusHistory

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Tables dropped successfully!")

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!") 