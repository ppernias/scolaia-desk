"""
User Model Module

This module defines the User model which represents the core user entity in the Scolaia application.
The model includes all necessary fields for user management, authentication, and authorization.
It uses SQLAlchemy for ORM functionality and inherits from the base model class.
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, DateTime
from app.db.base_class import Base

class User(Base):
    """
    User database model representing application users.

    This model stores essential user information including authentication details,
    account status, and usage statistics. It implements proper indexing for
    frequently queried fields and includes audit timestamps.

    Attributes:
        id (int): Primary key and unique identifier for the user
        email (str): User's email address, unique and indexed for fast lookups
        fullname (str): User's full name
        hashed_password (str): Securely hashed user password
        is_active (bool): Flag indicating if the account is active
        is_admin (bool): Flag indicating if the user has administrative privileges
        is_approved (bool): Flag indicating if the account has been approved
        creation_date (datetime): Timestamp of account creation
        last_login (datetime): Timestamp of user's last successful login
        token_count (int): Counter for tracking API token usage

    Notes:
        - Passwords are never stored in plain text
        - Email addresses must be unique across all users
        - Creation date is automatically set to UTC time on account creation
        - Account approval may be required based on system configuration
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    fullname = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    creation_date = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    token_count = Column(Integer, default=0)
