import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, ProgressBar, Badge, ListGroup } from 'react-bootstrap';
import axios from 'axios';
import './AlbumBuilder.css';

/**
 * Album Builder V2 - Fresh Implementation
 * 
 * 3-Step Workflow:
 * 1. Upload Reference Photos (3-5 clear face shots)
 * 2. Upload Event Photos (60-1000 photos)
 * 3. Build Albums (AI face matching)
 */
function AlbumBuilder() {
  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Session state
  const [sessionId, setSessionId] = useState(null);
  
  // Step 1: Reference photos
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [personNames, setPersonNames] = useState(['', '', '']);
  
  // Step 2: Event photos
  const [eventFiles, setEventFiles] = useState([]);
  const [compressPhotos, setCompressPhotos] = useState(true);
  
  // Step 3: Build settings
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  
  // Results
  const [albums, setAlbums] = useState({});
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);

  const API_BASE = 'http://localhost:8000/api/album-builder/v2';

  // ============================================================================
  // STEP 1: REFERENCE PHOTOS
  // ============================================================================
  
  const handleReferenceFilesChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length < 3) {
      setError('Please select at least 3 reference photos');
      return;
    }
    
    if (files.length > 5) {
      setError('Maximum 5 reference photos allowed');
      return;
    }
    
    setReferenceFiles(files);
    
    // Initialize person names if needed
    const names = [];
    for (let i = 0; i < files.length; i++) {
      names.push(personNames[i] || '');
    }
    setPersonNames(names);
    
    setError(null);
  };
  
  const handlePersonNameChange = (index, value) => {
    const newNames = [...personNames];
    newNames[index] = value;
    setPersonNames(newNames);
  };
  
  const uploadReferences = async () => {
    // Validation
    for (let i = 0; i < referenceFiles.length; i++) {
      if (!personNames[i] || personNames[i].trim() === '') {
        setError(`Please enter a name for reference photo ${i + 1}`);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setProgress(20);
    
    try {
      // Step 1: Create session
      const token = localStorage.getItem('authToken');
      
      const sessionResponse = await axios.post(
        `${API_BASE}/create-session`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newSessionId = sessionResponse.data.session_id;
      setSessionId(newSessionId);
      setProgress(40);
      
      // Step 2: Upload references
      const formData = new FormData();
      formData.append('session_id', newSessionId);
      
      for (const file of referenceFiles) {
        formData.append('files', file);
      }
      
      await axios.post(`${API_BASE}/upload-references`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setProgress(100);
      setSuccess(`Uploaded ${referenceFiles.length} reference photo(s) successfully!`);
      
      // Move to step 2
      setTimeout(() => {
        setCurrentStep(2);
        setSuccess(null);
        setProgress(0);
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload reference photos');
      setLoading(false);
      setProgress(0);
    }
  };

  // ============================================================================
  // STEP 2: EVENT PHOTOS
  // ============================================================================
  
  const handleEventFilesChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 1000) {
      setError('Maximum 1000 event photos allowed');
      return;
    }
    
    setEventFiles(files);
    setError(null);
  };
  
  const uploadEvents = async () => {
    if (eventFiles.length === 0) {
      setError('Please select event photos');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('compress', compressPhotos);
      
      // Add files with progress tracking
      for (let i = 0; i < eventFiles.length; i++) {
        formData.append('files', eventFiles[i]);
        setProgress(Math.round(((i + 1) / eventFiles.length) * 80));
      }
      
      setProgress(90);
      
      await axios.post(`${API_BASE}/upload-events`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setProgress(100);
      setSuccess(`Uploaded ${eventFiles.length} event photo(s) successfully!`);
      
      // Move to step 3
      setTimeout(() => {
        setCurrentStep(3);
        setSuccess(null);
        setProgress(0);
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload event photos');
      setLoading(false);
      setProgress(0);
    }
  };

  // ============================================================================
  // STEP 3: BUILD ALBUMS
  // ============================================================================
  
  const buildAlbums = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      const token = localStorage.getItem('authToken');
      
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('person_names', JSON.stringify(personNames.filter(n => n)));
      formData.append('similarity_threshold', similarityThreshold);
      
      setProgress(20);
      
      const response = await axios.post(`${API_BASE}/build`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setProgress(100);
      setAlbums(response.data.data.albums);
      setSuccess('Albums created successfully!');
      setLoading(false);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to build albums');
      setLoading(false);
      setProgress(0);
    }
  };
  
  const downloadAlbum = async (personName) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        `${API_BASE}/download/${sessionId}/${encodeURIComponent(personName)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${personName}_album.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (err) {
      setError(`Failed to download album for ${personName}`);
    }
  };
  
  const startOver = () => {
    setCurrentStep(1);
    setSessionId(null);
    setReferenceFiles([]);
    setPersonNames(['', '', '']);
    setEventFiles([]);
    setAlbums({});
    setError(null);
    setSuccess(null);
    setProgress(0);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container className="album-builder-container mt-5">
      <h2 className="text-center mb-4">📸 Smart Album Builder</h2>
      
      {/* Progress Steps */}
      <div className="steps-progress mb-4">
        <div className="d-flex justify-content-between mb-2">
          <Badge bg={currentStep >= 1 ? 'primary' : 'secondary'}>
            Step 1: Reference Photos
          </Badge>
          <Badge bg={currentStep >= 2 ? 'primary' : 'secondary'}>
            Step 2: Event Photos
          </Badge>
          <Badge bg={currentStep >= 3 ? 'primary' : 'secondary'}>
            Step 3: Build Albums
          </Badge>
        </div>
        <ProgressBar 
          now={(currentStep / 3) * 100} 
          variant="primary"
        />
      </div>

      {/* Alerts */}
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

      {/* ========== STEP 1: REFERENCE PHOTOS ========== */}
      {currentStep === 1 && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Step 1: Upload Reference Photos</Card.Title>
            <Card.Text className="text-muted">
              Upload 3-5 clear photos of people you want to find in the event photos.
              Each photo should contain only ONE person's face.
            </Card.Text>

            <Form.Group className="mb-3">
              <Form.Label>Select Reference Photos (3-5)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                onChange={handleReferenceFilesChange}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                JPG, PNG - Clear face shots only
              </Form.Text>
            </Form.Group>

            {referenceFiles.length > 0 && (
              <div className="reference-names">
                <h6>Enter Person Names:</h6>
                {referenceFiles.map((file, index) => (
                  <Form.Group key={index} className="mb-2">
                    <Form.Label>{file.name}</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={`Person ${index + 1} name`}
                      value={personNames[index] || ''}
                      onChange={(e) => handlePersonNameChange(index, e.target.value)}
                      disabled={loading}
                    />
                  </Form.Group>
                ))}
              </div>
            )}

            {loading && <ProgressBar now={progress} className="mb-3" />}

            <Button
              variant="primary"
              onClick={uploadReferences}
              disabled={loading || referenceFiles.length < 3}
              className="w-100"
            >
              {loading ? 'Uploading...' : 'Next: Upload Event Photos →'}
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* ========== STEP 2: EVENT PHOTOS ========== */}
      {currentStep === 2 && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Step 2: Upload Event Photos</Card.Title>
            <Card.Text className="text-muted">
              Upload all photos from the event (60-1000 photos typically).
              The system will compress them to ~1MB each for faster processing.
            </Card.Text>

            <Form.Group className="mb-3">
              <Form.Label>Select Event Photos</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                onChange={handleEventFilesChange}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                JPG, PNG - Up to 1000 photos
              </Form.Text>
            </Form.Group>

            {eventFiles.length > 0 && (
              <Alert variant="info">
                Selected: <strong>{eventFiles.length}</strong> photos
                ({(eventFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2)} MB)
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Compress photos to ~1MB (recommended)"
                checked={compressPhotos}
                onChange={(e) => setCompressPhotos(e.target.checked)}
                disabled={loading}
              />
            </Form.Group>

            {loading && <ProgressBar now={progress} className="mb-3" />}

            <div className="d-flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
              >
                ← Back
              </Button>
              <Button
                variant="primary"
                onClick={uploadEvents}
                disabled={loading || eventFiles.length === 0}
                className="flex-grow-1"
              >
                {loading ? 'Uploading...' : 'Next: Build Albums →'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* ========== STEP 3: BUILD ALBUMS ========== */}
      {currentStep === 3 && Object.keys(albums).length === 0 && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Step 3: Build Albums</Card.Title>
            <Card.Text className="text-muted">
              Ready to create personalized albums using AI face recognition!
            </Card.Text>

            <div className="mb-4">
              <h6>Reference Photos:</h6>
              <ListGroup>
                {personNames.filter(n => n).map((name, index) => (
                  <ListGroup.Item key={index}>
                    {index + 1}. {name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>
                Similarity Threshold: <strong>{similarityThreshold.toFixed(2)}</strong>
              </Form.Label>
              <Form.Range
                min={0.55}
                max={0.70}
                step={0.01}
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                Lower = More matches (less strict), Higher = Fewer matches (more strict)
              </Form.Text>
            </Form.Group>

            {loading && (
              <>
                <ProgressBar now={progress} className="mb-3" />
                <p className="text-center text-muted">
                  Processing... This may take 1-2 minutes for 60 photos
                </p>
              </>
            )}

            <div className="d-flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(2)}
                disabled={loading}
              >
                ← Back
              </Button>
              <Button
                variant="success"
                onClick={buildAlbums}
                disabled={loading}
                className="flex-grow-1"
              >
                {loading ? 'Building Albums...' : '✨ Create Albums'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* ========== RESULTS ========== */}
      {Object.keys(albums).length > 0 && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>✅ Albums Created Successfully!</Card.Title>

            <ListGroup className="mb-3">
              {Object.entries(albums).map(([personName, count]) => (
                <ListGroup.Item 
                  key={personName}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>{personName}</strong>
                    <Badge bg="info" className="ms-2">{count} photos</Badge>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => downloadAlbum(personName)}
                  >
                    Download ZIP
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>

            <Button
              variant="secondary"
              onClick={startOver}
              className="w-100"
            >
              Create Another Album
            </Button>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default AlbumBuilder;
