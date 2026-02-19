"""
Email Service - Real Gmail SMTP + Mock fallback
Sends real emails via Gmail SMTP when configured, otherwise logs to console

Setup:
1. Get Gmail App Password from https://myaccount.google.com/apppasswords
2. Update config.py with your Gmail address and App Password
3. Set USE_REAL_EMAIL = True in config.py
"""

from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Import config (with fallback for direct testing)
try:
    from backend.config import (
        GMAIL_ADDRESS, GMAIL_APP_PASSWORD, USE_REAL_EMAIL,
        SMTP_HOST, SMTP_PORT, SMTP_USE_TLS, EMAIL_FROM_NAME
    )
except ImportError:
    try:
        from config import (
            GMAIL_ADDRESS, GMAIL_APP_PASSWORD, USE_REAL_EMAIL,
            SMTP_HOST, SMTP_PORT, SMTP_USE_TLS, EMAIL_FROM_NAME
        )
    except ImportError:
        # Fallback defaults
        GMAIL_ADDRESS = ""
        GMAIL_APP_PASSWORD = ""
        USE_REAL_EMAIL = False
        SMTP_HOST = "smtp.gmail.com"
        SMTP_PORT = 587
        SMTP_USE_TLS = True
        EMAIL_FROM_NAME = "BookYourShoot"


class EmailTemplate(Enum):
    BOOKING_CONFIRMATION = "booking_confirmation"
    BOOKING_CANCELLED = "booking_cancelled"
    PAYMENT_RECEIPT = "payment_receipt"
    PAYMENT_RELEASED = "payment_released"
    PAYMENT_REFUNDED = "payment_refunded"
    BOOKING_REMINDER = "booking_reminder"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    EQUIPMENT_RENTAL_CONFIRMATION = "equipment_rental_confirmation"
    # New 50/50 payment flow templates
    ADVANCE_PAYMENT_RECEIVED = "advance_payment_received"
    REMAINING_PAYMENT_DUE = "remaining_payment_due"
    REMAINING_PAYMENT_RECEIVED = "remaining_payment_received"
    WORK_COMPLETED = "work_completed"
    PAYOUT_PROCESSED = "payout_processed"
    PHOTOGRAPHER_NEW_BOOKING = "photographer_new_booking"


class Email:
    """Represents an email message"""
    def __init__(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        body_html: str,
        body_text: str,
        template: EmailTemplate = None,
        data: Dict = None
    ):
        self.id = f"EMAIL-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        self.to_email = to_email
        self.to_name = to_name
        self.subject = subject
        self.body_html = body_html
        self.body_text = body_text
        self.template = template
        self.data = data or {}
        self.sent_at = datetime.now()
        self.status = "sent"  # In demo, all emails are "sent"

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "to_email": self.to_email,
            "to_name": self.to_name,
            "subject": self.subject,
            "body_text": self.body_text,
            "template": self.template.value if self.template else None,
            "sent_at": self.sent_at.isoformat(),
            "status": self.status
        }


