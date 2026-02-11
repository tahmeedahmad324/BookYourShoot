import React from 'react';
import { Modal } from 'react-bootstrap';
import '../../styles/legal-modals.css';

const TermsModal = ({ show, onHide }) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Terms and Conditions</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh' }}>
        <div className="card-body p-2">
          <h5 className="fw-bold mb-3">1. Agreement to Terms</h5>
          <p className="text-muted mb-4">
            By accessing and using BookYourShoot, you accept and agree to be bound by these terms and conditions. 
            BookYourShoot is a web-based platform connecting clients with professional photographers across Pakistan. 
            If you do not agree to these terms, please do not use this service.
          </p>

          <h5 className="fw-bold mb-3">2. User Registration and Verification</h5>
          <p className="text-muted mb-3 fw-semibold">All users must:</p>
          <ul className="text-muted mb-4">
            <li>Provide accurate and complete registration information</li>
            <li>Verify their account through OTP authentication</li>
            <li>Maintain the confidentiality of their account credentials</li>
            <li><strong>Photographers specifically must:</strong> Submit valid CNIC details for identity verification and await admin approval before offering services</li>
          </ul>

          <h5 className="fw-bold mb-3">3. User Roles and Responsibilities</h5>
          <p className="text-muted mb-3 fw-semibold">Clients agree to:</p>
          <ul className="text-muted mb-3">
            <li>Provide accurate event details when making bookings</li>
            <li>Make timely payments for confirmed bookings</li>
            <li>Submit honest ratings and reviews based on actual experiences</li>
            <li>Respect photographer availability and scheduling</li>
          </ul>
          <p className="text-muted mb-3 fw-semibold">Photographers agree to:</p>
          <ul className="text-muted mb-4">
            <li>Maintain accurate portfolio and profile information</li>
            <li>Honor confirmed bookings and maintain professionalism</li>
            <li>Update availability calendars promptly</li>
            <li>Provide services as agreed in booking terms</li>
            <li>Maintain equipment listed for rental in good working condition</li>
          </ul>

          <h5 className="fw-bold mb-3">4. Booking and Cancellation Policy</h5>
          <p className="text-muted mb-4">
            Clients may request bookings which photographers can accept or reject. Once confirmed, bookings are 
            subject to the following cancellation terms:
          </p>
          <ul className="text-muted mb-4">
            <li>Clients may cancel bookings up to 48 hours before the scheduled event date</li>
            <li>Photographers may decline bookings or request rescheduling with advance notice</li>
            <li>Cancellations made less than 48 hours before the event may result in partial payment retention</li>
            <li>All cancellations and modifications must be documented through the platform</li>
          </ul>

          <h5 className="fw-bold mb-3">5. Payment Terms</h5>
          <p className="text-muted mb-4">
            All payments are processed through the BookYourShoot platform with transparent transaction tracking. 
            The platform implements an escrow-like mechanism where:
          </p>
          <ul className="text-muted mb-4">
            <li>Payments are held securely until service completion</li>
            <li>Funds are released to photographers after client confirmation or specified timeframe</li>
            <li>Disputed payments are reviewed by platform administrators</li>
            <li>All transaction records are maintained for transparency</li>
          </ul>

          <h5 className="fw-bold mb-3">6. Equipment Rental Module</h5>
          <p className="text-muted mb-4">
            Photographers may list equipment for rent to other verified photographers. Equipment rental terms include:
          </p>
          <ul className="text-muted mb-4">
            <li>Renters must provide deposit as specified by equipment owner</li>
            <li>Photo-based verification required at equipment return</li>
            <li>Renters are responsible for any damage or loss during rental period</li>
            <li>Disputes regarding equipment condition are resolved by platform administrators</li>
          </ul>

          <h5 className="fw-bold mb-3">7. Communication and Conduct</h5>
          <p className="text-muted mb-4">
            Users must communicate respectfully through the platform's integrated chat and voice call system. 
            Chat logs may be accessed by administrators for dispute resolution. Prohibited conduct includes:
          </p>
          <ul className="text-muted mb-4">
            <li>Harassment, threats, or abusive language</li>
            <li>Attempting to conduct transactions outside the platform</li>
            <li>Sharing false or misleading information</li>
            <li>Impersonating others or creating duplicate accounts</li>
          </ul>

          <h5 className="fw-bold mb-3">8. Content and Intellectual Property</h5>
          <p className="text-muted mb-4">
            Photographers retain copyright to their portfolio images and event photos. By using platform features 
            (Smart Album Builder, Reel Generator), users grant BookYourShoot limited rights to process and display 
            content as necessary for service provision. Users may not:
          </p>
          <ul className="text-muted mb-4">
            <li>Upload content that violates intellectual property rights</li>
            <li>Use platform-generated content for commercial purposes without proper rights</li>
            <li>Reproduce, distribute, or modify platform features or software</li>
          </ul>

          <h5 className="fw-bold mb-3">9. AI-Powered Features</h5>
          <p className="text-muted mb-4">
            BookYourShoot provides AI-powered tools including chatbot assistance, smart album categorization, 
            face recognition search, and reel generation. Users acknowledge that:
          </p>
          <ul className="text-muted mb-4">
            <li>AI-generated content (captions, hashtags, suggestions) is provided as-is</li>
            <li>Face recognition is used solely for photo organization within user albums</li>
            <li>AI processing may have limitations in accuracy and is not guaranteed</li>
          </ul>

          <h5 className="fw-bold mb-3">10. Geographic Limitations</h5>
          <p className="text-muted mb-4">
            The Inter-city Travel Cost Estimator is currently limited to Punjab province cities only. Cost 
            estimates are provided for informational purposes and may vary from actual costs.
          </p>

          <h5 className="fw-bold mb-3">11. Ratings, Reviews, and Moderation</h5>
          <p className="text-muted mb-4">
            Clients may submit ratings and reviews only for completed bookings. Reviews must be honest and 
            based on actual experiences. Platform administrators reserve the right to:
          </p>
          <ul className="text-muted mb-4">
            <li>Moderate or remove reviews that violate content policies</li>
            <li>Remove false, defamatory, or abusive reviews</li>
            <li>Investigate suspicious rating patterns</li>
          </ul>

          <h5 className="fw-bold mb-3">12. Account Suspension and Termination</h5>
          <p className="text-muted mb-4">
            BookYourShoot administrators may suspend or terminate accounts that:
          </p>
          <ul className="text-muted mb-4">
            <li>Violate these terms and conditions</li>
            <li>Engage in fraudulent or suspicious activity</li>
            <li>Receive multiple verified complaints</li>
            <li>Provide false identity information</li>
          </ul>

          <h5 className="fw-bold mb-3">13. Dispute Resolution</h5>
          <p className="text-muted mb-4">
            Users may raise complaints through the Support & Complaints system. Administrators will review 
            disputes by examining booking details, chat logs, and payment records. Platform decisions on 
            disputes are final.
          </p>

          <h5 className="fw-bold mb-3">14. Limitation of Liability</h5>
          <p className="text-muted mb-4">
            BookYourShoot acts as a platform connecting clients and photographers. We are not liable for:
          </p>
          <ul className="text-muted mb-4">
            <li>Quality of photography services provided by photographers</li>
            <li>Cancellations, no-shows, or disputes between users</li>
            <li>Loss, damage, or theft of rented equipment</li>
            <li>Accuracy of travel cost estimates</li>
            <li>Technical issues, service interruptions, or data loss</li>
          </ul>

          <h5 className="fw-bold mb-3">15. Service Availability</h5>
          <p className="text-muted mb-4">
            BookYourShoot requires internet connectivity and is provided "as is." We strive for continuous 
            availability but do not guarantee uninterrupted service. Features may be added, modified, or 
            removed at our discretion.
          </p>

          <h5 className="fw-bold mb-3">16. Changes to Terms</h5>
          <p className="text-muted mb-4">
            We may update these Terms and Conditions periodically. Users will be notified of significant 
            changes, and continued use constitutes acceptance of updated terms.
          </p>

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

export default TermsModal;