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
                            <p><strong>Location:</strong> {location}</p>
                            <p><strong>Photographer:</strong> {photographer_name}</p>
                        </div>
                        
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0; color: #1A73E8;">
                                <strong>💵 Total Amount:</strong> PKR {amount}
                            </p>
                            <p style="margin: 0; color: #2e7d32;">
                                <strong>💰 Deposit Paid:</strong> PKR {advance_paid} is safely held until work is completed.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                                <em>Remaining balance: PKR {remaining_amount} due on event day</em>
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
                - Location: {location}
                - Photographer: {photographer_name}
                
                Total Amount: PKR {amount}
                Deposit Paid: PKR {advance_paid} (safely held until work is completed)
                Remaining Balance: PKR {remaining_amount} (due on event day)
                
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
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Photographer:</span>
                                <span>{photographer_name}</span>
                            </div>
                            <hr style="margin: 15px 0;">
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
                
                Subtotal: PKR {subtotal}
                Platform Fee (10%): PKR {platform_fee}
                Total Paid: PKR {total}
                
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
        amount: float,
        advance_paid: float = None,
        dashboard_url: str = "http://localhost:3000/client/bookings"
    ) -> Email:
        """Send booking confirmation email to client"""
        # If advance_paid not specified, assume full amount was paid
        if advance_paid is None:
            advance_paid = amount
        remaining = amount - advance_paid
        
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
                "location": location,
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
        subtotal: float,
        platform_fee: float,
        total: float
    ) -> Email:
        """Send payment receipt email"""
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
                "subtotal": f"{subtotal:,.0f}",
                "platform_fee": f"{platform_fee:,.0f}",
                "total": f"{total:,.0f}"
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


# Global instance
email_service = EmailService()
