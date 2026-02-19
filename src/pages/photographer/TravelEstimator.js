import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { travelAPI } from '../../api/api';

const TravelEstimator = () => {
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimateError, setEstimateError] = useState('');

  useEffect(() => {
    const fetchCities = async () => {
      setCitiesLoading(true);
      setCitiesError('');
      try {
        const response = await travelAPI.getCities();
        setCities(response.data || []);
      } catch (error) {
        setCitiesError(error.message || 'Failed to load cities');
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchCities();
  }, []);

  const calculateTravelCost = async () => {
    if (!fromCity || !toCity) {
      alert('Please select both departure and destination cities');
      return;
    }

    setLoading(true);
    setEstimate(null);
    setEstimateError('');

    try {
      const response = await travelAPI.estimate({
        from_city: fromCity,
        to_city: toCity,
        photographer_id: user?.id || undefined,
      });
      setEstimate(response.data);
    } catch (error) {
      setEstimateError(error.message || 'Failed to calculate travel cost');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="travel-estimator py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">🗺️ Travel Cost Estimator</h1>
              <p className="mb-0">Calculate accurate travel costs for photography assignments across Pakistan</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white">
                <div className="small opacity-75">Pricing Engine</div>
                <div className="h5 fw-bold">Bus First, Calculate Second</div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Estimator Form */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">📍 Trip Details</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Departure City *</label>
                      <select 
                        className="form-select"
                        value={fromCity}
                        onChange={(e) => setFromCity(e.target.value)}
                        disabled={citiesLoading}
                      >
                        <option value="">Select departure city</option>
                        {cities.map(city => (
                          <option key={city.name} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Destination City *</label>
                      <select 
                        className="form-select"
                        value={toCity}
                        onChange={(e) => setToCity(e.target.value)}
                        disabled={citiesLoading}
                      >
                        <option value="">Select destination city</option>
                        {cities.map(city => (
                          <option key={city.name} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {citiesError && (
                  <div className="alert alert-warning small">
                    {citiesError}
                  </div>
                )}

                {user?.id && (
                  <div className="alert alert-info small">
                    Your travel rates will be applied to this estimate.
                  </div>
                )}

                <button 
                  className="btn btn-primary w-100 btn-lg"
                  onClick={calculateTravelCost}
                  disabled={loading || !fromCity || !toCity}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Calculating...
                    </>
                  ) : (
                    '🧮 Calculate Travel Cost'
                  )}
                </button>
              </div>
            </div>

            {/* Service Level Comparison */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">📊 Pricing Notes</h6>
              </div>
              <div className="card-body">
                <div className="small">
                  <div className="mb-2">• Known bus fares are used when available</div>
                  <div className="mb-2">• Otherwise, distance-based rates are applied</div>
                  <div className="mb-2">• Local taxi and handling fees are included</div>
                  <div>• Overnight stay added for long trips</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="col-lg-6">
            {estimate ? (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">💰 Cost Breakdown</h5>
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-center mb-4">
                    <div className="text-muted small">Round Trip Total</div>
                    <div className="h2 fw-bold text-primary">PKR {estimate.estimates.round_trip.total.toLocaleString()}</div>
                    <div className="text-muted small">
                      {estimate.distance_km} km • {estimate.duration_display}
                    </div>
                    <div className="text-muted small">Source: {estimate.source}</div>
                  </div>

                  <div className="cost-breakdown">
                    <div className="mb-3 p-3 bg-light rounded">
                      <div className="fw-semibold mb-2">One Way</div>
                      {estimate.estimates.one_way.breakdown.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="d-flex justify-content-between small mb-1">
                          <span>{item.label}</span>
                          <span>PKR {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between mt-2 border-top pt-2">
                        <span className="fw-semibold">Total</span>
                        <span className="fw-semibold">PKR {estimate.estimates.one_way.total.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mb-3 p-3 bg-light rounded">
                      <div className="fw-semibold mb-2">Round Trip</div>
                      {estimate.estimates.round_trip.breakdown.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="d-flex justify-content-between small mb-1">
                          <span>{item.label}</span>
                          <span>PKR {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between mt-2 border-top pt-2">
                        <span className="fw-semibold">Total</span>
                        <span className="fw-semibold">PKR {estimate.estimates.round_trip.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-info small mt-4">
                    <strong>💡 Note:</strong> This is an estimate. Final cost may vary based on actual travel conditions.
                  </div>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body text-center py-5">
                  <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>🧮</div>
                  <h4 className="fw-bold mb-3">No Cost Estimate Yet</h4>
                  <p className="text-muted mb-4">
                    Fill in the trip details and click "Calculate Travel Cost" to see your estimate
                  </p>
                  {estimateError && (
                    <div className="alert alert-danger small">{estimateError}</div>
                  )}
                </div>
              </div>
            )}

            {/* Tips & Guidelines */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">💡 Travel Tips & Guidelines</h6>
              </div>
              <div className="card-body">
                <div className="small">
                  <div className="mb-3">
                    <h6 className="fw-semibold text-primary">📅 Booking in Advance</h6>
                    <ul className="list-unstyled text-muted">
                      <li>• Plan inter-city shoots at least 48 hours ahead</li>
                      <li>• Long trips can include accommodation fees</li>
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="fw-semibold text-primary">🚗 Distance Sources</h6>
                    <ul className="list-unstyled text-muted">
                      <li>• Bus fares are used when available</li>
                      <li>• OSRM estimates road distance when needed</li>
                      <li>• Local Punjab matrix and Haversine are fallbacks</li>
                    </ul>
                  </div>

                  <div className="alert alert-warning small">
                    <strong>⚠️ Important:</strong> Round-trip estimates include return travel. Weather and road conditions can affect final costs.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelEstimator;