class EmailService:
    """
    Mock email service for demo
    Logs to console and stores in memory
    """
    
    # Email templates with placeholders
    TEMPLATES = {
        EmailTemplate.BOOKING_CONFIRMATION: {
            "subject": "Booking Confirmed - {service_type} on {date}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1A73E8 0%, #1557B0 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Booking Confirmed! 📸</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Great news! Your booking has been confirmed.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1A73E8;">Booking Details</h3>
                            <p><strong>Service:</strong> {service_type}</p>
                            <p><strong>Date:</strong> {date}</p>
                            <p><strong>Time:</strong> {time}</p>
                            <p><strong>Event City:</strong> {event_city}</p>
                            <p><strong>Location:</strong> {location}</p>
                            <p><strong>Photographer:</strong> {photographer_name}</p>
                        </div>
                        
                        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #7B1FA2;">Travel Details</h3>
                            <p style="margin-top: 10px; margin-bottom: 5px;"><strong>Travel Mode:</strong> {travel_mode_display}</p>
                            <p style="margin: 5px 0;"><strong>Travel Cost:</strong> PKR {travel_cost}</p>
                            <p style="margin: 5px 0; font-size: 13px; color: #555;">{travel_breakdown_text}</p>
                            {accommodation_note}
                        </div>
                        
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span><strong>Service Cost:</strong></span>
                                <span>PKR {service_price}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span><strong>Travel Cost:</strong></span>
                                <span>PKR {travel_cost}</span>
                            </div>
                            <hr style="margin: 10px 0; border: none; border-top: 1px solid #2e7d32;">
                            <div style="display: flex; justify-content: space-between; font-size: 18px;">
                                <strong>Total Amount:</strong>
                                <strong style="color: #2e7d32;">PKR {amount}</strong>
                            </div>
                            <p style="margin: 8px 0 0 0; color: #2e7d32; font-size: 14px;">
                                <strong>💰 Payment Status:</strong> Full amount paid and securely held in escrow until work is completed.
                            </p>
                            <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">
                                <em>Payment will be released to photographer after session completion</em>
                            </p>
                        </div>
                        
                        <p>Need to make changes? Contact your photographer through the app.</p>
                        
                        <a href="{dashboard_url}" style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Booking</a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Booking Confirmed!
                
                Hi {client_name},
                
                Great news! Your booking has been confirmed.
                
                Booking Details:
                - Service: {service_type}
                - Date: {date}
                - Time: {time}
                - Event City: {event_city}
                - Location: {location}
                - Photographer: {photographer_name}
                
                Travel Details:
                - Travel Mode: {travel_mode_display}
                - Travel Cost: PKR {travel_cost}
                - Details: {travel_breakdown_text}
                {accommodation_note}
                
                Cost Breakdown:
                - Service Cost: PKR {service_price}
                - Travel Cost: PKR {travel_cost}
                - Total Amount: PKR {amount}
                
                Payment Status: Full amount paid and held in escrow
                Payment Release: After session completion
                
                View your booking at: {dashboard_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.PAYMENT_RECEIPT: {
            "subject": "Payment Receipt - {transaction_id}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1A73E8 0%, #1557B0 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Payment Receipt 💳</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Thank you for your payment. Here's your receipt.</p>
                        
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Transaction ID:</span>
                                <strong>{transaction_id}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Date:</span>
                                <span>{date}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Service:</span>
                                <span>{service_type}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                                <span>Photographer:</span>
                                <span>{photographer_name}</span>
                            </div>
                            <hr style="margin: 15px 0;">
                            <h4 style="margin: 10px 0 15px 0; color: #1A73E8;">Cost Breakdown</h4>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Service Cost:</span>
                                <span>PKR {service_cost}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                                <span>Travel Cost:</span>
                                <span>PKR {travel_cost}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Subtotal:</span>
                                <span>PKR {subtotal}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Platform Fee (10%):</span>
                                <span>PKR {platform_fee}</span>
                            </div>
                            <hr style="margin: 15px 0;">
                            <div style="display: flex; justify-content: space-between; font-size: 18px;">
                                <strong>Total Paid:</strong>
                                <strong style="color: #1A73E8;">PKR {total}</strong>
                            </div>
                        </div>
                        
                        {travel_breakdown_section}
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                            <p style="margin: 0; color: #e65100;">
                                <strong>🔒 Payment Status:</strong> Secured in escrow. Will be released to photographer after you confirm the work.
                            </p>
                        </div>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Payment Receipt
                
                Transaction ID: {transaction_id}
                Date: {date}
                
                Service: {service_type}
                Photographer: {photographer_name}
                
                Cost Breakdown:
                - Service Cost: PKR {service_cost}
                - Travel Cost: PKR {travel_cost}
                
                Subtotal: PKR {subtotal}
                Platform Fee (10%): PKR {platform_fee}
                Total Paid: PKR {total}
                
                {travel_breakdown_text}
                
                Payment Status: Secured in escrow. Will be released after work confirmation.
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.PAYMENT_RELEASED: {
            "subject": "Payment Released - PKR {amount}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Payment Released! 💰</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {recipient_name},</p>
                        <p>Great news! The payment has been released.</p>
                        
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666;">Amount Released</p>
                            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #2e7d32;">PKR {amount}</p>
                        </div>
                        
                        <p><strong>Booking:</strong> {service_type}</p>
                        <p><strong>Transaction ID:</strong> {transaction_id}</p>
                        
                        <p>The payment will be credited to your account within 2-3 business days.</p>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Payment Released!
                
                Hi {recipient_name},
                
                Great news! The payment has been released.
                
                Amount Released: PKR {amount}
                Booking: {service_type}
                Transaction ID: {transaction_id}
                
                The payment will be credited to your account within 2-3 business days.
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.EQUIPMENT_RENTAL_CONFIRMATION: {
            "subject": "Equipment Rental Confirmed - {equipment_name}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Equipment Rental Confirmed! 🎥</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Great news! Your equipment rental has been confirmed.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #9C27B0;">Rental Details</h3>
                            <p><strong>Equipment:</strong> {equipment_name}</p>
                            <p><strong>Category:</strong> {equipment_category}</p>
                            <p><strong>Rental Period:</strong> {rental_period}</p>
                            <p><strong>Start Date:</strong> {start_date}</p>
                            <p><strong>Owner:</strong> {owner_name}</p>
                        </div>
                        
                        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0; color: #7B1FA2;">
                                <strong>💵 Rental Cost:</strong> PKR {rental_cost}
                            </p>
                            <p style="margin: 0 0 10px 0; color: #7B1FA2;">
                                <strong>🔒 Security Deposit:</strong> PKR {deposit} (Refundable)
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 18px; color: #9C27B0;">
                                <strong>Total Paid:</strong> PKR {total_amount}
                            </p>
                        </div>
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                            <p style="margin: 0; color: #e65100;">
                                <strong>📞 Contact Owner:</strong> {owner_phone}
                            </p>
                        </div>
                        
                        <p style="margin-top: 20px;">The equipment owner will contact you to arrange pickup/delivery.</p>
                        
                        <a href="{dashboard_url}" style="display: inline-block; background: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View My Rentals</a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Equipment Rental Confirmed!
                
                Hi {client_name},
                
                Great news! Your equipment rental has been confirmed.
                
                Rental Details:
                - Equipment: {equipment_name}
                - Category: {equipment_category}
                - Rental Period: {rental_period}
                - Start Date: {start_date}
                - Owner: {owner_name}
                
                Rental Cost: PKR {rental_cost}
                Security Deposit: PKR {deposit} (Refundable)
                Total Paid: PKR {total_amount}
                
                Contact Owner: {owner_phone}
                
                The equipment owner will contact you to arrange pickup/delivery.
                
                View your rentals at: {dashboard_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.BOOKING_REMINDER: {
            "subject": "Reminder: {service_type} tomorrow!",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">📸 Shoot Tomorrow!</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {recipient_name},</p>
                        <p>This is a friendly reminder that your photo session is tomorrow!</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #FF9800;">Session Details</h3>
                            <p><strong>Service:</strong> {service_type}</p>
                            <p><strong>Date:</strong> {date}</p>
                            <p><strong>Time:</strong> {time}</p>
                            <p><strong>Location:</strong> {location}</p>
                        </div>
                        
                        <h4>Quick Checklist:</h4>
                        <ul>
                            <li>Confirm the meeting point and time</li>
                            <li>Check the weather forecast</li>
                            <li>Prepare any outfits or props needed</li>
                            <li>Charge your phone for communication</li>
                        </ul>
                        
                        <p>Have a great shoot! 📷</p>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Shoot Tomorrow!
                
                Hi {recipient_name},
                
                This is a reminder that your photo session is tomorrow!
                
                Session Details:
                - Service: {service_type}
                - Date: {date}
                - Time: {time}
                - Location: {location}
                
                Quick Checklist:
                - Confirm meeting point and time
                - Check weather forecast
                - Prepare outfits/props
                - Charge your phone
                
                Have a great shoot!
                
                BookYourShoot - Shoot Smart
            """
        },
        
        # ==================== 50/50 Payment Flow Templates ====================
        
        EmailTemplate.ADVANCE_PAYMENT_RECEIVED: {
            "subject": "Full Payment Received - Booking #{booking_id}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Payment Received! 💵</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Your full payment has been received and securely held in escrow. Your booking is confirmed!</p>
                        
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666;">Amount Paid (Held in Escrow)</p>
                            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #2e7d32;">PKR {advance_amount}</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1A73E8;">Booking Details</h3>
                            <p><strong>Booking ID:</strong> #{booking_id}</p>
                            <p><strong>Service:</strong> {service_type}</p>
                            <p><strong>Photographer:</strong> {photographer_name}</p>
                            <p><strong>Date:</strong> {date}</p>
                        </div>
                        
                        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #7B1FA2;">Cost Breakdown</h4>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Service Cost:</span>
                                <span>PKR {service_cost}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e1bee7;">
                                <span>Travel Cost:</span>
                                <span>PKR {travel_cost}</span>
                            </div>
                            <p style="margin: 5px 0; font-size: 13px; color: #555;"><strong>Travel Details:</strong></p>
                            <p style="margin: 5px 0; font-size: 12px; color: #555;">{travel_breakdown_text}</p>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #1565c0;">
                                <strong>💡 Next Step:</strong> After your session is complete, confirm work completion to release payment to the photographer.
                            </p>
                        </div>
                        
                        <a href="{dashboard_url}" style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Booking</a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Full Payment Received!
                
                Hi {client_name},
                
                Your full payment has been received and securely held in escrow. Your booking is confirmed!
                
                Amount Paid (Held in Escrow): PKR {advance_amount}
                
                Booking Details:
                - Booking ID: #{booking_id}
                - Service: {service_type}
                - Photographer: {photographer_name}
                - Date: {date}
                
                Cost Breakdown:
                - Service Cost: PKR {service_cost}
                - Travel Cost: PKR {travel_cost}
                - Travel Details: {travel_breakdown_text}
                
                Next Step: After your session is complete, confirm work completion to release payment to the photographer.
                
                View your booking at: {dashboard_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.REMAINING_PAYMENT_DUE: {
            "subject": "Action Required: Pay Remaining 50% - Booking #{booking_id}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Work Complete - Payment Due! ⏰</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Great news! {photographer_name} has marked your {service_type} session as complete.</p>
                        
                        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666;">Remaining Amount Due</p>
                            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #e65100;">PKR {remaining_amount}</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Booking ID:</strong> #{booking_id}</p>
                            <p><strong>Service:</strong> {service_type}</p>
                            <p><strong>Session Date:</strong> {date}</p>
                            <p><strong>Advance Paid:</strong> PKR {advance_paid}</p>
                        </div>
                        
                        <p>Please complete your payment so the photographer can receive their earnings.</p>
                        
                        <a href="{payment_url}" style="display: inline-block; background: #FF9800; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-size: 16px;">
                            💳 Pay PKR {remaining_amount} Now
                        </a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Work Complete - Payment Due!
                
                Hi {client_name},
                
                Great news! {photographer_name} has marked your {service_type} session as complete.
                
                Remaining Amount Due: PKR {remaining_amount}
                
                Booking Details:
                - Booking ID: #{booking_id}
                - Service: {service_type}
                - Session Date: {date}
                - Advance Paid: PKR {advance_paid}
                
                Please complete your payment at: {payment_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.REMAINING_PAYMENT_RECEIVED: {
            "subject": "Final Payment Received - Booking Complete! 🎉",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Booking Complete! 🎉</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Thank you! Your final payment has been received and your booking is now complete.</p>
                        
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2e7d32;">Payment Summary</h3>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Advance Payment:</span>
                                <span>PKR {advance_paid}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Final Payment:</span>
                                <span>PKR {remaining_amount}</span>
                            </div>
                            <hr style="margin: 15px 0; border-color: #c8e6c9;">
                            <div style="display: flex; justify-content: space-between; font-size: 18px;">
                                <strong>Total Paid:</strong>
                                <strong style="color: #2e7d32;">PKR {total_amount}</strong>
                            </div>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                            <p style="margin: 0; color: #1565c0;">
                                <strong>📷 {photographer_name}</strong> will now receive their payment (after platform fee). Thank you for using BookYourShoot!
                            </p>
                        </div>
                        
                        <p style="margin-top: 20px;">Don't forget to leave a review for your photographer!</p>
                        
                        <a href="{review_url}" style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">⭐ Leave a Review</a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Booking Complete! 🎉
                
                Hi {client_name},
                
                Thank you! Your final payment has been received.
                
                Payment Summary:
                - Advance Payment: PKR {advance_paid}
                - Final Payment: PKR {remaining_amount}
                - Total Paid: PKR {total_amount}
                
                {photographer_name} will now receive their payment.
                
                Leave a review at: {review_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.WORK_COMPLETED: {
            "subject": "Session Complete! Photos Ready - Booking #{booking_id}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Your Photos Are Ready! 📸</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {client_name},</p>
                        <p>Exciting news! {photographer_name} has completed your {service_type} session and your photos are ready.</p>
                        
                        <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #7B1FA2;">Session Summary</h3>
                            <p><strong>Service:</strong> {service_type}</p>
                            <p><strong>Date:</strong> {date}</p>
                            <p><strong>Photos Delivered:</strong> {photos_count}</p>
                        </div>
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #e65100;">
                                <strong>⚠️ Action Required:</strong> Please pay the remaining 50% (PKR {remaining_amount}) to access your photos and complete the booking.
                            </p>
                        </div>
                        
                        <a href="{payment_url}" style="display: inline-block; background: #9C27B0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-size: 16px;">
                            💳 Complete Payment & View Photos
                        </a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Your Photos Are Ready! 📸
                
                Hi {client_name},
                
                {photographer_name} has completed your {service_type} session!
                
                Session Summary:
                - Service: {service_type}
                - Date: {date}
                - Photos Delivered: {photos_count}
                
                Please pay the remaining 50% (PKR {remaining_amount}) to access your photos.
                
                Complete payment at: {payment_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.PHOTOGRAPHER_NEW_BOOKING: {
            "subject": "New Booking Alert! 🎉 - {service_type} on {date}",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1A73E8 0%, #1557B0 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">New Booking! 🎉</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {photographer_name},</p>
                        <p>Great news! You have a new booking.</p>
                        
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666;">Client Paid Full Amount</p>
                            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #2e7d32;">PKR {advance_amount}</p>
                            <p style="margin: 0; font-size: 14px; color: #666;">Secured in Escrow</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1A73E8;">Booking Details</h3>
                            <p><strong>Client:</strong> {client_name}</p>
                            <p><strong>Service:</strong> {service_type}</p>
                            <p><strong>Date:</strong> {date}</p>
                            <p><strong>Time:</strong> {time}</p>
                            <p><strong>Event City:</strong> {event_city}</p>
                            <p><strong>Location:</strong> {location}</p>
                        </div>
                        
                        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #e65100;">Travel Information ✈️</h3>
                            <p style="margin: 5px 0;"><strong>Travel Mode:</strong> {travel_mode_display}</p>
                            <p style="margin: 5px 0;"><strong>Distance:</strong> {travel_distance_km} km</p>
                            <p style="margin: 5px 0;"><strong>Travel Allowance:</strong> PKR {travel_cost}</p>
                            <p style="margin: 10px 0 5px 0; font-size: 13px; color: #555;"><strong>Breakdown:</strong></p>
                            <p style="margin: 5px 0; font-size: 12px; color: #555;">{travel_breakdown_text}</p>
                            {accommodation_warning}
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                            <p style="margin: 0 0 8px 0; color: #1565c0;">
                                <strong>💵 Payment Status:</strong> Client paid full amount upfront - securely held in escrow.
                            </p>
                            <p style="margin: 0; color: #1565c0;">
                                <strong>💰 Your Earnings:</strong> You'll receive PKR {your_earnings} (after 10% platform fee) once work is completed.
                            </p>
                        </div>
                        
                        <a href="{dashboard_url}" style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Booking Details</a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                New Booking! 🎉
                
                Hi {photographer_name},
                
                Great news! You have a new booking.
                
                Client Paid Full Amount: PKR {advance_amount} (Secured in Escrow)
                
                Booking Details:
                - Client: {client_name}
                - Service: {service_type}
                - Date: {date}
                - Time: {time}
                - Event City: {event_city}
                - Location: {location}
                
                Travel Information:
                - Travel Mode: {travel_mode_display}
                - Distance: {travel_distance_km} km
                - Travel Allowance: PKR {travel_cost}
                - Breakdown: {travel_breakdown_text}
                {accommodation_warning_text}
                
                Your Earnings: PKR {your_earnings} (after 10% platform fee) once work is completed.
                
                View booking at: {dashboard_url}
                
                BookYourShoot - Shoot Smart
            """
        },
        
        EmailTemplate.PAYOUT_PROCESSED: {
            "subject": "Payout Processed! 💸 PKR {amount} sent to your account",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Payout Processed! 💸</h1>
                    </div>
                    <div style="padding: 30px; background: #fff;">
                        <p>Hi {photographer_name},</p>
                        <p>Your payout request has been processed successfully!</p>
                        
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666;">Amount Sent</p>
                            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #2e7d32;">PKR {amount}</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Payout ID:</strong> {payout_id}</p>
                            <p><strong>Bank:</strong> {bank_name}</p>
                            <p><strong>Account:</strong> ****{account_last4}</p>
                            <p><strong>Processed On:</strong> {processed_date}</p>
                        </div>
                        
                        <p style="color: #666;">The funds should arrive in your account within 2-3 business days.</p>
                        
                        <a href="{earnings_url}" style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Earnings Dashboard</a>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666;">
                        <p style="margin: 0;">BookYourShoot - Shoot Smart</p>
                    </div>
                </div>
            """,
            "text": """
                Payout Processed! 💸
                
                Hi {photographer_name},
                
                Your payout request has been processed!
                
                Amount Sent: PKR {amount}
                
                Details:
                - Payout ID: {payout_id}
                - Bank: {bank_name}
                - Account: ****{account_last4}
                - Processed On: {processed_date}
                
                Funds should arrive within 2-3 business days.
                
                View earnings at: {earnings_url}
                
                BookYourShoot - Shoot Smart
            """
        }
    }

    def __init__(self):
        self._sent_emails: List[Email] = []
        self._use_real_email = USE_REAL_EMAIL and GMAIL_ADDRESS and GMAIL_APP_PASSWORD
        
        if self._use_real_email:
            print(f"📧 Email service initialized (REAL MODE - using {GMAIL_ADDRESS})")
        else:
            print("📧 Email service initialized (MOCK MODE - console only)")
            if USE_REAL_EMAIL and not GMAIL_APP_PASSWORD:
                print("   ⚠️  USE_REAL_EMAIL is True but GMAIL_APP_PASSWORD not set in config.py")

    def _send_real_email(self, email: 'Email') -> bool:
        """Send email via Gmail SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = email.subject
            msg['From'] = f"{EMAIL_FROM_NAME} <{GMAIL_ADDRESS}>"
            msg['To'] = f"{email.to_name} <{email.to_email}>"
            
            # Attach both plain text and HTML versions
            part1 = MIMEText(email.body_text, 'plain')
            part2 = MIMEText(email.body_html, 'html')
            msg.attach(part1)
            msg.attach(part2)
            
            # Connect and send
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                if SMTP_USE_TLS:
                    server.starttls()
                server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
                server.send_message(msg)
            
            print(f"   ✅ Email sent successfully to {email.to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError:
            print(f"   ❌ SMTP Auth Error: Check your Gmail address and App Password")
            return False
        except Exception as e:
            print(f"   ❌ Failed to send email: {str(e)}")
            return False

    def _render_template(self, template: EmailTemplate, data: Dict) -> tuple:
        """Render email template with data"""
        template_data = self.TEMPLATES.get(template)
        if not template_data:
            raise ValueError(f"Unknown template: {template}")
        
        subject = template_data["subject"].format(**data)
        html = template_data["html"].format(**data)
        text = template_data["text"].format(**data)
        
        return subject, html, text

    def send_email(
        self,
        to_email: str,
        to_name: str,
        template: EmailTemplate,
        data: Dict
    ) -> Email:
        """Send an email using a template"""
        subject, html, text = self._render_template(template, data)
        
        email = Email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            body_html=html,
            body_text=text,
            template=template,
            data=data
        )
        
        # Try to send real email if configured
        if self._use_real_email:
            success = self._send_real_email(email)
            email.status = "sent" if success else "failed"
        
        self._sent_emails.append(email)
        self._log_email(email)
        
        return email

    def send_custom_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        body_html: str,
        body_text: str
    ) -> Email:
        """Send a custom email without template"""
        email = Email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            body_html=body_html,
            body_text=body_text
        )
        
        # Try to send real email if configured
        if self._use_real_email:
            success = self._send_real_email(email)
            email.status = "sent" if success else "failed"
        
        self._sent_emails.append(email)
        self._log_email(email)
        
        return email

    def _log_email(self, email: Email):
        """Log email to console for demo"""
        mode = "REAL" if self._use_real_email else "MOCK"
        print(f"\n📧 EMAIL [{mode}]")
        print(f"   To: {email.to_name} <{email.to_email}>")
        print(f"   Subject: {email.subject}")
        print(f"   Template: {email.template.value if email.template else 'custom'}")
        print(f"   Status: {email.status}")
        print(f"   Sent at: {email.sent_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 50)

    def get_sent_emails(self, to_email: str = None) -> List[Dict]:
        """Get all sent emails, optionally filtered by recipient"""
        emails = self._sent_emails
        if to_email:
            emails = [e for e in emails if e.to_email == to_email]
        return [e.to_dict() for e in emails]

    # Convenience methods for common emails
    def send_booking_confirmation(
        self,
        client_email: str,
        client_name: str,
        photographer_name: str,
        service_type: str,
        date: str,
        time: str,
        location: str,
        event_city: str,
        service_price: float,
        travel_cost: float,
        travel_mode_used: str = "auto",
        travel_breakdown_json: list = None,
        is_multi_day: bool = False,
        amount: float = None,
        advance_paid: float = None,
        dashboard_url: str = "http://localhost:3000/client/bookings"
    ) -> Email:
        """Send booking confirmation email to client"""
        # If amount not specified, calculate from service_price + travel_cost
        if amount is None:
            amount = service_price + travel_cost
        # If advance_paid not specified, assume full amount was paid
        if advance_paid is None:
            advance_paid = amount
        remaining = amount - advance_paid
        
        # Format travel mode for display
        travel_mode_display = "🚌 Public Transport (Bus/Coach)" if travel_mode_used == "public_transport" else "🚗 Personal Vehicle"
        
        # Format travel breakdown text
        travel_breakdown_text = ""
        if travel_breakdown_json:
            items = []
            for item in travel_breakdown_json:
                items.append(f"{item.get('label', 'Travel')}: PKR {item.get('amount', 0):,.0f}")
            travel_breakdown_text = ", ".join(items)
        
        # Accommodation note if multi-day
        accommodation_note = ""
        if is_multi_day:
            accommodation_note = '<p style="margin: 5px 0; color: #e65100;"><strong>⚠️ Note:</strong> Accommodation included for multi-day event.</p>'
        accommodation_note_text = "\n- Note: Accommodation included for multi-day event." if is_multi_day else ""
        
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=EmailTemplate.BOOKING_CONFIRMATION,
            data={
                "client_name": client_name,
                "photographer_name": photographer_name,
                "service_type": service_type,
                "date": date,
                "time": time,
                "event_city": event_city,
                "location": location,
                "service_price": f"{service_price:,.0f}",
                "travel_cost": f"{travel_cost:,.0f}",
                "travel_mode_display": travel_mode_display,
                "travel_breakdown_text": travel_breakdown_text,
                "accommodation_note": accommodation_note,
                "accommodation_note_text": accommodation_note_text,
                "amount": f"{amount:,.0f}",
                "advance_paid": f"{advance_paid:,.0f}",
                "remaining_amount": f"{remaining:,.0f}",
                "dashboard_url": dashboard_url
            }
        )

    def send_payment_receipt(
        self,
        client_email: str,
        client_name: str,
        transaction_id: str,
        photographer_name: str,
        service_type: str,
        service_cost: float,
        travel_cost: float,
        subtotal: float = None,
        platform_fee: float = None,
        total: float = None,
        travel_breakdown_json: list = None
    ) -> Email:
        """Send payment receipt email"""
        # If subtotal not specified, calculate from service_cost + travel_cost
        if subtotal is None:
            subtotal = service_cost + travel_cost
        # If platform_fee not specified, calculate 10%
        if platform_fee is None:
            platform_fee = subtotal * 0.1
        # If total not specified, calculate
        if total is None:
            total = subtotal + platform_fee
        
        # Format travel breakdown section for HTML
        travel_breakdown_section = ""
        if travel_breakdown_json:
            travel_breakdown_section = '<div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><h4 style="margin: 0 0 10px 0; color: #7B1FA2;">Travel Cost Breakdown</h4>'
            for item in travel_breakdown_json:
                label = item.get('label', 'Travel')
                amount = item.get('amount', 0)
                travel_breakdown_section += f'<div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>{label}:</span><span>PKR {amount:,.0f}</span></div>'
            travel_breakdown_section += '</div>'
        
        # Format travel breakdown text for plain text
        travel_breakdown_text = ""
        if travel_breakdown_json:
            items = []
            for item in travel_breakdown_json:
                label = item.get('label', 'Travel')
                amount = item.get('amount', 0)
                items.append(f"  - {label}: PKR {amount:,.0f}")
            travel_breakdown_text = "\nTravel Cost Breakdown:\n" + "\n".join(items)
        
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=EmailTemplate.PAYMENT_RECEIPT,
            data={
                "client_name": client_name,
                "transaction_id": transaction_id,
                "photographer_name": photographer_name,
                "service_type": service_type,
                "date": datetime.now().strftime("%B %d, %Y"),
                "service_cost": f"{service_cost:,.0f}",
                "travel_cost": f"{travel_cost:,.0f}",
                "subtotal": f"{subtotal:,.0f}",
                "platform_fee": f"{platform_fee:,.0f}",
                "total": f"{total:,.0f}",
                "travel_breakdown_section": travel_breakdown_section,
                "travel_breakdown_text": travel_breakdown_text
            }
        )

    def send_payment_released(
        self,
        recipient_email: str,
        recipient_name: str,
        amount: float,
        service_type: str,
        transaction_id: str
    ) -> Email:
        """Send payment released notification"""
        return self.send_email(
            to_email=recipient_email,
            to_name=recipient_name,
            template=EmailTemplate.PAYMENT_RELEASED,
            data={
                "recipient_name": recipient_name,
                "amount": f"{amount:,.0f}",
                "service_type": service_type,
                "transaction_id": transaction_id
            }
        )

    def send_booking_reminder(
        self,
        recipient_email: str,
        recipient_name: str,
        service_type: str,
        date: str,
        time: str,
        location: str
    ) -> Email:
        """Send booking reminder email"""
        return self.send_email(
            to_email=recipient_email,
            to_name=recipient_name,
            template=EmailTemplate.BOOKING_REMINDER,
            data={
                "recipient_name": recipient_name,
                "service_type": service_type,
                "date": date,
                "time": time,
                "location": location
            }
        )

    def send_equipment_rental_confirmation(
        self,
        client_email: str,
        client_name: str,
        equipment_name: str,
        equipment_category: str,
        rental_period: str,
        start_date: str,
        owner_name: str,
        owner_phone: str,
        rental_cost: float,
        deposit: float,
        total_amount: float,
        dashboard_url: str = "http://localhost:3000/client/bookings"
    ) -> Email:
        """Send equipment rental confirmation email to client"""
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=EmailTemplate.EQUIPMENT_RENTAL_CONFIRMATION,
            data={
                "client_name": client_name,
                "equipment_name": equipment_name,
                "equipment_category": equipment_category,
                "rental_period": rental_period,
                "start_date": start_date,
                "owner_name": owner_name,
                "owner_phone": owner_phone,
                "rental_cost": f"{rental_cost:,.0f}",
                "deposit": f"{deposit:,.0f}",
                "total_amount": f"{total_amount:,.0f}",
                "dashboard_url": dashboard_url
            }
        )

    # ============================================
    # 50/50 Payment Flow Email Methods
    # ============================================

    def send_advance_payment_received(
        self,
        client_email: str,
        client_name: str,
        booking_id: str,
        service_type: str,
        photographer_name: str,
        date: str,
        advance_amount: float,
        remaining_amount: float = None,
        service_cost: float = None,
        travel_cost: float = 0,
        travel_breakdown_json: list = None,
        dashboard_url: str = "http://localhost:3000/client/bookings",
        is_equipment_rental: bool = False
    ) -> Email:
        """Send email when full payment is received or equipment rental payment"""
        template = EmailTemplate.EQUIPMENT_RENTAL_CONFIRMATION if is_equipment_rental else EmailTemplate.ADVANCE_PAYMENT_RECEIVED
        
        # Format travel breakdown text
        travel_breakdown_text = ""
        if travel_breakdown_json and not is_equipment_rental:
            items = []
            for item in travel_breakdown_json:
                items.append(f"{item.get('label', 'Travel')}: PKR {item.get('amount', 0):,.0f}")
            travel_breakdown_text = ", ".join(items)
        else:
            travel_breakdown_text = f"Travel Allowance: PKR {travel_cost:,.0f}" if travel_cost > 0 and not is_equipment_rental else ""
        
        # If service_cost not specified, calculate
        if service_cost is None:
            service_cost = advance_amount - travel_cost
        
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=template,
            data={
                "client_name": client_name,
                "booking_id": booking_id,
                "service_type": service_type,
                "photographer_name": photographer_name if not is_equipment_rental else f"Equipment Owner: {photographer_name}",
                "date": date,
                "advance_amount": f"{advance_amount:,.0f}",
                "remaining_amount": f"{remaining_amount:,.0f}" if remaining_amount and not is_equipment_rental else "0",
                "service_cost": f"{service_cost:,.0f}",
                "travel_cost": f"{travel_cost:,.0f}",
                "travel_breakdown_text": travel_breakdown_text,
                "dashboard_url": dashboard_url,
                "is_equipment_rental": is_equipment_rental
            }
        )

    def send_photographer_new_booking(
        self,
        photographer_email: str,
        photographer_name: str,
        client_name: str,
        service_type: str,
        date: str,
        time: str,
        location: str,
        event_city: str,
        total_amount: float,
        advance_amount: float,
        your_earnings: float,
        travel_cost: float = 0,
        travel_mode_used: str = "auto",
        travel_distance_km: float = 0,
        travel_breakdown_json: list = None,
        is_multi_day: bool = False,
        dashboard_url: str = "http://localhost:3000/photographer/bookings"
    ) -> Email:
        """Send email to photographer when new booking is made"""
        # Format travel mode for display
        travel_mode_display = "🚌 Public Transport (Bus/Coach)" if travel_mode_used == "public_transport" else "🚗 Personal Vehicle"
        
        # Format travel breakdown text
        travel_breakdown_text = ""
        if travel_breakdown_json:
            items = []
            for item in travel_breakdown_json:
                items.append(f"{item.get('label', 'Travel')}: PKR {item.get('amount', 0):,.0f}")
            travel_breakdown_text = ", ".join(items)
        else:
            travel_breakdown_text = f"Travel Allowance: PKR {travel_cost:,.0f}"
        
        # Accommodation warning if multi-day
        accommodation_warning = ""
        accommodation_warning_text = ""
        if is_multi_day:
            accommodation_warning = '<p style="margin: 5px 0; color: #e65100;"><strong>⚠️ Accommodation:</strong> Included for multi-day event. Make arrangements if needed.</p>'
            accommodation_warning_text = "\n- Note: Accommodation included for multi-day event."
        
        return self.send_email(
            to_email=photographer_email,
            to_name=photographer_name,
            template=EmailTemplate.PHOTOGRAPHER_NEW_BOOKING,
            data={
                "photographer_name": photographer_name,
                "client_name": client_name,
                "service_type": service_type,
                "date": date,
                "time": time,
                "event_city": event_city,
                "location": location,
                "total_amount": f"{total_amount:,.0f}",
                "advance_amount": f"{advance_amount:,.0f}",
                "your_earnings": f"{your_earnings:,.0f}",
                "travel_cost": f"{travel_cost:,.0f}",
                "travel_mode_display": travel_mode_display,
                "travel_distance_km": f"{travel_distance_km:.1f}",
                "travel_breakdown_text": travel_breakdown_text,
                "accommodation_warning": accommodation_warning,
                "accommodation_warning_text": accommodation_warning_text,
                "dashboard_url": dashboard_url
            }
        )

    def send_remaining_payment_due(
        self,
        client_email: str,
        client_name: str,
        booking_id: str,
        photographer_name: str,
        service_type: str,
        date: str,
        advance_paid: float,
        remaining_amount: float,
        payment_url: str = None
    ) -> Email:
        """Send email when work is complete and remaining payment is due"""
        if payment_url is None:
            payment_url = f"http://localhost:3000/payment/{booking_id}"
        
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=EmailTemplate.REMAINING_PAYMENT_DUE,
            data={
                "client_name": client_name,
                "booking_id": booking_id,
                "photographer_name": photographer_name,
                "service_type": service_type,
                "date": date,
                "advance_paid": f"{advance_paid:,.0f}",
                "remaining_amount": f"{remaining_amount:,.0f}",
                "payment_url": payment_url
            }
        )

    def send_work_completed(
        self,
        client_email: str,
        client_name: str,
        booking_id: str,
        photographer_name: str,
        service_type: str,
        date: str,
        photos_count: int,
        remaining_amount: float,
        payment_url: str = None
    ) -> Email:
        """Send email when photographer marks work as complete"""
        if payment_url is None:
            payment_url = f"http://localhost:3000/payment/{booking_id}"
        
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=EmailTemplate.WORK_COMPLETED,
            data={
                "client_name": client_name,
                "booking_id": booking_id,
                "photographer_name": photographer_name,
                "service_type": service_type,
                "date": date,
                "photos_count": photos_count,
                "remaining_amount": f"{remaining_amount:,.0f}",
                "payment_url": payment_url
            }
        )

    def send_remaining_payment_received(
        self,
        client_email: str,
        client_name: str,
        photographer_name: str,
        advance_paid: float,
        remaining_amount: float,
        total_amount: float,
        review_url: str = "http://localhost:3000/client/bookings"
    ) -> Email:
        """Send email when final 50% payment is received"""
        return self.send_email(
            to_email=client_email,
            to_name=client_name,
            template=EmailTemplate.REMAINING_PAYMENT_RECEIVED,
            data={
                "client_name": client_name,
                "photographer_name": photographer_name,
                "advance_paid": f"{advance_paid:,.0f}",
                "remaining_amount": f"{remaining_amount:,.0f}",
                "total_amount": f"{total_amount:,.0f}",
                "review_url": review_url
            }
        )

    def send_payout_processed(
        self,
        photographer_email: str,
        photographer_name: str,
        payout_id: str,
        amount: float,
        bank_name: str,
        account_last4: str,
        processed_date: str = None,
        earnings_url: str = "http://localhost:3000/photographer/earnings"
    ) -> Email:
        """Send email when payout is processed"""
        if processed_date is None:
            processed_date = datetime.now().strftime("%B %d, %Y")
        
        return self.send_email(
            to_email=photographer_email,
            to_name=photographer_name,
            template=EmailTemplate.PAYOUT_PROCESSED,
            data={
                "photographer_name": photographer_name,
                "payout_id": payout_id,
                "amount": f"{amount:,.0f}",
                "bank_name": bank_name,
                "account_last4": account_last4,
                "processed_date": processed_date,
                "earnings_url": earnings_url
            }
        )


# Global instance
email_service = EmailService()
