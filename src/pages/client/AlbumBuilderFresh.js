import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

/**
 * AI Album Builder - STRICT Pipeline Implementation
 * 
 * Flow:
 * 0. Welcome screen with rules/steps explanation
 * 1. Add people (unlimited) with 1 photo each, preview, delete option
 * 2. Upload event photos (20-300) with preview, remove option
 * 3. AI Processing with STRICT threshold (0.78)
 * 4. View albums on website + download
 * Updated: Cancel session functionality added
 */
function AlbumBuilderFresh() {
  // Auth
  const { getToken } = useAuth();
  const navigate = useNavigate();
  
  // Session
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Step 1: People management
  const [people, setPeople] = useState([]); // [{name: '', files: [], previews: []}]
  const [currentPersonName, setCurrentPersonName] = useState('');
  const [currentPersonFiles, setCurrentPersonFiles] = useState([]);
  const [currentPersonPreviews, setCurrentPersonPreviews] = useState([]);
  const personFileInputRef = useRef(null);
  const [referencesProcessed, setReferencesProcessed] = useState(false);
  
  // Step 2: Event photos
  const [eventFiles, setEventFiles] = useState([]);
  const [eventPreviews, setEventPreviews] = useState([]);
  const [eventsProcessed, setEventsProcessed] = useState(false);
  const [eventFilesCount, setEventFilesCount] = useState(0); // For background processing persistence
  
  // Step 3: Results
  const [albums, setAlbums] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosToRemove, setPhotosToRemove] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  // Background Processing & Notifications
  const [isProcessingInBackground, setIsProcessingInBackground] = useState(false);
  const [processingNotification, setProcessingNotification] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const API_BASE = 'http://localhost:8000/api/album-builder';

  // ============================================================================
  // BACKGROUND PROCESSING STATE PERSISTENCE
  // ============================================================================
  
  // Save state to localStorage for background processing
  const saveProcessingState = () => {
    const state = {
      sessionId,
      currentStep,
      progress,
      progressText,
      processedCount,
      estimatedTime,
      isProcessingInBackground,
      eventFilesCount: eventFiles.length,
      peopleNames: people.map(p => p.name),
      timestamp: Date.now()
    };
    localStorage.setItem('albumBuilderProcessing', JSON.stringify(state));
  };

  // Load state from localStorage
  const loadProcessingState = () => {
    const saved = localStorage.getItem('albumBuilderProcessing');
    if (saved) {
      const state = JSON.parse(saved);
      // Only restore if less than 1 hour old
      if (Date.now() - state.timestamp < 3600000) {
        return state;
      }
    }
    return null;
  };

  // Clear processing state
  const clearProcessingState = () => {
    localStorage.removeItem('albumBuilderProcessing');
  };

  // Export processing status for dashboard indicator
  useEffect(() => {
    if (isProcessingInBackground || (loading && progress > 0)) {
      saveProcessingState();
      // Store in window object for dashboard access
      window.albumBuilderProcessing = {
        active: true,
        progress,
        processedCount,
        total: eventFiles.length
      };
    } else {
      window.albumBuilderProcessing = { active: false };
    }
  }, [isProcessingInBackground, loading, progress, processedCount, eventFiles.length]);

  // Check for active processing on mount
  useEffect(() => {
    const savedState = loadProcessingState();
    if (savedState && savedState.isProcessingInBackground) {
      // Restore the processing state
      setSessionId(savedState.sessionId);
      setCurrentStep(savedState.currentStep);
      setProgress(savedState.progress);
      setProgressText(savedState.progressText || 'Processing in background...');
      setProcessedCount(savedState.processedCount);
      setEstimatedTime(savedState.estimatedTime);
      setEventFilesCount(savedState.eventFilesCount || 0);
      setIsProcessingInBackground(true);
      setProcessingNotification({
        type: 'info',
        message: 'Your album is still processing. You can browse and come back to check progress.'
      });
    }
  }, []);

  // ============================================================================
  // STYLES - Pastel colors matching website
  // ============================================================================
  const styles = {
    pageContainer: {
      background: 'linear-gradient(135deg, #faf5ff 0%, #f0f9ff 50%, #f5f3ff 100%)',
      minHeight: '100vh',
      paddingTop: '2rem',
      paddingBottom: '4rem'
    },
    headerCard: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
      border: 'none',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)'
    },
    stepCard: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      background: '#ffffff'
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 32px',
      fontWeight: '600',
      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
    },
    secondaryBtn: {
      background: '#f3f4f6',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      fontWeight: '500',
      color: '#4b5563'
    },
    successBtn: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 32px',
      fontWeight: '600',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
    },
    photoCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.2s ease'
    },
    deleteBtn: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: '#ef4444',
      border: 'none',
      borderRadius: '50%',
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
    },
    stepBadge: {
      background: '#8b5cf6',
      color: 'white',
      padding: '6px 16px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: '600'
    },
    stepNumber: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: '1.1rem'
    },
    activeStep: {
      background: '#8b5cf6',
      color: 'white'
    },
    completedStep: {
      background: '#10b981',
      color: 'white'
    },
    pendingStep: {
      background: '#e5e7eb',
      color: '#9ca3af'
    },
    personCard: {
      background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)',
      border: '2px solid #ddd6fe',
      borderRadius: '16px',
      padding: '20px'
    },
    uploadZone: {
      border: '2px dashed #c4b5fd',
      borderRadius: '16px',
      padding: '40px',
      textAlign: 'center',
      background: '#faf5ff',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    albumCard: {
      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
      border: '2px solid #a7f3d0',
      borderRadius: '16px'
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  const showError = (msg) => { setError(msg); setLoading(false); };
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 5000); };
  const clearMessages = () => { setError(null); setSuccess(null); };
  

  const getAuthHeaders = async (contentType = 'multipart/form-data') => {
    const token = await getToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType
      }
    };
  };

  // Background processing
  const moveToBackground = () => {
    setIsProcessingInBackground(true);
    saveProcessingState();
    setProcessingNotification({
      type: 'info',
      message: '✅ Processing moved to background! You can browse the website. Click "Album Builder" anytime to check progress.'
    });
    
    // Show notification for 3 seconds then navigate to dashboard
    setTimeout(() => {
      setProcessingNotification(null);
      navigate('/client/dashboard');
    }, 3000);
  };

  const showCompletionNotification = () => {
    clearProcessingState();
    setIsProcessingInBackground(false);
    setProcessingNotification({
      type: 'success',
      message: '🎉 Albums are ready! Click "View Albums" to see your organized photos.'
    });
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('BookYourShoot - Albums Ready!', {
        body: `${albums?.albums_created || 0} albums created!`,
        icon: '/logo.png'
      });
    }
  };

  // ============================================================================
  // STEP 0: START SESSION
  // ============================================================================
  
  const startSession = async () => {
    // Check if there's already an active session
    const savedState = loadProcessingState();
    if (savedState && savedState.isProcessingInBackground) {
      showError('⚠️ An album is already being processed! Please wait for it to complete or cancel the current session.');
      // Restore the existing session
      setCurrentStep(savedState.currentStep);
      setProgress(savedState.progress);
      setProgressText(savedState.progressText || 'Processing...');
      setIsProcessingInBackground(true);
      return;
    }
    
    clearMessages();
    setLoading(true);
    
    // Reset all progress state
    setProgress(0);
    setProgressText('');
    setProcessedCount(0);
    setEstimatedTime(0);
    setIsProcessingInBackground(false);
    setProcessingNotification(null);
    clearProcessingState();
    
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_BASE}/start-session`,
        {},
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      
      setSessionId(response.data.session_id);
      setCurrentStep(1);
      showSuccess('Session started! Add people you want to find in your photos.');
      
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // STEP 1: PEOPLE MANAGEMENT
  // ============================================================================
  
  const handlePersonPhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // STRICT MODE: Exactly 4 photos per person
    const selectedFiles = files.slice(0, 4);
    
    // Revoke old previews if exist
    if (currentPersonPreviews.length > 0) {
      currentPersonPreviews.forEach(url => URL.revokeObjectURL(url));
    }
    
    setCurrentPersonFiles(selectedFiles);
    
    // Create previews
    const previews = selectedFiles.map(file => URL.createObjectURL(file));
    setCurrentPersonPreviews(previews);
  };
  
  const clearCurrentPersonPhoto = () => {
    // Revoke preview URLs
    currentPersonPreviews.forEach(url => URL.revokeObjectURL(url));
    setCurrentPersonFiles([]);
    setCurrentPersonPreviews([]);
    // Clear file input
    if (personFileInputRef.current) {
      personFileInputRef.current.value = '';
    }
  };
  
  const addPerson = () => {
    if (!currentPersonName.trim()) {
      showError('Please enter a name for this person');
      return;
    }
    if (currentPersonFiles.length < 1 || currentPersonFiles.length > 4) {
      showError('Please select 1-4 photos per person');
      return;
    }
    if (people.length >= 4) {
      showError('Maximum 4 people allowed per session');
      return;
    }
    
    // Add person to list (max 4 people)
    setPeople([...people, {
      name: currentPersonName.trim(),
      files: currentPersonFiles,
      previews: currentPersonPreviews
    }]);
    
    // Reset current person form
    setCurrentPersonName('');
    setCurrentPersonFiles([]);
    setCurrentPersonPreviews([]);
    // Clear file input
    if (personFileInputRef.current) {
      personFileInputRef.current.value = '';
    }
    
    showSuccess(`Added ${currentPersonName}! You can add more people or proceed.`);
  };
  
  const removePerson = (index) => {
    const newPeople = [...people];
    // Revoke preview URLs
    newPeople[index].previews.forEach(url => URL.revokeObjectURL(url));
    newPeople.splice(index, 1);
    setPeople(newPeople);
  };
  
  const replacePersonPhoto = (index, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    const newPeople = [...people];
    
    // Revoke old preview
    newPeople[index].previews.forEach(url => URL.revokeObjectURL(url));
    
    // Create new preview
    const preview = URL.createObjectURL(selectedFile);
    newPeople[index].files = [selectedFile];
    newPeople[index].previews = [preview];
    
    setPeople(newPeople);
    showSuccess(`Photo updated for ${newPeople[index].name}!`);
  };
  
  const preprocessReferences = async () => {
    if (people.length === 0) {
      showError('Add at least one person first');
      return;
    }
    
    clearMessages();
    setLoading(true);
    setProgress(0);
    setProgressText('Preparing reference photos...');
    
    try {
      const formData = new FormData();
      const personNames = [];
      
      // Add all files from all people
      people.forEach((person) => {
        personNames.push(person.name);
        person.files.forEach((file) => {
          formData.append('reference_files', file);
        });
      });
      
      formData.append('person_names', JSON.stringify(personNames));
      
      setProgress(30);
      setProgressText('Processing faces...');
      
      const response = await axios.post(
        `${API_BASE}/upload-references/${sessionId}`,
        formData,
        await getAuthHeaders()
      );
      
      setProgress(100);
      setProgressText('References processed!');
      setReferencesProcessed(true);
      
      showSuccess(`${response.data.people_registered} people registered successfully!`);
      
      // Auto-advance to step 2 after a short delay
      setTimeout(() => {
        setCurrentStep(2);
        setProgress(0);
        setProgressText('');
      }, 1500);
      
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to process references');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // STEP 2: EVENT PHOTOS
  // ============================================================================
  
  const handleEventPhotosSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Limit to 1000 photos
    const selectedFiles = files.slice(0, 1000);
    setEventFiles(selectedFiles);
    setEventFilesCount(selectedFiles.length);
    
    // Create previews (only first 50 for performance)
    const previewFiles = selectedFiles.slice(0, 50);
    const previews = previewFiles.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setEventPreviews(previews);
  };
  
  const removeEventPhoto = (index) => {
    const newFiles = [...eventFiles];
    const newPreviews = [...eventPreviews];
    
    if (index < newPreviews.length) {
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
    }
    newFiles.splice(index, 1);
    
    setEventFiles(newFiles);
    setEventFilesCount(newFiles.length);
    setEventPreviews(newPreviews);
  };
  
  const processEventPhotos = async () => {
    if (eventFiles.length < 20) {
      showError('Please upload at least 20 event photos');
      return;
    }
    
    clearMessages();
    setLoading(true);
    setProgress(0);
    setProgressText('Uploading event photos...');
    setIsProcessingInBackground(false);
    
    // Calculate estimated time (0.5s per photo)
    const totalEstimate = Math.ceil(eventFiles.length * 0.5);
    setEstimatedTime(totalEstimate);
    setProcessedCount(0);
    
    try {
      const formData = new FormData();
      eventFiles.forEach(file => formData.append('event_files', file));
      
      setProgress(20);
      setProgressText(`Processing ${eventFiles.length} photos...`);
      setProcessedCount(Math.floor(eventFiles.length * 0.2));
      
      const response = await axios.post(
        `${API_BASE}/upload-events/${sessionId}`,
        formData,
        await getAuthHeaders()
      );
      
      setProgress(50);
      setProgressText('Running AI face recognition...');
      setProcessedCount(Math.floor(eventFiles.length * 0.5));
      
      // Now build albums
      const token = await getToken();
      const buildResponse = await axios.post(
        `${API_BASE}/build-album/${sessionId}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      
      setProgress(90);
      setProgressText('Organizing albums...');
      setProcessedCount(Math.floor(eventFiles.length * 0.9));
      
      setAlbums(buildResponse.data);
      setEventsProcessed(true);
      
      setProgress(100);
      setProgressText('Albums ready!');
      setProcessedCount(eventFiles.length);
      
      // Show completion notification if background processing
      if (isProcessingInBackground) {
        showCompletionNotification();
      } else {
        showSuccess(`Created ${buildResponse.data.albums_created} albums with ${buildResponse.data.photos_organized} photos!`);
      }
      
      setTimeout(() => {
        setCurrentStep(3);
        setProgress(0);
        setProgressText('');
        setEstimatedTime(0);
        setProcessedCount(0);
      }, 1500);
      
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to process photos');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // STEP 3: VIEW & DOWNLOAD
  // ============================================================================
  
  // STEP 3: VIEW & DOWNLOAD
  const fetchAlbumPhotos = async (personName) => {
    try {
      setLoadingPhotos(true);
      const token = await getToken();
      const response = await axios.get(
        `${API_BASE}/album-photos/${sessionId}/${encodeURIComponent(personName)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setAlbumPhotos(response.data.photos);
        setSelectedAlbum(personName);
        setPhotosToRemove([]);
      }
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to load album photos');
      setAlbumPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };
  
  const togglePhotoRemoval = (filename) => {
    setPhotosToRemove(prev => {
      if (prev.includes(filename)) {
        return prev.filter(f => f !== filename);
      } else {
        return [...prev, filename];
      }
    });
  };
  
  const downloadAlbums = async () => {
    try {
      setLoading(true);
      setProgressText('Preparing download...');
      
      const token = await getToken();
      const response = await axios.get(
        `${API_BASE}/download-albums/${sessionId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `My_AI_Albums.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showSuccess('Albums downloaded!');
      
    } catch (err) {
      showError(err.response?.data?.detail || 'Download failed');
    } finally {
      setLoading(false);
      setProgressText('');
    }
  };
  
  const cancelSession = async () => {
    if (!window.confirm('Are you sure you want to cancel? All progress will be lost.')) {
      return;
    }
    
    // Cleanup old session
    if (sessionId) {
      try {
        const token = await getToken();
        await axios.delete(
          `${API_BASE}/cleanup-session/${sessionId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (e) { /* ignore */ }
    }
    
    // Reset all state
    setSessionId(null);
    setCurrentStep(0);
    setPeople([]);
    setCurrentPersonName('');
    setCurrentPersonFiles([]);
    setCurrentPersonPreviews([]);
    setReferencesProcessed(false);
    setEventFiles([]);
    setEventFilesCount(0);
    setEventPreviews([]);
    setEventsProcessed(false);
    setAlbums(null);
    setProgress(0);
    setProgressText('');
    setProcessedCount(0);
    setEstimatedTime(0);
    setIsProcessingInBackground(false);
    setProcessingNotification(null);
    setLoading(false);
    clearProcessingState();
    clearMessages();
    showSuccess('Session cancelled successfully');
  };
  
  const startNewSession = async () => {
    // Cleanup old session
    if (sessionId) {
      try {
        const token = await getToken();
        await axios.delete(
          `${API_BASE}/cleanup-session/${sessionId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (e) { /* ignore */ }
    }
    
    // Reset all state
    setSessionId(null);
    setCurrentStep(0);
    setPeople([]);
    setCurrentPersonName('');
    setCurrentPersonFiles([]);
    setCurrentPersonPreviews([]);
    setReferencesProcessed(false);
    setEventFiles([]);
    setEventFilesCount(0);
    setEventPreviews([]);
    setEventsProcessed(false);
    setAlbums(null);
    setProgress(0);
    setProgressText('');
    setProcessedCount(0);
    setEstimatedTime(0);
    setIsProcessingInBackground(false);
    setProcessingNotification(null);
    setSelectedAlbum(null);
    setPhotosToRemove([]);
    setLoading(false);
    clearMessages();
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  
  const goToStep = (step) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================
  
  const renderStepIndicator = () => (
    <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
      {[1, 2, 3].map((step) => {
        let stepStyle = styles.pendingStep;
        if (step < currentStep || (step === 1 && referencesProcessed) || (step === 2 && eventsProcessed)) {
          stepStyle = styles.completedStep;
        } else if (step === currentStep) {
          stepStyle = styles.activeStep;
        }
        
        return (
          <React.Fragment key={step}>
            <div
              style={{ ...styles.stepNumber, ...stepStyle, cursor: step < currentStep ? 'pointer' : 'default' }}
              onClick={() => goToStep(step)}
            >
              {step < currentStep ? '✓' : step}
            </div>
            {step < 3 && (
              <div style={{
                width: '60px',
                height: '3px',
                background: step < currentStep ? '#10b981' : '#e5e7eb',
                borderRadius: '2px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div style={styles.pageContainer}>
      <Container>
        <Row className="justify-content-center">
          <Col xl={10} lg={11}>
            
            {/* Header */}
            <Card style={styles.headerCard} className="mb-4">
              <Card.Body className="text-white text-center py-4">
                <h2 className="mb-2 fw-bold">✨ AI Album Builder</h2>
                <p className="mb-0 opacity-90">Automatically organize your photos by faces</p>
              </Card.Body>
            </Card>
            
            {/* Step Indicator (show after step 0) */}
            {currentStep > 0 && renderStepIndicator()}
            
            {/* Alerts */}
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="border-0" style={{ borderRadius: '12px' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="border-0" style={{ borderRadius: '12px' }}>
                {success}
              </Alert>
            )}
            
            {/* Notification Banner */}
            {processingNotification && (
              <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                background: processingNotification.type === 'success' ? '#10b981' : '#3b82f6',
                color: 'white',
                zIndex: 99999,
                maxWidth: '400px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <span className="flex-grow-1">{processingNotification.message}</span>
                {processingNotification.type === 'success' && (
                  <Button 
                    size="sm" 
                    variant="light"
                    onClick={() => { setCurrentStep(3); setProcessingNotification(null); }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    View Albums
                  </Button>
                )}
                <button
                  onClick={() => setProcessingNotification(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '24px',
                    height: '24px'
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* ============ STEP 0: WELCOME ============ */}
            {currentStep === 0 && (
              <Card style={styles.stepCard}>
                <Card.Body className="p-5">
                  <div className="text-center mb-5">
                    <div className="mb-4">
                      <span style={{ fontSize: '4rem' }}>📸</span>
                    </div>
                    <h3 className="fw-bold mb-3" style={{ color: '#1f2937' }}>Create Smart Photo Albums</h3>
                    <p className="text-muted mb-0">Our AI recognizes faces and organizes your photos automatically</p>
                  </div>
                  
                  {/* How it works */}
                  <div className="mb-5">
                    <h5 className="fw-bold mb-4 text-center" style={{ color: '#4b5563' }}>How It Works</h5>
                    <Row className="g-4">
                      <Col md={4}>
                        <div className="text-center p-4" style={{ background: '#faf5ff', borderRadius: '16px' }}>
                          <div className="mb-3" style={{ fontSize: '2.5rem' }}>👤</div>
                          <h6 className="fw-bold mb-2" style={{ color: '#7c3aed' }}>1. Add People</h6>
                          <p className="text-muted small mb-0">Upload <strong>1-4 photos per person</strong> (Min: 1, Max: 4 people)</p>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-center p-4" style={{ background: '#f0fdf4', borderRadius: '16px' }}>
                          <div className="mb-3" style={{ fontSize: '2.5rem' }}>🖼️</div>
                          <h6 className="fw-bold mb-2" style={{ color: '#059669' }}>2. Upload Event Photos</h6>
                          <p className="text-muted small mb-0">Add your photo collection (20-300 photos)</p>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-center p-4" style={{ background: '#fef3c7', borderRadius: '16px' }}>
                          <div className="mb-3" style={{ fontSize: '2.5rem' }}>🎉</div>
                          <h6 className="fw-bold mb-2" style={{ color: '#d97706' }}>3. Get Your Albums</h6>
                          <p className="text-muted small mb-0">View organized albums & download instantly</p>
                        </div>
                      </Col>
                    </Row>
                  </div>
                  
                  {/* Tips */}
                  <div className="mb-5 p-4" style={{ background: '#f3f4f6', borderRadius: '16px' }}>
                    <h6 className="fw-bold mb-3" style={{ color: '#4b5563' }}>
                      💡 Tips for Best Results (STRICT Mode)
                    </h6>
                    <Row>
                      <Col md={6}>
                        <ul className="text-muted small mb-0">
                          <li><strong>Upload 1-4 photos per person</strong></li>
                          <li><strong>EXACTLY 1 face per photo</strong> (no group photos)</li>
                          <li>Clear, front-facing photos work best</li>
                        </ul>
                      </Col>
                      <Col md={6}>
                        <ul className="text-muted small mb-0">
                          <li><strong>Max 4 people per session</strong></li>
                          <li>Good lighting helps AI recognition</li>
                          <li>Higher quality photos = better accuracy</li>
                        </ul>
                      </Col>
                    </Row>
                  </div>
                  
                  {/* Start Button */}
                  <div className="text-center">
                    <Button
                      style={styles.primaryBtn}
                      size="lg"
                      onClick={startSession}
                      disabled={loading}
                      className="px-5"
                    >
                      {loading ? (
                        <><Spinner size="sm" className="me-2" />Starting...</>
                      ) : (
                        <>🚀 Start Album Builder</>
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* ============ STEP 1: ADD PEOPLE ============ */}
            {currentStep === 1 && (
              <Card style={styles.stepCard}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h4 className="fw-bold mb-1" style={{ color: '#1f2937' }}>Add People to Find</h4>
                      <p className="text-muted mb-0"><strong>STRICT MODE:</strong> Upload <strong>1-4 photos per person</strong> (Min: 1, Max: 4 people)</p>
                    </div>
                    <Badge style={styles.stepBadge}>Step 1 of 3</Badge>
                  </div>
                  
                  {/* Added People List */}
                  {people.length > 0 && (
                    <div className="mb-4">
                      <h6 className="fw-semibold mb-3" style={{ color: '#4b5563' }}>
                        👥 Added People ({people.length}/4)
                      </h6>
                      <Row className="g-3">
                        {people.map((person, index) => (
                          <Col md={12} lg={6} key={index}>
                            <div style={styles.personCard}>
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="mb-0 fw-bold" style={{ color: '#7c3aed' }}>{person.name}</h6>
                                <Button
                                  variant="link"
                                  className="text-danger p-0"
                                  onClick={() => removePerson(index)}
                                  title="Remove person"
                                >
                                  ✕
                                </Button>
                              </div>
                              <div className="d-flex gap-2 mb-2 flex-wrap">
                                {person.previews.map((preview, idx) => (
                                  <img
                                    key={idx}
                                    src={preview}
                                    alt={`${person.name} photo ${idx + 1}`}
                                    style={{
                                      width: '70px',
                                      height: '70px',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      border: '2px solid #ddd6fe'
                                    }}
                                  />
                                ))}
                              </div>
                              <small className="text-success fw-semibold d-block">✅ {person.previews.length} photos - Ready</small>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                  
                  {/* Add New Person Form */}
                  {!referencesProcessed && (
                    <div className="p-4 mb-4" style={{ background: '#faf5ff', borderRadius: '16px', border: '2px solid #e9d5ff' }}>
                      <h6 className="fw-semibold mb-3" style={{ color: '#7c3aed' }}>
                        ➕ Add New Person
                      </h6>
                      
                      <Alert variant="info" className="mb-3 small">
                        ✅ Each photo must have <strong>EXACTLY 1 face</strong> (no group photos)<br/>
                        ✅ Clear, front-facing photos work best
                      </Alert>
                      
                      <Row className="g-3 align-items-end">
                        <Col md={4}>
                          <Form.Label className="small fw-semibold text-muted">Person's Name</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g., Anna, Azlaan"
                            value={currentPersonName}
                            onChange={(e) => setCurrentPersonName(e.target.value)}
                            style={{ borderRadius: '10px', border: '2px solid #e5e7eb' }}
                          />
                        </Col>
                        <Col md={5}>
                          <Form.Label className="small fw-semibold text-muted">Photos (1-4 per person)</Form.Label>
                          <Form.Control
                            type="file"
                            accept="image/*"
                            multiple
                            ref={personFileInputRef}
                            onChange={handlePersonPhotoSelect}
                            style={{ borderRadius: '10px', border: '2px solid #e5e7eb' }}
                          />
                        </Col>
                        <Col md={3}>
                          <Button
                            style={styles.primaryBtn}
                            onClick={addPerson}
                            disabled={!currentPersonName.trim() || currentPersonFiles.length < 1 || currentPersonFiles.length > 4 || people.length >= 4}
                            className="w-100"
                          >
                            ➕ Add Person
                          </Button>
                        </Col>
                      </Row>
                      
                      {/* Current Person Photo Preview */}
                      {currentPersonPreviews.length > 0 && (
                        <div className="mt-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <small className="text-success fw-semibold">✅ Selected Photos: {currentPersonPreviews.length}</small>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-danger p-0"
                              onClick={clearCurrentPersonPhoto}
                              title="Remove all photos"
                            >
                              ✕ Remove All
                            </Button>
                          </div>
                          <div className="d-flex gap-2 mt-2 flex-wrap">
                            {currentPersonPreviews.map((preview, idx) => (
                              <img
                                key={idx}
                                src={preview}
                                alt={`Preview ${idx + 1}`}
                                style={{
                                  width: '100px',
                                  height: '100px',
                                  objectFit: 'cover',
                                  borderRadius: '10px',
                                  border: '3px solid #10b981'
                                }}
                              />
                            ))}
                          </div>
                          <small className="text-success d-block mt-2">
                            ✅ {currentPersonPreviews.length} photo{currentPersonPreviews.length > 1 ? 's' : ''} selected - Ready to add!
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-2">
                      <Button style={styles.secondaryBtn} onClick={() => setCurrentStep(0)}>
                        ← Back
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        onClick={cancelSession}
                        style={{ borderRadius: '10px', fontSize: '14px' }}
                      >
                        ✕ Cancel Session
                      </Button>
                    </div>
                    
                    <Button
                      style={styles.successBtn}
                      onClick={preprocessReferences}
                      disabled={loading || people.length === 0}
                    >
                      {loading ? (
                        <><Spinner size="sm" className="me-2" />Processing...</>
                      ) : (
                        <>Process & Continue →</>
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* ============ STEP 2: EVENT PHOTOS ============ */}
            {currentStep === 2 && (
              <Card style={styles.stepCard}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h4 className="fw-bold mb-1" style={{ color: '#1f2937' }}>Upload Event Photos</h4>
                        <p className="text-muted mb-0">Add your photo collection to search (20-300 photos)</p>
                      </div>
                      <Badge style={styles.stepBadge}>Step 2 of 3</Badge>
                    </div>
                  
                  {/* People Summary */}
                  <div className="mb-4 p-3" style={{ background: '#f0fdf4', borderRadius: '12px', border: '2px solid #a7f3d0' }}>
                    <div className="d-flex align-items-center">
                      <span className="me-2">✅</span>
                      <span className="fw-semibold" style={{ color: '#059669' }}>
                        Looking for: {people.map(p => p.name).join(', ')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Upload Zone */}
                  <div style={styles.uploadZone} className="mb-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEventPhotosSelect}
                      style={{ display: 'none' }}
                      id="eventPhotosInput"
                    />
                    <label htmlFor="eventPhotosInput" style={{ cursor: 'pointer' }}>
                      <div className="mb-3" style={{ fontSize: '3rem' }}>📁</div>
                      <h5 className="fw-bold mb-2" style={{ color: '#7c3aed' }}>
                        {eventFiles.length > 0 ? `${eventFiles.length} photos selected` : 'Click to Select Photos'}
                      </h5>
                      <p className="text-muted mb-0">
                        {eventFiles.length > 0 
                          ? `${(eventFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(2)} MB total`
                          : 'Select 20-300 photos from your event'
                        }
                      </p>
                    </label>
                  </div>
                  
                  {/* Photo Preview Grid */}
                  {eventPreviews.length > 0 && (
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-semibold mb-0" style={{ color: '#4b5563' }}>
                          🖼️ Photo Preview ({eventFiles.length} total)
                        </h6>
                        <small className="text-muted">Click ✕ to remove unwanted photos</small>
                      </div>
                      <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {eventPreviews.map((preview, index) => (
                          <div key={index} style={{ ...styles.photoCard, width: '100px', height: '100px' }}>
                            <img
                              src={preview.url}
                              alt={preview.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                              style={styles.deleteBtn}
                              onClick={() => removeEventPhoto(index)}
                            >
                              <span style={{ color: 'white', fontSize: '12px' }}>✕</span>
                            </button>
                          </div>
                        ))}
                        {eventFiles.length > 50 && (
                          <div style={{
                            width: '100px',
                            height: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f3f4f6',
                            borderRadius: '12px',
                            border: '2px dashed #d1d5db'
                          }}>
                            <span className="text-muted fw-semibold">+{eventFiles.length - 50} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Section - INSIDE CARD */}
                  {progress > 0 && loading && (
                    <div className="mb-4 p-4" style={{
                      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                      borderRadius: '16px',
                      border: '2px solid #bae6fd'
                    }}>
                      <div className="text-center mb-3">
                        <h6 className="fw-bold mb-2" style={{ color: '#0284c7' }}>
                          {progressText}
                        </h6>
                        <div className="d-flex justify-content-center gap-4 text-muted small">
                          <span>📊 {processedCount} / {eventFiles.length} processed</span>
                          <span>⏱️ Estimated time: {Math.ceil((eventFiles.length - processedCount) * 0.5)}s</span>
                        </div>
                      </div>
                      
                      <ProgressBar 
                        now={progress} 
                        variant="info"
                        animated
                        style={{ height: '24px', borderRadius: '12px', marginBottom: '20px' }}
                        label={`${Math.round(progress)}%`}
                      />
                      
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <Button 
                          style={styles.secondaryBtn}
                          size="sm"
                          onClick={() => setCurrentStep(1)}
                          disabled={loading}
                        >
                          ← Back to People
                        </Button>
                        <Button 
                          variant="danger"
                          size="sm"
                          onClick={cancelSession}
                          style={{ borderRadius: '8px', padding: '8px 16px' }}
                        >
                          ✕ Cancel Session
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons - Only show when NOT processing */}
                  {!loading && (
                    <>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex gap-2">
                          <Button style={styles.secondaryBtn} onClick={() => setCurrentStep(1)}>
                            ← Back to People
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            onClick={cancelSession}
                            style={{ borderRadius: '10px', fontSize: '14px' }}
                          >
                            ✕ Cancel Session
                          </Button>
                        </div>
                        
                        <Button
                          style={styles.successBtn}
                          onClick={processEventPhotos}
                          disabled={eventFiles.length < 20}
                        >
                          🤖 Build Albums
                        </Button>
                      </div>
                      
                      {eventFiles.length > 0 && eventFiles.length < 20 && (
                        <div className="text-center mt-3">
                          <small className="text-danger">
                            ⚠️ Need at least 20 photos ({20 - eventFiles.length} more required)
                          </small>
                        </div>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* ============ STEP 3: RESULTS ============ */}
            {currentStep === 3 && (
              <Card style={styles.stepCard}>
                <Card.Body className="p-4">
                  <div className="text-center mb-4">
                    <div className="mb-3" style={{ fontSize: '4rem' }}>🎉</div>
                    <h3 className="fw-bold mb-2" style={{ color: '#1f2937' }}>Your Albums Are Ready!</h3>
                    <p className="text-muted">AI has organized your photos by person</p>
                  </div>
                  
                  {/* Results Summary */}
                  {albums && (
                    <div className="mb-4">
                      <Row className="g-3 justify-content-center">
                        <Col md={4}>
                          <div className="text-center p-4" style={{ background: '#faf5ff', borderRadius: '16px' }}>
                            <h2 className="fw-bold mb-1" style={{ color: '#7c3aed' }}>{albums.albums_created}</h2>
                            <p className="text-muted mb-0">Albums Created</p>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="text-center p-4" style={{ background: '#f0fdf4', borderRadius: '16px' }}>
                            <h2 className="fw-bold mb-1" style={{ color: '#059669' }}>{albums.photos_organized}</h2>
                            <p className="text-muted mb-0">Photos Organized</p>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="text-center p-4" style={{ background: '#fef3c7', borderRadius: '16px' }}>
                            <h2 className="fw-bold mb-1" style={{ color: '#d97706' }}>{albums.processing_time_seconds}s</h2>
                            <p className="text-muted mb-0">Processing Time</p>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                  
                  {/* Album Breakdown - UPDATED WITH VIEW & DOWNLOAD */}
                  {albums?.album_breakdown && (
                    <div className="mb-4">
                      <h5 className="fw-bold mb-4 text-center" style={{ color: '#059669' }}>
                        📂 Your Albums
                      </h5>
                      <Row className="g-4">
                        {Object.entries(albums.album_breakdown).map(([person, count]) => (
                          <Col md={selectedAlbum === person ? 12 : 6} lg={selectedAlbum === person ? 12 : 4} key={person}>
                            <Card style={{
                              border: '2px solid #d1fae5',
                              borderRadius: '16px',
                              overflow: 'hidden',
                              transition: 'transform 0.3s, box-shadow 0.3s'
                            }}
                            className="h-100"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-5px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}>
                              <Card.Header style={{ 
                                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                                border: 'none',
                                padding: '15px'
                              }}>
                                <div className="d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center">
                                    <div style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      background: person === 'Unknown' ? '#fef3c7' : '#ddd6fe',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginRight: '12px'
                                    }}>
                                      <span>{person === 'Unknown' ? '❓' : '👤'}</span>
                                    </div>
                                    <h6 className="fw-bold mb-0" style={{ color: '#1f2937' }}>{person}</h6>
                                  </div>
                                  <Badge style={{ background: '#10b981', padding: '6px 12px', borderRadius: '20px' }}>
                                    {count} photos
                                  </Badge>
                                </div>
                              </Card.Header>
                              <Card.Body className="p-3">
                                <div className="d-flex gap-2">
                                  <Button
                                    style={{
                                      ...styles.primaryBtn,
                                      flex: 1,
                                      padding: '10px',
                                      fontSize: '14px'
                                    }}
                                    size="sm"
                                    onClick={() => {
                                      if (selectedAlbum === person) {
                                        setSelectedAlbum(null);
                                        setAlbumPhotos([]);
                                        setPhotosToRemove([]);
                                      } else {
                                        fetchAlbumPhotos(person);
                                      }
                                    }}
                                    disabled={loadingPhotos}
                                  >
                                    {loadingPhotos && selectedAlbum !== person ? <Spinner size="sm" /> : selectedAlbum === person ? '✕ Close' : '👁️ View Album'}
                                  </Button>
                                  <Button
                                    style={{
                                      ...styles.successBtn,
                                      flex: 1,
                                      padding: '10px',
                                      fontSize: '14px'
                                    }}
                                    size="sm"
                                    onClick={() => downloadAlbums(person)}
                                  >
                                    ⬇️ Download
                                  </Button>
                                </div>
                                
                                {/* ALBUM VIEWER WITH ACTUAL PHOTOS */}
                                {selectedAlbum === person && (
                                  <div className="mt-3 p-4" style={{
                                    background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
                                    borderRadius: '12px',
                                    border: '2px solid #e5e7eb'
                                  }}>
                                    <div className="text-center mb-4">
                                      <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
                                      <h6 className="fw-bold mb-3">{person}'s Album</h6>
                                      <div className="p-3 mb-3" style={{
                                        background: '#ecfdf5',
                                        borderRadius: '10px',
                                        border: '2px solid #a7f3d0'
                                      }}>
                                        <div className="fw-semibold" style={{ color: '#059669' }}>
                                          ✅ {albumPhotos.length} photos organized
                                          {photosToRemove.length > 0 && ` (${photosToRemove.length} marked for removal)`}
                                        </div>
                                        <small className="text-muted">
                                          Click photos to mark for removal before downloading
                                        </small>
                                      </div>
                                    </div>
                                    
                                    {/* Photo Grid */}
                                    {loadingPhotos ? (
                                      <div className="text-center py-5">
                                        <Spinner animation="border" variant="primary" />
                                        <p className="mt-3 text-muted">Loading photos...</p>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="row g-3 mb-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                          {albumPhotos.map((photo, idx) => {
                                            const isMarkedForRemoval = photosToRemove.includes(photo.filename);
                                            return (
                                              <div className="col-6 col-sm-4 col-md-3" key={idx}>
                                                <div 
                                                  onClick={() => togglePhotoRemoval(photo.filename)}
                                                  style={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: isMarkedForRemoval ? '3px solid #ef4444' : '2px solid #e5e7eb',
                                                    opacity: isMarkedForRemoval ? 0.5 : 1,
                                                    transition: 'all 0.3s'
                                                  }}
                                                >
                                                  <img 
                                                    src={photo.thumbnail} 
                                                    alt={`Photo ${idx + 1}`}
                                                    style={{
                                                      width: '100%',
                                                      height: '180px',
                                                      objectFit: 'cover'
                                                    }}
                                                  />
                                                  {isMarkedForRemoval && (
                                                    <div style={{
                                                      position: 'absolute',
                                                      top: '50%',
                                                      left: '50%',
                                                      transform: 'translate(-50%, -50%)',
                                                      background: 'rgba(239, 68, 68, 0.9)',
                                                      color: 'white',
                                                      padding: '5px 10px',
                                                      borderRadius: '6px',
                                                      fontSize: '12px',
                                                      fontWeight: 'bold'
                                                    }}>
                                                      ✕ REMOVE
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        
                                        {photosToRemove.length > 0 && (
                                          <div className="alert alert-warning mb-3">
                                            <strong>⚠️ Warning:</strong> {photosToRemove.length} photo(s) marked for removal. 
                                            These will NOT be included in the download.
                                            <Button 
                                              variant="link" 
                                              size="sm" 
                                              onClick={() => setPhotosToRemove([])}
                                              className="ms-2"
                                            >
                                              Clear All
                                            </Button>
                                          </div>
                                        )}
                                        
                                        <div className="d-flex gap-2">
                                          <Button
                                            style={{...styles.successBtn, flex: 1}}
                                            onClick={() => downloadAlbums(person)}
                                          >
                                            ⬇️ Download Album ({albumPhotos.length - photosToRemove.length} photos)
                                          </Button>
                                          <Button
                                            variant="secondary"
                                            onClick={() => {
                                              setSelectedAlbum(null);
                                              setAlbumPhotos([]);
                                              setPhotosToRemove([]);
                                            }}
                                          >
                                            Close
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="d-flex justify-content-center gap-3">
                    <Button
                      style={styles.successBtn}
                      size="lg"
                      onClick={downloadAlbums}
                      disabled={loading}
                    >
                      {loading ? (
                        <><Spinner size="sm" className="me-2" />Preparing...</>
                      ) : (
                        <>📥 Download Albums (ZIP)</>
                      )}
                    </Button>
                    
                    <Button
                      style={styles.secondaryBtn}
                      size="lg"
                      onClick={startNewSession}
                    >
                      🔄 Create New Album
                    </Button>
                  </div>
                  
                  {/* Go Back Options */}
                  <div className="text-center mt-4">
                    <small className="text-muted">
                      <span 
                        className="text-primary" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setCurrentStep(2)}
                      >
                        ← Back to event photos
                      </span>
                      <span className="mx-2">|</span>
                      <span 
                        className="text-primary" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setCurrentStep(1)}
                      >
                        ← Back to people
                      </span>
                    </small>
                  </div>
                </Card.Body>
              </Card>
            )}

          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default AlbumBuilderFresh;
