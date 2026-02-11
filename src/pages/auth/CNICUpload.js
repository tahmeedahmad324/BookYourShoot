import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cnicAPI } from '../../api/api';

const CNICUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [uploadedFrontFile, setUploadedFrontFile] = useState(null);
  const [uploadedBackFile, setUploadedBackFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingFront, setProcessingFront] = useState(false);
  const [processingBack, setProcessingBack] = useState(false);
  const [frontData, setFrontData] = useState(null);
  const [backData, setBackData] = useState(null);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Front, 2: Back
  const [registrationData, setRegistrationData] = useState(null);

  // Check for message from OTP verification and load registration data
  useEffect(() => {
    if (location.state?.message) {
      setInfoMessage(location.state.message);
    }

    // Load pending registration data from sessionStorage (for users not yet logged in)
    const pendingReg = sessionStorage.getItem('pendingRegistration');
    if (pendingReg) {
      try {
        setRegistrationData(JSON.parse(pendingReg));
      } catch (e) {
        console.error('Failed to parse registration data:', e);
      }
    }
  }, [location.state]);

  const handleFrontUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFrontFile(file);
      setProcessingFront(true);
      setError(null);
      setFrontData(null);

      // Get user info from either logged-in user or registration data
      const userInfo = user || registrationData;
      const userName = userInfo?.full_name || userInfo?.name || '';

      if (!userName) {
        setError('Unable to verify identity. User name not found. Please login or restart registration.');
        setProcessingFront(false);
        return;
      }

      try {
        // Upload and process CNIC front image
        const response = await cnicAPI.uploadCNIC(file, 'front');

        if (response.success) {
          const data = response.data;

          // Check if name matches registered user's name
          const cnicName = data.possible_name || 'Not detected';
          const registeredName = userName;

          // Compare names (case-insensitive, allow partial match)
          let nameMatches = false;
          if (cnicName !== 'Not detected' && registeredName) {
            const cleanCnicName = cnicName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
            const cleanRegName = registeredName.toLowerCase().replace(/[^a-z\s]/g, '').trim();

            // Check if names are similar (allow some flexibility)
            nameMatches = cleanCnicName.includes(cleanRegName) ||
              cleanRegName.includes(cleanCnicName) ||
              cleanCnicName.split(' ').some(part => cleanRegName.includes(part) && part.length > 2);
          }

          setFrontData({
            cnicNumber: data.cnic_number || 'Not detected',
            name: cnicName,
            dates: data.dates || [],
            expiryInfo: data.expiry_info || null,
            readability: data.readability_score || 0,
            isReadable: data.is_readable || false,
            nameMatches: nameMatches,
            registeredName: registeredName
          });

          // Check for name mismatch
          if (cnicName !== 'Not detected' && !nameMatches) {
            setError(`Name mismatch: CNIC shows "${cnicName}" but you registered as "${registeredName}". Please ensure the CNIC matches your registration details.`);
            return;
          }

          // Auto-advance to back side if front is readable
          if (data.is_readable && data.cnic_number && data.cnic_number !== 'Not detected') {
            setTimeout(() => setCurrentStep(2), 1000);
          }
        } else {
          setError(response.error || 'Failed to process CNIC front image');
        }
      } catch (err) {
        console.error('CNIC OCR Error:', err);
        setError(err.message || 'Failed to process CNIC. Please ensure the image is clear and try again.');
      } finally {
        setProcessingFront(false);
      }
    }
  };

  const handleBackUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedBackFile(file);
      setProcessingBack(true);
      setError(null);
      setBackData(null);

      try {
        if (!uploadedFrontFile) {
          setError('Please upload CNIC front side first');
          setProcessingBack(false);
          return;
        }

        // Verify BOTH sides together (front CNIC number must match CNIC embedded in QR)
        const response = await cnicAPI.verifyPair(uploadedFrontFile, file);
        if (response.success) {
          const data = response.data;
          setBackData({
            qrSuccess: !!data.cnic_number_from_qr,
            cnicFromQr: data.cnic_number_from_qr || null,
            cnicFront: data.cnic_number_front || null,
            cnicMatch: !!data.cnic_match,
            message: data.message || ''
          });
        } else {
          setError(response.error || 'Failed to verify CNIC');
        }
      } catch (err) {
        console.error('CNIC Pair Verification Error:', err);
        setError(err.message || 'Failed to verify CNIC. Please ensure both images are clear and try again.');
      } finally {
        setProcessingBack(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!frontData || !frontData.isReadable) {
      setError('Please upload a clear CNIC front image first');
      setLoading(false);
      return;
    }

    if (!backData || !backData.cnicMatch) {
      setError('CNIC verification requires back-side QR match. Please upload a clear back image so we can confirm it is your CNIC.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Verification complete - CNIC matched and saved in backend
      // The backend already saved the verification data when verifyPair was called

      // Clear registration data from sessionStorage
      sessionStorage.removeItem('pendingRegistration');

      // If user is not logged in (registration flow), redirect to login
      if (!user) {
        const email = registrationData?.email || '';
        navigate('/login', {
          state: {
            message: 'Registration complete! Your CNIC has been submitted for verification. Please login to continue.',
            email: email
          }
        });
      } else {
        // If user is logged in (updating CNIC), go to profile setup
        navigate('/photographer/profile-setup');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError('Failed to complete CNIC verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cnic-upload py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <span style={{ fontSize: '3rem' }}>🆔</span>
                  </div>
                  <h2 className="fw-bold">Photographer Verification</h2>
                  <p className="text-muted">Upload both sides of your CNIC for identity verification</p>
                </div>

                {/* Step Indicator */}
                <div className="d-flex justify-content-center mb-4">
                  <div className="d-flex align-items-center">
                    <div className={`badge ${currentStep >= 1 ? 'bg-primary' : 'bg-secondary'} me-2`}>1</div>
                    <span className={currentStep >= 1 ? 'text-primary fw-bold' : 'text-muted'}>Front Side</span>
                    <div className="mx-3">→</div>
                    <div className={`badge ${currentStep >= 2 ? 'bg-primary' : 'bg-secondary'} me-2`}>2</div>
                    <span className={currentStep >= 2 ? 'text-primary fw-bold' : 'text-muted'}>Back Side</span>
                  </div>
                </div>

                {/* Front Side Upload */}
                {currentStep === 1 && (
                  <div className="upload-zone mb-4">
                    <div className="text-center">
                      <div className="mb-3">
                        <span style={{ fontSize: '4rem' }}>📷</span>
                      </div>
                      <h5 className="fw-semibold mb-3">Upload CNIC Front Side</h5>
                      <p className="text-muted mb-4">
                        Make sure the CNIC is clear and all details are visible
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrontUpload}
                        className="d-none"
                        id="cnic-front-upload"
                      />
                      <label
                        htmlFor="cnic-front-upload"
                        className="btn btn-primary btn-lg"
                        style={{ cursor: 'pointer' }}
                      >
                        📁 Choose Front Side Image
                      </label>
                      {uploadedFrontFile && (
                        <div className="mt-3">
                          <p className="text-success fw-semibold mb-0">
                            ✅ {uploadedFrontFile.name}
                          </p>
                          <small className="text-muted">{(uploadedFrontFile.size / 1024).toFixed(2)} KB</small>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Back Side Upload */}
                {currentStep === 2 && (
                  <div className="upload-zone mb-4">
                    <div className="text-center">
                      <div className="mb-3">
                        <span style={{ fontSize: '4rem' }}>🔍</span>
                      </div>
                      <h5 className="fw-semibold mb-3">Upload CNIC Back Side</h5>
                      <p className="text-muted mb-4">
                        Back side contains QR code for verification
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackUpload}
                        className="d-none"
                        id="cnic-back-upload"
                      />
                      <label
                        htmlFor="cnic-back-upload"
                        className="btn btn-success btn-lg"
                        style={{ cursor: 'pointer' }}
                      >
                        📁 Choose Back Side Image
                      </label>
                      {uploadedBackFile && (
                        <div className="mt-3">
                          <p className="text-success fw-semibold mb-0">
                            ✅ {uploadedBackFile.name}
                          </p>
                          <small className="text-muted">{(uploadedBackFile.size / 1024).toFixed(2)} KB</small>
                        </div>
                      )}
                      <div className="mt-3">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => setCurrentStep(1)}
                        >
                          ← Back to Front Side
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Indicator - Front */}
                {processingFront && (
                  <div className="alert alert-info text-center">
                    <div className="spinner-border text-primary mb-2" role="status">
                      <span className="visually-hidden">Processing...</span>
                    </div>
                    <p className="mb-0">Processing CNIC front side with OCR...</p>
                  </div>
                )}

                {/* Processing Indicator - Back */}
                {processingBack && (
                  <div className="alert alert-info text-center">
                    <div className="spinner-border text-success mb-2" role="status">
                      <span className="visually-hidden">Scanning...</span>
                    </div>
                    <p className="mb-0">Scanning QR code from back side...</p>
                  </div>
                )}

                {/* Info Message */}
                {infoMessage && (
                  <div className="alert alert-info">
                    ℹ️ {infoMessage}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger">
                    <strong>❌ Error:</strong> {error}
                  </div>
                )}

                {/* Front Side Extracted Data */}
                {frontData && (
                  <div className="alert alert-light fade-in">
                    <h6 className="fw-bold mb-3">✅ CNIC Information Extracted</h6>

                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>CNIC Number:</strong><br />
                          <span className={frontData.cnicNumber === 'Not detected' ? 'text-danger' : 'text-success fw-bold'}>
                            {frontData.cnicNumber}
                          </span>
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>Name:</strong><br />
                          <span className={frontData.name === 'Not detected' ? 'text-danger' : 'fw-bold'}>
                            {frontData.name}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Dates Found */}
                    {frontData.dates && frontData.dates.length > 0 && (
                      <div className="mb-2">
                        <strong>Dates Found:</strong>
                        <ul className="mb-0 mt-1">
                          {frontData.dates.map((date, idx) => (
                            <li key={idx}>{date}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Expiry Information */}
                    {frontData.expiryInfo && frontData.expiryInfo.expiry_date && (
                      <div className={`alert ${frontData.expiryInfo.is_expired ? 'alert-danger' : 'alert-success'} small mt-3 mb-2`}>
                        <strong>📅 Expiry Status:</strong><br />
                        Expiry Date: {frontData.expiryInfo.expiry_date}<br />
                        Status: {frontData.expiryInfo.message}
                      </div>
                    )}

                    {frontData.isReadable && frontData.cnicNumber !== 'Not detected' && (
                      <div className="alert alert-success small mt-3 mb-0">
                        <strong>✅ Front side verified!</strong> Now upload the back side for QR code verification.
                      </div>
                    )}
                  </div>
                )}

                {/* Back Side QR Data */}
                {backData && (
                  <div className="alert alert-light fade-in">
                    <h6 className="fw-bold mb-3">🔍 Back Side - Identity Verification:</h6>

                    {backData.cnicMatch ? (
                      <div className="alert alert-success mb-0">
                        <strong>✅ Verified:</strong> Front CNIC matches back QR.<br />
                        {backData.cnicFromQr && (
                          <small className="text-muted">QR CNIC: {backData.cnicFromQr}</small>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-danger mb-0">
                        <strong>❌ Verification failed:</strong> {backData.message || 'CNIC mismatch or QR not readable.'}<br />
                        {backData.cnicFront && backData.cnicFromQr && (
                          <div className="mt-2 small">
                            <div><strong>Front CNIC:</strong> {backData.cnicFront}</div>
                            <div><strong>QR CNIC:</strong> {backData.cnicFromQr}</div>
                          </div>
                        )}
                        <small className="d-block mt-2">Please upload a clearer back image with the QR fully visible.</small>
                      </div>
                    )}
                  </div>
                )}

                {/* Requirements */}
                <div className="alert alert-info">
                  <h6 className="fw-bold mb-3">📋 Requirements:</h6>
                  <ul className="mb-0 small">
                    <li><strong>Use Computerized NIC only</strong> (not old manual/handwritten cards)</li>
                    <li>CNIC must be valid and not expired</li>
                    <li>Clear, well-lit photo with all details visible</li>
                    <li>No glare, shadows, or blur on the CNIC</li>
                    <li>Ensure CNIC number is clearly readable</li>
                    <li>CNIC must match your registration details</li>
                    <li>Verification process takes 1-2 business days</li>
                  </ul>
                </div>

                {/* Submit Button */}
                {frontData && (
                  <button
                    className="btn btn-primary w-100 py-3"
                    onClick={handleSubmit}
                    disabled={loading || !frontData.isReadable || frontData.cnicNumber === 'Not detected' || !backData || !backData.cnicMatch}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting for Verification...
                      </>
                    ) : !frontData.isReadable || frontData.cnicNumber === 'Not detected' ? (
                      '⚠️ Please Upload Clearer Front Image'
                    ) : !backData || !backData.cnicMatch ? (
                      '⚠️ Please Verify Back Side'
                    ) : (
                      '✓ Confirm & Submit for Verification'
                    )}
                  </button>
                )}

                {/* Info: CNIC Required */}
                <div className="alert alert-warning mt-3 small">
                  <strong>⚠️ CNIC verification is mandatory</strong> for photographer accounts to ensure trust and security on the platform.
                </div>

                {/* Skip option for registration flow */}
                {isRegistrationFlow && !frontData && (
                  <div className="text-center mt-3">
                    <button
                      className="btn btn-link text-muted"
                      onClick={() => {
                        sessionStorage.removeItem('pendingRegistration');
                        const email = registrationData?.email || '';
                        navigate('/login', {
                          state: {
                            message: 'You can complete CNIC verification later from your profile. Please login to continue.',
                            email: email
                          }
                        });
                      }}
                    >
                      Skip for now (complete later from profile)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Back */}
            <div className="text-center mt-4">
              <Link to="/register" className="text-muted text-decoration-none">
                ← Back to Registration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CNICUpload;
