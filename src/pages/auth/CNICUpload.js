import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cnicAPI } from '../../api/api';

const CNICUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadedFrontFile, setUploadedFrontFile] = useState(null);
  const [uploadedBackFile, setUploadedBackFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingFront, setProcessingFront] = useState(false);
  const [processingBack, setProcessingBack] = useState(false);
  const [frontData, setFrontData] = useState(null);
  const [backData, setBackData] = useState(null);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Front, 2: Back

  const handleFrontUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFrontFile(file);
      setProcessingFront(true);
      setError(null);
      setFrontData(null);

      // Check if user is logged in
      if (!user) {
        setError('Please complete OTP verification first before uploading CNIC');
        setProcessingFront(false);
        return;
      }

      try {
        // Upload and process CNIC front image
        const response = await cnicAPI.uploadCNIC(file, 'front');
        
        if (response.success) {
          const data = response.data;
          setFrontData({
            cnicNumber: data.cnic_number || 'Not detected',
            name: data.possible_name || 'Not detected',
            dates: data.dates || [],
            expiryInfo: data.expiry_info || null,
            readability: data.readability_score || 0,
            isReadable: data.is_readable || false
          });
          
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
        // Upload and process CNIC back image
        const response = await cnicAPI.uploadCNIC(file, 'back');
        
        if (response.success) {
          const data = response.data;
          setBackData({
            qrData: data.qr_data || [],
            qrSuccess: data.qr_success || false,
            message: data.message || ''
          });
        } else {
          setError(response.error || 'Failed to process CNIC back image');
        }
      } catch (err) {
        console.error('CNIC Back QR Error:', err);
        setError(err.message || 'Failed to scan QR code. Please ensure the back side is clear.');
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

    setLoading(true);
    try {
      // Verification complete - both sides processed
      navigate('/photographer/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      setError('Failed to submit CNIC for verification');
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

                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger">
                    <strong>❌ Error:</strong> {error}
                  </div>
                )}

                {/* Front Side Extracted Data */}
                {frontData && (
                  <div className="alert alert-light fade-in">
                    <h6 className="fw-bold mb-3">🔍 Front Side - Extracted Information:</h6>
                    
                    {/* Readability Score */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong>Image Quality:</strong>
                        <span className={`badge ${frontData.isReadable ? 'bg-success' : 'bg-danger'}`}>
                          {frontData.isReadable ? '✓ Readable' : '✗ Poor Quality'}
                        </span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div 
                          className={`progress-bar ${frontData.readability >= 70 ? 'bg-success' : frontData.readability >= 40 ? 'bg-warning' : 'bg-danger'}`}
                          style={{ width: `${frontData.readability}%` }}
                        ></div>
                      </div>
                      <small className="text-muted">Readability: {frontData.readability}%</small>
                    </div>

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
                    <h6 className="fw-bold mb-3">🔍 Back Side - QR Code Verification:</h6>
                    
                    {backData.qrSuccess ? (
                      <>
                        <div className="alert alert-success mb-2">
                          <strong>✅ QR Code scanned successfully!</strong>
                        </div>
                        {backData.qrData && backData.qrData.length > 0 && (
                          <div className="mb-2">
                            <strong>QR Code Data:</strong>
                            {backData.qrData.map((qr, idx) => (
                              <div key={idx} className="border p-2 mt-2 rounded">
                                <small className="text-muted">Type: {qr.type}</small><br />
                                <code className="small">{qr.data}</code>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="alert alert-warning mb-0">
                        <strong>⚠️ {backData.message || 'QR code not found'}</strong><br />
                        <small>You can still proceed, but QR verification is recommended.</small>
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
                    disabled={loading || !frontData.isReadable || frontData.cnicNumber === 'Not detected'}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting for Verification...
                      </>
                    ) : !frontData.isReadable || frontData.cnicNumber === 'Not detected' ? (
                      '⚠️ Please Upload Clearer Front Image'
                    ) : (
                      '✓ Confirm & Submit for Verification'
                    )}
                  </button>
                )}

                {/* Skip for Demo */}
                <div className="text-center mt-3">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/photographer/dashboard')}
                  >
                    Skip for Demo →
                  </button>
                </div>
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
