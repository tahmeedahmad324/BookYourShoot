"""
Receipt Service - Generates payment receipts in HTML and PDF
Uses fpdf2 for PDF generation (pure Python, no external dependencies)
Uses qrcode for QR code generation

Setup: pip install fpdf2 qrcode
"""

from datetime import datetime
from typing import Dict, Optional
import json
import base64
import os
import io

# Try to import fpdf2 for PDF generation
try:
    from fpdf import FPDF
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("⚠️  fpdf2 not installed. Run: pip install fpdf2")

# Try to import qrcode for QR generation
try:
    import qrcode
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False
    print("⚠️  qrcode not installed. Run: pip install qrcode")


def generate_qr_code_base64(data: str) -> str:
    """Generate QR code and return as base64 string"""
    if not QR_AVAILABLE:
        return ""
    
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


class ReceiptPDF(FPDF if PDF_AVAILABLE else object):
    """Custom PDF class for receipts with header/footer"""
    
    def __init__(self):
        if not PDF_AVAILABLE:
            return
        super().__init__()
        self.set_auto_page_break(auto=True, margin=15)
    
    def header(self):
        if not PDF_AVAILABLE:
            return
        # Logo/Brand
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(26, 115, 232)  # Brand blue
        self.cell(0, 10, 'BookYourShoot', ln=True, align='C')
        self.set_font('Helvetica', '', 10)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, 'Payment Receipt', ln=True, align='C')
        self.ln(10)
    
    def footer(self):
        if not PDF_AVAILABLE:
            return
        self.set_y(-25)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, 'This is a computer-generated receipt.', ln=True, align='C')
        self.cell(0, 5, 'BookYourShoot - Shoot Smart', ln=True, align='C')
        self.cell(0, 5, f'Page {self.page_no()}', align='C')


