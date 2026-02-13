"""
Configuration for BookYourShoot Backend
Environment variables and settings

Loads from .env file automatically
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============ EMAIL CONFIGURATION ============
# Gmail SMTP Settings (loaded from .env)
GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

# Email mode: Auto-enable if credentials are set
USE_REAL_EMAIL = bool(GMAIL_ADDRESS and GMAIL_APP_PASSWORD)

# SMTP Settings (don't change unless using different provider)
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587  # TLS port
SMTP_USE_TLS = True

# From name in emails
EMAIL_FROM_NAME = "BookYourShoot"


# ============ PDF CONFIGURATION ============
# PDF mode: True = generate real PDFs, False = HTML only
GENERATE_PDF = True  # fpdf2 is pure Python, always works


# ============ STRIPE CONFIGURATION ============
# Test mode keys (safe to use, no real charges)
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_demo")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_demo")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_demo")


# ============ APP SETTINGS ============
APP_NAME = "BookYourShoot"
APP_URL = os.getenv("APP_URL", "http://localhost:3000")
API_URL = os.getenv("API_URL", "http://localhost:8000")

# Platform fee percentage
PLATFORM_FEE_PERCENT = 10

# Development mode (enables mock tokens and other dev features)
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

# ============ MOCK TEST ACCOUNTS ============
# Hardcoded test accounts for bypassing rate limits during development
# Password for all: "Test@1234"
MOCK_ACCOUNTS = {
    "client@test.com": {
        "id": "257f9b67-99fa-44ce-ae67-6229c36380b5",
        "email": "client@test.com",
        "full_name": "Test Client",
        "phone": "+92-300-1111111",
        "city": "Lahore",
        "role": "client",
        "password": "Test@1234"
    },
    "photographer@test.com": {
        "id": "21bf398a-e012-4c4d-9b55-caeac7ec6dc7",
        "email": "photographer@test.com",
        "full_name": "Test Photographer",
        "phone": "+92-300-2222222",
        "city": "Lahore",
        "role": "photographer",
        "password": "Test@1234"
    },
    "admin@test.com": {
        "id": "5fb7a96b-3dd0-4d44-9631-c07a256292ee",
        "email": "admin@test.com",
        "full_name": "Test Admin",
        "phone": "+92-300-3333333",
        "city": "Lahore",
        "role": "admin",
        "password": "Test@1234"
    }
}

# Escrow release time in hours
ESCROW_RELEASE_HOURS = 48
