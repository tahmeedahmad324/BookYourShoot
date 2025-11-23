import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const TravelEstimator = () => {
  const { user } = useAuth();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [teamSize, setTeamSize] = useState(1);
  const [shootingDays, setShootingDays] = useState(1);
  const [needAccommodation, setNeedAccommodation] = useState(true);
  const [needEquipment, setNeedEquipment] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState('standard');
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock cities data for Punjab, Pakistan
  const cities = [
    { id: 1, name: "Lahore", lat: 31.5204, lng: 74.3587, province: "Punjab" },
    { id: 2, name: "Islamabad", lat: 33.6844, lng: 73.0479, province: "Punjab" },
    { id: 3, name: "Rawalpindi", lat: 33.5651, lng: 73.0169, province: "Punjab" },
    { id: 4, name: "Faisalabad", lat: 31.4504, lng: 73.1350, province: "Punjab" },
    { id: 5, name: "Multan", lat: 30.1575, lng: 71.5249, province: "Punjab" },
    { id: 6, name: "Gujranwala", lat: 32.1877, lng: 74.1880, province: "Punjab" },
    { id: 7, name: "Peshawar", lat: 34.0151, lng: 71.5249, province: "KPK" },
    { id: 8, name: "Sialkot", lat: 32.4945, lng: 74.5229, province: "Punjab" },
    { id: 9, name: "Bahawalpur", lat: 29.3544, lng: 71.6911, province: "Punjab" },
    { id: 10, name: "Sargodha", lat: 32.0836, lng: 72.6711, province: "Punjab" },
    { id: 11, name: "Sheikhupura", lat: 31.7135, lng: 73.9783, province: "Punjab" },
    { id: 12, name: "Jhang", lat: 31.2806, lng: 72.3112, province: "Punjab" },
    { id: 13, name: "Mardan", lat: 34.1933, lng: 72.0499, province: "KPK" },
    { id: 14, name: "Gujrat", lat: 32.5772, lng: 74.0834, province: "Punjab" },
    { id: 15, name: "Kasur", lat: 31.1189, lng: 74.4476, province: "Punjab" }
  ];

  // Travel cost rates
  const travelRates = {
    standard: { base: 8, overnight: 3000, meal: 800 },
    premium: { base: 15, overnight: 5000, meal: 1500 },
    budget: { base: 5, overnight: 2000, meal: 500 }
  };

  const accommodationRates = {
    standard: 3000,
    premium: 6000,
    budget: 1500
  };

  const equipmentRates = {
    standard: 2000,
    premium: 4000,
    budget: 1000
  };

  const calculateDistance = (from, to) => {
    // Simple distance calculation (in reality, you'd use proper distance matrix API)
    const fromCityData = cities.find(c => c.id === parseInt(from));
    const toCityData = cities.find(c => c.id === parseInt(to));
    
    if (!fromCityData || !toCityData) return 0;
    
    // Haversine distance formula (simplified)
    const R = 6371; // Earth's radius in km
    const dLat = (toCityData.lat - fromCityData.lat) * Math.PI / 180;
    const dLng = (toCityData.lng - fromCityData.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(fromCityData.lat * Math.PI / 180) * Math.cos(toCityData.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const calculateTravelCost = () => {
    if (!fromCity || !toCity) {
      alert('Please select both departure and destination cities');
      return;
    }

    setLoading(true);
    setEstimatedCost(null);

    // Simulate API call
    setTimeout(() => {
      const distance = calculateDistance(fromCity, toCity);
      const rates = travelRates[urgencyLevel];
      
      // Transport cost
      const transportCost = distance * rates.base * 2; // Round trip
      
      // Meals cost
      const mealsCost = rates.meal * teamSize * shootingDays;
      
      // Accommodation cost
      let accommodationCost = 0;
      if (needAccommodation && shootingDays > 1) {
        const nights = shootingDays - 1; // First day travel, last day return
        accommodationCost = accommodationRates[urgencyLevel] * teamSize * nights;
      }
      
      // Equipment transport cost
      let equipmentCost = 0;
      if (needEquipment) {
        equipmentCost = equipmentRates[urgencyLevel] * distance / 10; // Per 10km
      }
      
      // Additional fees
      let additionalFees = 0;
      if (distance > 300) additionalFees += 2000; // Long distance fee
      if (urgencyLevel === 'premium') additionalFees += 3000; // Premium service fee
      if (urgencyLevel === 'budget' && distance > 100) additionalFees += 500; // Budget long distance
      
      const totalCost = transportCost + mealsCost + accommodationCost + equipmentCost + additionalFees;
      
      setEstimatedCost({
        distance,
        transportCost,
        mealsCost,
        accommodationCost,
        equipmentCost,
        additionalFees,
        totalCost,
        breakdown: {
          distance: `${distance} km each way`,
          transport: `${distance} km × Rs.${rates.base}/km × 2 (round trip)`,
          meals: `${teamSize} people × ${shootingDays} days × Rs.${rates.meal}/day`,
          accommodation: needAccommodation && shootingDays > 1 
            ? `${teamSize} people × ${shootingDays - 1} nights × Rs.${accommodationRates[urgencyLevel]}/night`
            : 'Not required',
          equipment: needEquipment 
            ? `${distance} km × Rs.${equipmentRates[urgencyLevel]}/10km`
            : 'Not required'
        }
      });
      
      setLoading(false);
    }, 1500);
  };

  const handleSaveEstimate = () => {
    if (estimatedCost) {
      const estimates = JSON.parse(localStorage.getItem('travelEstimates') || '[]');
      const newEstimate = {
        id: Date.now(),
        from: cities.find(c => c.id === parseInt(fromCity))?.name,
        to: cities.find(c => c.id === parseInt(toCity))?.name,
        teamSize,
        shootingDays,
        totalCost: estimatedCost.totalCost,
        urgencyLevel,
        createdAt: new Date().toISOString(),
        ...estimatedCost
      };
      estimates.push(newEstimate);
      localStorage.setItem('travelEstimates', JSON.stringify(estimates));
      alert('Travel estimate saved successfully!');
    }
  };

  const getUrgencyBadge = (level) => {
    const config = {
      standard: { color: 'primary', icon: '⚡', text: 'Standard' },
      premium: { color: 'warning', icon: '🌟', text: 'Premium' },
      budget: { color: 'success', icon: '💰', text: 'Budget' }
    };
    
    const { color, icon, text } = config[level];
    return (
      <span className={`badge bg-${color} d-inline-flex align-items-center`}>
        <span className="me-1">{icon}</span>
        {text}
      </span>
    );
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
                <div className="small opacity-75">Service Level</div>
                <div className="h5 fw-bold">{getUrgencyBadge(urgencyLevel)}</div>
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
                      >
                        <option value="">Select departure city</option>
                        {cities.map(city => (
                          <option key={city.id} value={city.id}>{city.name}</option>
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
                      >
                        <option value="">Select destination city</option>
                        {cities.map(city => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Team Size *</label>
                      <select 
                        className="form-select"
                        value={teamSize}
                        onChange={(e) => setTeamSize(parseInt(e.target.value))}
                      >
                        <option value={1}>1 person (Solo photographer)</option>
                        <option value={2}>2 people (Photographer + Assistant)</option>
                        <option value={3}>3 people (Team)</option>
                        <option value={4}>4 people (Large team)</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Shooting Days *</label>
                      <select 
                        className="form-select"
                        value={shootingDays}
                        onChange={(e) => setShootingDays(parseInt(e.target.value))}
                      >
                        <option value={1}>1 day (Local assignment)</option>
                        <option value={2}>2 days (Weekend shoot)</option>
                        <option value={3}>3 days (Extended shoot)</option>
                        <option value={5}>5 days (Week-long project)</option>
                        <option value={7}>7 days (Full week)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Service Level *</label>
                  <div className="btn-group w-100" role="group">
                    <button 
                      className={`btn ${urgencyLevel === 'budget' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setUrgencyLevel('budget')}
                    >
                      💰 Budget
                    </button>
                    <button 
                      className={`btn ${urgencyLevel === 'standard' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setUrgencyLevel('standard')}
                    >
                      ⚡ Standard
                    </button>
                    <button 
                      className={`btn ${urgencyLevel === 'premium' ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => setUrgencyLevel('premium')}
                    >
                      🌟 Premium
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Additional Requirements</label>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="needAccommodation"
                      checked={needAccommodation}
                      onChange={(e) => setNeedAccommodation(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="needAccommodation">
                      Need accommodation ({shootingDays > 1 ? 'Required' : 'Optional'})
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="needEquipment"
                      checked={needEquipment}
                      onChange={(e) => setNeedEquipment(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="needEquipment">
                      Equipment transport required
                    </label>
                  </div>
                </div>

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
                <h6 className="fw-bold mb-0">📊 Service Level Comparison</h6>
              </div>
              <div className="card-body">
                <div className="small">
                  <div className="row mb-3">
                    <div className="col-md-4 text-center">
                      <div className="mb-2">
                        <span className="badge bg-success fs-6">💰 Budget</span>
                      </div>
                      <div className="text-muted">
                        <div>• Basic transport</div>
                        <div>• Standard meals</div>
                        <div>• Budget accommodation</div>
                        <div>• Slower response time</div>
                      </div>
                    </div>
                    <div className="col-md-4 text-center">
                      <div className="mb-2">
                        <span className="badge bg-primary fs-6">⚡ Standard</span>
                      </div>
                      <div className="text-muted">
                        <div>• Comfortable transport</div>
                        <div>• Quality meals</div>
                        <div>• Standard accommodation</div>
                        <div>• Normal response time</div>
                      </div>
                    </div>
                    <div className="col-md-4 text-center">
                      <div className="mb-2">
                        <span className="badge bg-warning fs-6">🌟 Premium</span>
                      </div>
                      <div className="text-muted">
                        <div>• Premium transport</div>
                        <div>• Luxury meals</div>
                        <div>• Premium accommodation</div>
                        <div>• Priority service</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="col-lg-6">
            {estimatedCost ? (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">💰 Cost Breakdown</h5>
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleSaveEstimate}
                    >
                      💾 Save Estimate
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-center mb-4">
                    <div className="text-muted small">Estimated Total Cost</div>
                    <div className="h2 fw-bold text-primary">Rs. {estimatedCost.totalCost.toLocaleString()}</div>
                    <div className="text-muted small">For {estimatedCost.distance} km round trip</div>
                  </div>

                  <div className="cost-breakdown">
                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div>
                        <div className="fw-semibold">🚗 Transportation</div>
                        <div className="text-muted small">{estimatedCost.breakdown.transport}</div>
                      </div>
                      <div className="fw-bold">Rs. {estimatedCost.transportCost.toLocaleString()}</div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div>
                        <div className="fw-semibold">🍽️ Meals</div>
                        <div className="text-muted small">{estimatedCost.breakdown.meals}</div>
                      </div>
                      <div className="fw-bold">Rs. {estimatedCost.mealsCost.toLocaleString()}</div>
                    </div>

                    {estimatedCost.accommodationCost > 0 && (
                      <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                        <div>
                          <div className="fw-semibold">🏨 Accommodation</div>
                          <div className="text-muted small">{estimatedCost.breakdown.accommodation}</div>
                        </div>
                        <div className="fw-bold">Rs. {estimatedCost.accommodationCost.toLocaleString()}</div>
                      </div>
                    )}

                    {estimatedCost.equipmentCost > 0 && (
                      <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                        <div>
                          <div className="fw-semibold">📸 Equipment Transport</div>
                          <div className="text-muted small">{estimatedCost.breakdown.equipment}</div>
                        </div>
                        <div className="fw-bold">Rs. {estimatedCost.equipmentCost.toLocaleString()}</div>
                      </div>
                    )}

                    {estimatedCost.additionalFees > 0 && (
                      <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-warning bg-opacity-10 rounded">
                        <div>
                          <div className="fw-semibold">📋 Additional Fees</div>
                          <div className="text-muted small">
                            {estimatedCost.distance > 300 && 'Long distance fee'}
                            {urgencyLevel === 'premium' && 'Premium service fee'}
                            {urgencyLevel === 'budget' && estimatedCost.distance > 100 && 'Budget distance fee'}
                          </div>
                        </div>
                        <div className="fw-bold">Rs. {estimatedCost.additionalFees.toLocaleString()}</div>
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-2">
                      <div>
                        <div className="h5 fw-bold">Total Cost</div>
                        <div className="text-muted small">Including all taxes and fees</div>
                      </div>
                      <div className="h4 fw-bold text-primary">Rs. {estimatedCost.totalCost.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="alert alert-info small mt-4">
                    <strong>💡 Note:</strong> This is an estimate. Final cost may vary based on actual travel conditions, fuel prices, and specific requirements.
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
                      <li>• Book travel at least 48 hours in advance for better rates</li>
                      <li>• Last-minute bookings incur 20% additional charges</li>
                      <li>• Group bookings may qualify for discounts</li>
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="fw-semibold text-primary">🚗 Transportation Options</h6>
                    <ul className="list-unstyled text-muted">
                      <li>• Budget: Public transport or shared rides</li>
                      <li>• Standard: Private car or rental vehicle</li>
                      <li>• Premium: Luxury vehicle with driver</li>
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="fw-semibold text-primary">🏨 Accommodation Standards</h6>
                    <ul className="list-unstyled text-muted">
                      <li>• Budget: Clean basic hotels or guest houses</li>
                      <li>• Standard: 3-star hotels with good amenities</li>
                      <li>• Premium: 4-5 star hotels with luxury facilities</li>
                    </ul>
                  </div>

                  <div className="alert alert-warning small">
                    <strong>⚠️ Important:</strong> All travel costs are calculated for round trips and include return journey expenses. Weather conditions and road situations may affect final costs.
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
