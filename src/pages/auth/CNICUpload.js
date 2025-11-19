import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CNICUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      // Simulate OCR extraction
      setTimeout(() => {
        setExtractedData({
          name: 'AHMED RAZA',
          cnicNumber: '35202-1234567-1',
          fatherName: 'MUHAMMAD RAZA',
          dateOfBirth: '1990-05-15',
          address: '123 Garden Town, Lahore, Punjab'
        });
      }, 1500);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Redirect to photographer dashboard after CNIC upload
    navigate('/photographer/dashboard');
  };

  return (
    <div className="cnic-upload py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <span style={{ fontSize: '3rem' }}>🆔</span>
                  </div>
                  <h2 className="fw-bold">Photographer Verification</h2>
                  <p className="text-muted">Upload your CNIC for identity verification</p>
                </div>

                {/* Upload Area */}
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
                      onChange={handleFileUpload}
                      className="d-none"
                      id="cnic-upload"
                    />
                    <label 
                      htmlFor="cnic-upload" 
                      className="btn btn-primary btn-lg"
                      style={{ cursor: 'pointer' }}
                    >
                      📁 Choose File
                    </label>
                    {uploadedFile && (
                      <div className="mt-3">
                        <p className="text-success fw-semibold mb-0">
                          ✅ {uploadedFile.name}
                        </p>
                        <small className="text-muted">
                          {Math.round(uploadedFile.size / 1024)} KB
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Data */}
                {extractedData && (
                  <div className="alert alert-light fade-in">
                    <h6 className="fw-bold mb-3">🔍 Extracted Information:</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>Name:</strong> {extractedData.name}
                        </p>
                        <p className="mb-2">
                          <strong>CNIC:</strong> {extractedData.cnicNumber}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>Father Name:</strong> {extractedData.fatherName}
                        </p>
                        <p className="mb-2">
                          <strong>DOB:</strong> {extractedData.dateOfBirth}
                        </p>
                      </div>
                    </div>
                    <p className="mb-2">
                      <strong>Address:</strong> {extractedData.address}
                    </p>
                    <div className="alert alert-warning small">
                      <strong>⚠️ Important:</strong> Please verify the extracted information is correct. 
                      If there are any errors, please re-upload a clearer image.
                    </div>
                  </div>
                )}

                {/* Requirements */}
                <div className="alert alert-info">
                  <h6 className="fw-bold mb-3">📋 Requirements:</h6>
                  <ul className="mb-0 small">
                    <li>CNIC must be valid and not expired</li>
                    <li>Clear image with all details visible</li>
                    <li>No glare or shadows on the CNIC</li>
                    <li>CNIC must match your registration details</li>
                    <li>Verification process takes 1-2 business days</li>
                  </ul>
                </div>

                {/* Submit Button */}
                {extractedData && (
                  <button 
                    className="btn btn-primary w-100 py-3"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting for Verification...
                      </>
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