class ReceiptService:
    """
    Receipt generation service
    Generates both HTML and PDF receipts
    """
    
    RECEIPT_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - {transaction_id}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}
        .receipt {{
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #1A73E8 0%, #1557B0 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 24px;
            margin-bottom: 5px;
        }}
        .header p {{
            opacity: 0.9;
            font-size: 14px;
        }}
        .logo {{
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .content {{
            padding: 30px;
        }}
        .status-badge {{
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 20px;
        }}
        .status-held {{
            background: #FFF3E0;
            color: #E65100;
        }}
        .status-released {{
            background: #E8F5E9;
            color: #2E7D32;
        }}
        .status-refunded {{
            background: #E3F2FD;
            color: #1565C0;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        .section-title {{
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }}
        .detail-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }}
        .detail-row:last-child {{
            border-bottom: none;
        }}
        .detail-label {{
            color: #666;
        }}
        .detail-value {{
            font-weight: 500;
        }}
        .amount-section {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .total-row {{
            display: flex;
            justify-content: space-between;
            font-size: 20px;
            font-weight: bold;
            color: #1A73E8;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            margin-top: 10px;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #666;
            font-size: 12px;
        }}
        .qr-placeholder {{
            width: 100px;
            height: 100px;
            background: #eee;
            margin: 0 auto 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            color: #999;
            font-size: 10px;
        }}
        .escrow-info {{
            background: #FFF3E0;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .escrow-icon {{
            font-size: 24px;
        }}
        .escrow-text {{
            flex: 1;
        }}
        .escrow-text strong {{
            display: block;
            color: #E65100;
        }}
        .escrow-text span {{
            font-size: 12px;
            color: #666;
        }}
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .receipt {{
                box-shadow: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="logo">📸 BookYourShoot</div>
            <h1>Payment Receipt</h1>
            <p>Thank you for your payment</p>
        </div>
        
        <div class="content">
            <div style="text-align: center;">
                <span class="status-badge status-{status_class}">{status_text}</span>
            </div>
            
            <div class="section">
                <div class="section-title">Transaction Details</div>
                <div class="detail-row">
                    <span class="detail-label">Transaction ID</span>
                    <span class="detail-value">{transaction_id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">{date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method</span>
                    <span class="detail-value">{payment_method}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Service Details</div>
                <div class="detail-row">
                    <span class="detail-label">Service</span>
                    <span class="detail-value">{service_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Session Date</span>
                    <span class="detail-value">{session_date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Photographer</span>
                    <span class="detail-value">{photographer_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Client</span>
                    <span class="detail-value">{client_name}</span>
                </div>
            </div>
            
            <div class="amount-section">
                <div class="section-title">Payment Breakdown</div>
                <div class="detail-row">
                    <span class="detail-label">Service Fee</span>
                    <span class="detail-value">PKR {subtotal}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Platform Fee (10%)</span>
                    <span class="detail-value">PKR {platform_fee}</span>
                </div>
                <div class="total-row">
                    <span>Total Paid</span>
                    <span>PKR {total}</span>
                </div>
            </div>
            
            {escrow_info}
            
            <div class="qr-placeholder">
                QR Code
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">
                Scan to verify this receipt
            </p>
        </div>
        
        <div class="footer">
            <p><strong>BookYourShoot</strong> - Shoot Smart</p>
            <p style="margin-top: 5px;">For support: support@bookyourshoot.com</p>
            <p style="margin-top: 10px; font-size: 10px;">
                This is a computer-generated receipt. No signature required.
            </p>
        </div>
    </div>
    
    <script>
        // Auto-print when opened (can be disabled)
        // window.onload = () => window.print();
    </script>
</body>
</html>
    """

    ESCROW_INFO_TEMPLATE = """
            <div class="escrow-info">
                <span class="escrow-icon">🔒</span>
                <div class="escrow-text">
                    <strong>Payment Secured in Escrow</strong>
                    <span>Will be released to photographer after work confirmation</span>
                </div>
            </div>
    """

    def __init__(self):
        self._receipts: Dict[str, Dict] = {}
        print("🧾 Receipt service initialized")

    def generate_receipt(
        self,
        transaction_id: str,
        client_name: str,
        client_email: str,
        photographer_name: str,
        service_type: str,
        session_date: str,
        subtotal: float,
        platform_fee: float,
        total: float,
        status: str = "held",  # held, released, refunded
        payment_method: str = "Card",
        booking_id: str = None
    ) -> Dict:
        """Generate a receipt and store it"""
        
        status_map = {
            "held": {"class": "held", "text": "🔒 Payment Secured"},
            "released": {"class": "released", "text": "✓ Payment Released"},
            "refunded": {"class": "refunded", "text": "↩ Refunded"}
        }
        
        status_info = status_map.get(status, status_map["held"])
        
        receipt_data = {
            "transaction_id": transaction_id,
            "booking_id": booking_id or transaction_id,
            "client_name": client_name,
            "client_email": client_email,
            "photographer_name": photographer_name,
            "service_type": service_type,
            "session_date": session_date,
            "subtotal": subtotal,
            "platform_fee": platform_fee,
            "total": total,
            "status": status,
            "payment_method": payment_method,
            "date": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "created_at": datetime.now().isoformat()
        }
        
        # Generate QR code first (before HTML generation)
        # Note: In production, replace localhost with actual domain
        base_url = "http://localhost:5000"  # TODO: Use environment variable for production
        qr_data = f"{base_url}/api/payments/receipts/{transaction_id}/html"
        qr_base64 = generate_qr_code_base64(qr_data) if QR_AVAILABLE else None
        qr_html = ""
        if qr_base64:
            qr_html = f'''<div style="text-align: center;">
                <img src="data:image/png;base64,{qr_base64}" alt="QR Code" style="width: 150px; height: 150px; display: block; margin: 0 auto;" />
                <p style="font-size: 10px; color: #888; margin-top: 5px;">Scan to view receipt online</p>
            </div>'''
            print(f"   📱 QR code generated")
        else:
            qr_html = '<div class="qr-placeholder">QR Code</div>'
        
        # Generate HTML
        html = self.RECEIPT_HTML_TEMPLATE.format(
            transaction_id=transaction_id,
            date=receipt_data["date"],
            payment_method=payment_method,
            service_type=service_type,
            session_date=session_date,
            photographer_name=photographer_name,
            client_name=client_name,
            subtotal=f"{subtotal:,.0f}",
            platform_fee=f"{platform_fee:,.0f}",
            total=f"{total:,.0f}",
            status_class=status_info["class"],
            status_text=status_info["text"],
            escrow_info=self.ESCROW_INFO_TEMPLATE if status == "held" else ""
        )
        
        # Replace QR placeholder with actual QR code
        html = html.replace('<div class="qr-placeholder">\n                QR Code\n            </div>', qr_html)
        
        # Generate PDF if available
        pdf_bytes = None
        pdf_base64 = None
        if PDF_AVAILABLE:
            try:
                pdf_bytes = self._generate_pdf(receipt_data, status_info)
                pdf_base64 = base64.b64encode(pdf_bytes).decode()
                print(f"   📄 PDF generated ({len(pdf_bytes)} bytes)")
            except Exception as e:
                print(f"   ⚠️ PDF generation failed: {e}")
        
        receipt = {
            "data": receipt_data,
            "html": html,
            "html_base64": base64.b64encode(html.encode()).decode(),
            "pdf_available": pdf_bytes is not None,
            "pdf_base64": pdf_base64,
            "qr_available": qr_base64 is not None,
            "qr_base64": qr_base64,
            "qr_url": qr_data
        }
        
        # Store receipt under BOTH transaction_id AND booking_id for easy lookup
        self._receipts[transaction_id] = receipt
        if booking_id and booking_id != transaction_id:
            self._receipts[booking_id] = receipt
            print(f"🧾 Generated receipt for transaction {transaction_id} (also stored as {booking_id})")
        else:
            print(f"🧾 Generated receipt for transaction {transaction_id}")
        
        return receipt

    def _generate_pdf(self, data: Dict, status_info: Dict) -> bytes:
        """Generate PDF receipt using fpdf2"""
        pdf = ReceiptPDF()
        pdf.add_page()
        
        # Transaction info box
        pdf.set_fill_color(248, 249, 250)
        pdf.set_draw_color(200, 200, 200)
        pdf.rect(10, 40, 190, 25, 'DF')
        
        pdf.set_xy(15, 43)
        pdf.set_font('Helvetica', 'B', 11)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(90, 6, f"Transaction: {data['transaction_id']}", ln=0)
        
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(90, 6, f"Date: {data['date']}", ln=1, align='R')
        
        pdf.set_x(15)
        pdf.cell(90, 6, f"Payment Method: {data['payment_method']}", ln=0)
        
        # Status badge
        status_colors = {
            "held": (255, 193, 7),      # Yellow/Orange
            "released": (40, 167, 69),   # Green
            "refunded": (220, 53, 69)    # Red
        }
        color = status_colors.get(data['status'], (100, 100, 100))
        pdf.set_text_color(*color)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(90, 6, status_info['text'].replace('🔒 ', '').replace('✓ ', '').replace('↩ ', ''), ln=1, align='R')
        
        pdf.ln(15)
        
        # Service Details
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, 'Service Details', ln=True)
        pdf.set_draw_color(26, 115, 232)
        pdf.line(10, pdf.get_y(), 70, pdf.get_y())
        pdf.ln(5)
        
        pdf.set_font('Helvetica', '', 10)
        details = [
            ('Service', data['service_type']),
            ('Session Date', data['session_date']),
            ('Photographer', data['photographer_name']),
            ('Client', data['client_name']),
        ]
        
        for label, value in details:
            pdf.set_text_color(100, 100, 100)
            pdf.cell(50, 7, label + ':', ln=0)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 7, str(value), ln=True)
        
        pdf.ln(10)
        
        # Payment Summary
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, 'Payment Summary', ln=True)
        pdf.set_draw_color(26, 115, 232)
        pdf.line(10, pdf.get_y(), 70, pdf.get_y())
        pdf.ln(5)
        
        # Payment rows
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(140, 7, 'Subtotal:', ln=0)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 7, f"PKR {data['subtotal']:,.0f}", ln=True, align='R')
        
        pdf.set_text_color(100, 100, 100)
        pdf.cell(140, 7, 'Platform Fee (10%):', ln=0)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 7, f"PKR {data['platform_fee']:,.0f}", ln=True, align='R')
        
        # Divider
        pdf.set_draw_color(200, 200, 200)
        pdf.line(100, pdf.get_y() + 2, 200, pdf.get_y() + 2)
        pdf.ln(5)
        
        # Total
        pdf.set_font('Helvetica', 'B', 14)
        pdf.set_text_color(26, 115, 232)
        pdf.cell(140, 10, 'Total Paid:', ln=0)
        pdf.cell(0, 10, f"PKR {data['total']:,.0f}", ln=True, align='R')
        
        pdf.ln(10)
        
        # Escrow info box (if held)
        if data['status'] == 'held':
            pdf.set_fill_color(255, 243, 224)
            pdf.set_draw_color(255, 152, 0)
            pdf.rect(10, pdf.get_y(), 190, 20, 'DF')
            
            pdf.set_xy(15, pdf.get_y() + 5)
            pdf.set_font('Helvetica', 'B', 9)
            pdf.set_text_color(230, 81, 0)
            pdf.cell(0, 5, 'Payment Secured in Escrow', ln=True)
            pdf.set_x(15)
            pdf.set_font('Helvetica', '', 8)
            pdf.cell(0, 5, 'Funds will be released to the photographer after you confirm work completion.', ln=True)
        
        # Output to bytes
        return bytes(pdf.output())

    def get_receipt(self, transaction_id: str) -> Optional[Dict]:
        """Get a stored receipt"""
        return self._receipts.get(transaction_id)

    def get_receipt_html(self, transaction_id: str) -> Optional[str]:
        """Get receipt HTML for rendering"""
        receipt = self._receipts.get(transaction_id)
        return receipt["html"] if receipt else None

    def get_receipt_data(self, transaction_id: str) -> Optional[Dict]:
        """Get receipt data for JSON response"""
        receipt = self._receipts.get(transaction_id)
        return receipt["data"] if receipt else None

    def get_all_receipts(self, client_email: str = None) -> list:
        """Get all receipts, optionally filtered by client"""
        receipts = list(self._receipts.values())
        if client_email:
            receipts = [r for r in receipts if r["data"]["client_email"] == client_email]
        return [r["data"] for r in receipts]


# Global instance
receipt_service = ReceiptService()
