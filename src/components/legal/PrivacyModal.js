import React from 'react';
import { Modal } from 'react-bootstrap';
import '../../styles/legal-modals.css';

const PrivacyModal = ({ show, onHide }) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Privacy Policy</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh' }}>
        <div className="card-body p-2">
          <h5 className="fw-bold mb-3">1. Introduction</h5>
          <p className="text-muted mb-4">
            BookYourShoot ("we," "us," or "our") is a web-based platform connecting clients with professional 
            photographers across Pakistan. This Privacy Policy explains how we collect, use, store, and protect 
            your personal information when you use our services. By using BookYourShoot, you agree to the 
            collection and use of information in accordance with this policy.
          </p>

          <h5 className="fw-bold mb-3">2. Information We Collect</h5>
          <p className="text-muted mb-3 fw-semibold">
            We collect different types of information depending on your role (Client, Photographer, or Admin):
          </p>
          
          <p className="text-muted mb-2"><strong>Personal Information:</strong></p>
          <ul className="text-muted mb-3">
            <li>Name, email address, phone number</li>
            <li>Profile photo and bio (optional)</li>
            <li>City and location preferences</li>
            <li>Event details (type, date, location) for clients</li>
          </ul>

          <p className="text-muted mb-2"><strong>Identity Verification (Photographers Only):</strong></p>
          <ul className="text-muted mb-3">
            <li>CNIC (Computerized National Identity Card) details</li>
            <li>CNIC images for OCR-based verification</li>
            <li>Verification status and admin approval records</li>
          </ul>

          <p className="text-muted mb-2"><strong>Portfolio and Media:</strong></p>
          <ul className="text-muted mb-3">
            <li>Portfolio images uploaded by photographers</li>
            <li>Event photos uploaded for album building and reel generation</li>
            <li>Face recognition data for Smart Album search features (processed locally)</li>
          </ul>

          <p className="text-muted mb-2"><strong>Booking and Transaction Data:</strong></p>
          <ul className="text-muted mb-3">
            <li>Booking requests, confirmations, and cancellations</li>
            <li>Payment information and transaction records</li>
            <li>Equipment rental requests and agreements</li>
          </ul>

          <p className="text-muted mb-2"><strong>Communication Data:</strong></p>
          <ul className="text-muted mb-3">
            <li>Chat messages between clients and photographers</li>
            <li>Voice call metadata (duration, participants)</li>
            <li>AI chatbot conversation logs</li>
          </ul>

          <p className="text-muted mb-2"><strong>Usage Data:</strong></p>
          <ul className="text-muted mb-4">
            <li>IP address, browser type, and device information</li>
            <li>Pages visited, features used, and time spent</li>
            <li>Search filters and preferences</li>
            <li>Login and access logs</li>
          </ul>

          <h5 className="fw-bold mb-3">3. How We Collect Information</h5>
          <ul className="text-muted mb-4">
            <li><strong>Direct Registration:</strong> Information you provide during account creation</li>
            <li><strong>OTP Verification:</strong> Phone and email verification during authentication</li>
            <li><strong>Profile Updates:</strong> Information added or modified in your profile</li>
            <li><strong>Platform Usage:</strong> Data generated through booking, communication, and feature use</li>
            <li><strong>AI Processing:</strong> Data from Smart Album, Reel Generator, and Chatbot interactions</li>
          </ul>

          <h5 className="fw-bold mb-3">4. How We Use Your Information</h5>
          <p className="text-muted mb-3">BookYourShoot uses collected information for the following purposes:</p>
          
          <p className="text-muted mb-2"><strong>Service Provision:</strong></p>
          <ul className="text-muted mb-3">
            <li>Enable user registration, authentication, and account management</li>
            <li>Facilitate booking requests and confirmations between clients and photographers</li>
            <li>Process payments and maintain transaction transparency</li>
            <li>Provide real-time chat and voice communication</li>
            <li>Generate smart albums, reels, and music suggestions</li>
          </ul>

          <p className="text-muted mb-2"><strong>Trust and Safety:</strong></p>
          <ul className="text-muted mb-3">
            <li>Verify photographer identities through CNIC validation</li>
            <li>Admin approval and monitoring of photographer accounts</li>
            <li>Detect and prevent fraudulent or suspicious activities</li>
            <li>Resolve disputes and complaints between users</li>
          </ul>

          <p className="text-muted mb-2"><strong>Platform Improvement:</strong></p>
          <ul className="text-muted mb-3">
            <li>Analyze usage patterns to improve features and user experience</li>
            <li>Optimize search and recommendation algorithms</li>
            <li>Monitor system performance and technical issues</li>
          </ul>

          <p className="text-muted mb-2"><strong>Communication:</strong></p>
          <ul className="text-muted mb-4">
            <li>Send booking confirmations, payment receipts, and status updates</li>
            <li>Notify users of messages, reviews, and platform updates</li>
            <li>Provide customer support and respond to inquiries</li>
          </ul>

          <h5 className="fw-bold mb-3">5. CNIC Data Protection</h5>
          <p className="text-muted mb-4">
            CNIC information is collected exclusively for photographer identity verification to ensure platform 
            trust and safety. We implement the following protections:
          </p>
          <ul className="text-muted mb-4">
            <li><strong>Encryption:</strong> All CNIC data is encrypted in transit and at rest</li>
            <li><strong>Limited Access:</strong> Only authorized admins can access CNIC for verification purposes</li>
            <li><strong>Secure Storage:</strong> CNIC images and extracted data are stored in secure databases</li>
            <li><strong>Compliance:</strong> We comply with Pakistan's data protection regulations</li>
            <li><strong>No Sharing:</strong> CNIC information is never shared with third parties</li>
            <li><strong>Deletion Rights:</strong> Users can request CNIC data deletion upon account closure</li>
          </ul>

          <h5 className="fw-bold mb-3">6. Face Recognition and AI Processing</h5>
          <p className="text-muted mb-4">
            Our Smart Album Builder uses face recognition technology to help organize and search event photos:
          </p>
          <ul className="text-muted mb-4">
            <li>Face detection is performed locally on uploaded photos (up to 300 per session)</li>
            <li>Face data is used only for photo categorization and search within your albums</li>
            <li>Face recognition data is not used to identify individuals across different users' albums</li>
            <li>You can delete albums and associated face data at any time</li>
            <li>AI-generated content (captions, reels) is created using external APIs with data minimization</li>
          </ul>

          <h5 className="fw-bold mb-3">7. Data Sharing and Disclosure</h5>
          <p className="text-muted mb-3 fw-semibold">We do not sell your personal information. We may share data in limited circumstances:</p>
          
          <p className="text-muted mb-2"><strong>Within Platform:</strong></p>
          <ul className="text-muted mb-3">
            <li>Public profiles display photographer portfolios, ratings, and reviews</li>
            <li>Booking details shared between clients and photographers</li>
            <li>Chat logs accessible to both parties and admins (for dispute resolution)</li>
          </ul>

          <p className="text-muted mb-2"><strong>Service Providers:</strong></p>
          <ul className="text-muted mb-3">
            <li>Payment gateway providers for transaction processing</li>
            <li>Cloud hosting services (e.g., Render) for data storage</li>
            <li>AI API providers (e.g., Gemini) for chatbot and content generation</li>
            <li>Google Maps API (if enabled) for travel cost estimation</li>
          </ul>

          <p className="text-muted mb-2"><strong>Legal Requirements:</strong></p>
          <ul className="text-muted mb-4">
            <li>Comply with legal obligations, court orders, or government requests</li>
            <li>Protect rights, safety, and security of BookYourShoot and users</li>
            <li>Prevent fraud, illegal activities, or policy violations</li>
          </ul>

          <h5 className="fw-bold mb-3">8. Data Retention</h5>
          <p className="text-muted mb-4">We retain your information for as long as necessary to provide services and comply with legal obligations:</p>
          <ul className="text-muted mb-4">
            <li><strong>Active Accounts:</strong> Data retained while account is active</li>
            <li><strong>Booking Records:</strong> Maintained for at least 1 year for dispute resolution and records</li>
            <li><strong>Payment Data:</strong> Retained according to financial regulations (typically 5-7 years)</li>
            <li><strong>Chat Logs:</strong> Stored for dispute resolution; may be deleted after case closure</li>
            <li><strong>Deleted Accounts:</strong> Personal data removed within 30 days, except where legal retention required</li>
          </ul>

          <h5 className="fw-bold mb-3">9. Data Security</h5>
          <p className="text-muted mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="text-muted mb-4">
            <li>Encryption of sensitive data (passwords, CNIC, payment info) using strong algorithms</li>
            <li>OTP verification for all user accounts</li>
            <li>Secure HTTPS connections for all data transmission</li>
            <li>Regular security audits and monitoring for suspicious activity</li>
            <li>Access controls limiting staff access to personal data</li>
            <li>Cloud infrastructure with automated backups and disaster recovery</li>
          </ul>
          <p className="text-muted mb-4">
            However, no method of internet transmission or electronic storage is 100% secure. While we strive 
            to protect your data, we cannot guarantee absolute security.
          </p>

          <h5 className="fw-bold mb-3">10. Your Privacy Rights</h5>
          <p className="text-muted mb-3 fw-semibold">You have the following rights regarding your personal data:</p>
          <ul className="text-muted mb-4">
            <li><strong>Access:</strong> Request a copy of your personal information stored in our system</li>
            <li><strong>Correction:</strong> Update or correct inaccurate profile information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Download your data in a structured format (where feasible)</li>
            <li><strong>Object:</strong> Object to certain data processing activities</li>
            <li><strong>Withdraw Consent:</strong> Withdraw previously given consent (may limit service access)</li>
          </ul>
          <p className="text-muted mb-4">
            To exercise these rights, contact us at privacy@bookyourshoot.com or through the Support system.
          </p>

          <h5 className="fw-bold mb-3">11. Cookies and Tracking</h5>
          <p className="text-muted mb-4">
            BookYourShoot may use cookies and similar technologies to enhance user experience, maintain sessions, 
            and analyze platform usage. You can control cookie preferences through your browser settings.
          </p>

          <h5 className="fw-bold mb-3">12. Third-Party Links and Services</h5>
          <p className="text-muted mb-4">
            Our platform may contain links to third-party websites or integrate external services (payment 
            gateways, Google Maps, Spotify). We are not responsible for the privacy practices of these external 
            services. Please review their privacy policies independently.
          </p>

          <h5 className="fw-bold mb-3">13. Children's Privacy</h5>
          <p className="text-muted mb-4">
            BookYourShoot is intended for users aged 18 and above. We do not knowingly collect personal 
            information from individuals under 18. If we become aware of such collection, we will delete the 
            information promptly.
          </p>

          <h5 className="fw-bold mb-3">14. Geographic Scope</h5>
          <p className="text-muted mb-4">
            BookYourShoot primarily operates in Pakistan, with initial focus on Punjab province. Data is stored 
            and processed in accordance with Pakistani data protection laws. Users accessing from other regions 
            acknowledge data transfer to Pakistan.
          </p>

          <h5 className="fw-bold mb-3">15. Changes to This Privacy Policy</h5>
          <p className="text-muted mb-4">
            We may update this Privacy Policy periodically to reflect changes in our practices, legal requirements, 
            or platform features. We will notify users of significant changes by:
          </p>
          <ul className="text-muted mb-4">
            <li>Posting the updated policy with a new "Last Updated" date</li>
            <li>Sending email notifications for material changes</li>
            <li>Displaying in-app notifications upon next login</li>
          </ul>
          <p className="text-muted mb-4">
            Continued use of BookYourShoot after changes constitutes acceptance of the updated Privacy Policy.
          </p>

          <h5 className="fw-bold mb-3">16. Contact Us</h5>
          <p className="text-muted mb-4">
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, 
            please contact us at:
          </p>
          <ul className="text-muted mb-4">
            <li><strong>Email:</strong> privacy@bookyourshoot.com</li>
            <li><strong>Support System:</strong> Available within the BookYourShoot platform</li>
            <li><strong>Address:</strong> FAST-NUCES, Chiniot-Faisalabad Campus, Pakistan</li>
          </ul>

          <div className="alert alert-info mt-4">
            <strong>Last Updated:</strong> February 2025
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-primary" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default PrivacyModal;