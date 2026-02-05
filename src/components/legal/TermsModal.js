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
            By accessing and using BookYourShoot, you accept and agree to be bound by the terms and provision of
            this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>

          <h5 className="fw-bold mb-3">2. Use License</h5>
          <p className="text-muted mb-4">
            Permission is granted to temporarily download one copy of the materials (information or software) on
            BookYourShoot for personal, non-commercial transitory viewing only. This is the grant of a license, not
            a transfer of title, and under this license you may not:
          </p>
          <ul className="text-muted mb-4">
            <li>Modifying or copying the materials</li>
            <li>Using the materials for any commercial purpose or for any public display</li>
            <li>Attempting to decompile or reverse engineer any software</li>
            <li>Removing any copyright or other proprietary notations</li>
            <li>Transferring the materials to another person or "mirroring"</li>
          </ul>

          <h5 className="fw-bold mb-3">3. Disclaimer</h5>
          <p className="text-muted mb-4">
            The materials on BookYourShoot are provided on an 'as is' basis. BookYourShoot makes no warranties,
            expressed or implied, and hereby disclaims and negates all other warranties including, without
            limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or
            non-infringement of intellectual property or other violation of rights.
          </p>

          <h5 className="fw-bold mb-3">4. Limitations</h5>
          <p className="text-muted mb-4">
            In no event shall BookYourShoot or its suppliers be liable for any damages (including, without
            limitation, damages for loss of data or profit, or due to business interruption,) arising out of the use
            or inability to use the materials on BookYourShoot.
          </p>

          <h5 className="fw-bold mb-3">5. User Responsibilities</h5>
          <p className="text-muted mb-4">
            Users agree to use BookYourShoot only for lawful purposes and in a way that does not infringe upon the
            rights of others or restrict their use and enjoyment of BookYourShoot.
          </p>

          <h5 className="fw-bold mb-3">6. Booking Cancellation</h5>
          <p className="text-muted mb-4">
            Clients may cancel bookings up to 48 hours before the scheduled shoot date. Photographers may decline or
            reschedule bookings with advance notice.
          </p>

          <div className="alert alert-info mt-4">
            <strong>Last Updated:</strong> November 2024
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
