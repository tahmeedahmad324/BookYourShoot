import { Link } from "react-router-dom"

const PrivacyPolicy = () => {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h1 className="fw-bold mb-4">Privacy Policy</h1>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">1. Introduction</h5>
              <p className="text-muted mb-4">
                BookYourShoot ("we" or "us" or "our") operates the BookYourShoot website. This page informs you of our
                policies regarding the collection, use, and disclosure of personal data when you use our Service and the
                choices you have associated with that data.
              </p>

              <h5 className="fw-bold mb-3">2. Information Collection and Use</h5>
              <p className="text-muted mb-3 fw-semibold">
                We collect several different types of information for various purposes:
              </p>
              <ul className="text-muted mb-4">
                <li>
                  <strong>Personal Data:</strong> Email address, name, phone number, location
                </li>
                <li>
                  <strong>Payment Information:</strong> Billing address, payment method details (processed securely)
                </li>
                <li>
                  <strong>Identity Verification:</strong> CNIC for photographer verification
                </li>
                <li>
                  <strong>Usage Data:</strong> IP address, browser type, pages visited, time and date of access
                </li>
              </ul>

              <h5 className="fw-bold mb-3">3. CNIC Data Security</h5>
              <p className="text-muted mb-4">
                CNIC information is encrypted, stored securely, and only used for photographer identity verification. We
                comply with Pakistan's data protection regulations.
              </p>

              <h5 className="fw-bold mb-3">4. Use of Data</h5>
              <p className="text-muted mb-4">BookYourShoot uses the collected data for various purposes:</p>
              <ul className="text-muted mb-4">
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To allow you to participate in interactive features</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information</li>
                <li>To monitor the usage of our Service</li>
                <li>To detect, prevent and address technical issues</li>
              </ul>

              <h5 className="fw-bold mb-3">5. Security of Data</h5>
              <p className="text-muted mb-4">
                The security of your data is important to us, but remember that no method of transmission over the
                Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable
                means to protect your Personal Data, we cannot guarantee its absolute security.
              </p>

              <h5 className="fw-bold mb-3">6. Changes to This Privacy Policy</h5>
              <p className="text-muted mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the "Last Updated" date.
              </p>

              <h5 className="fw-bold mb-3">7. Contact Us</h5>
              <p className="text-muted mb-4">
                If you have any questions about this Privacy Policy, please contact us at privacy@bookyourshoot.com
              </p>

              <div className="alert alert-info mt-4">
                <strong>Last Updated:</strong> November 2024
              </div>

              <div className="d-flex justify-content-between mt-4">
                <Link to="/" className="btn btn-outline-primary">
                  Back to Home
                </Link>
                <Link to="/terms" className="btn btn-outline-primary">
                  Terms & Conditions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
