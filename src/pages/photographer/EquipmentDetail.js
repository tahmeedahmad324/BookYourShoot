import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StripeCheckout from '../../components/StripeCheckout';

const EquipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [rentalDays, setRentalDays] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [rentalBooking, setRentalBooking] = useState(null);

  const API_BASE = 'http://localhost:5000/api';

  // Mock equipment data (in real app, fetch from API)
  const mockEquipment = [
    {
      id: 1,
      name: "Canon EOS R5",
      category: "Camera",
      type: "Mirrorless Camera",
      brand: "Canon",
      dailyRate: 2500,
      weeklyRate: 15000,
      monthlyRate: 50000,
      deposit: 25000,
      description: "Professional full-frame mirrorless camera with 45MP sensor, perfect for wedding and commercial photography. Features advanced autofocus system and 8K video recording capabilities.",
      specifications: {
        megapixels: "45MP",
        video: "8K RAW, 4K 120fps",
        iso: "100-51200 (expandable to 102400)",
        autofocus: "Dual Pixel CMOS AF with 1,053 zones",
        weight: "650g (body only)",
        sensor: "Full-frame CMOS",
        imageProcessor: "DIGIC X",
        burstRate: "12 fps mechanical, 20 fps electronic"
      },
      images: ["📷", "📸", "🎥"],
      available: true,
      rating: 4.9,
      reviews: 127,
      rentalCount: 89,
      condition: "Excellent",
      includes: ["Camera Body", "2× Batteries", "Battery Charger", "Camera Strap", "Body Cap", "USB Cable", "Protective Case"],
      features: [
        "45MP Full-Frame CMOS Sensor",
        "8K 30fps RAW Video Recording",
        "Advanced Dual Pixel CMOS AF",
        "5-Axis In-Body Image Stabilization",
        "Weather-Sealed Magnesium Body",
        "3.2\" Vari-Angle Touchscreen",
        "Dual Card Slots (CFexpress + SD)"
      ],
      compatibleLenses: "Canon RF Mount & EF Mount (with adapter)",
      owner: {
        name: "Professional Gear Rentals",
        location: "Lahore, Pakistan",
        phone: "+92 300 1234567",
        rating: 4.8,
        totalRentals: 450
      }
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const found = mockEquipment.find(e => e.id === parseInt(id));
      setEquipment(found);
      setLoading(false);
    }, 500);
  }, [id]);

  const calculateRentalCost = () => {
    if (!equipment) return 0;
    
    if (selectedPeriod === 'daily') {
      return equipment.dailyRate * rentalDays;
    } else if (selectedPeriod === 'weekly') {
      const weeks = Math.ceil(rentalDays / 7);
      return equipment.weeklyRate * weeks;
    } else {
      const months = Math.ceil(rentalDays / 30);
      return equipment.monthlyRate * months;
    }
  };

  const handleRentNow = () => {
    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    const rentalCost = calculateRentalCost();
    const totalAmount = rentalCost + equipment.deposit;
    // Standard 50/50 payment: 50% advance now, 50% on pickup
    const advancePayment = totalAmount * 0.5;

    const bookingData = {
      id: `RENT-${Date.now()}`,
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      equipmentCategory: equipment.category,
      equipmentImage: equipment.images[0],
      startDate,
      rentalDays,
      period: selectedPeriod,
      rentalCost: rentalCost,
      deposit: equipment.deposit,
      totalAmount: totalAmount,
      advancePayment: advancePayment,
      remainingPayment: totalAmount - advancePayment,
      status: 'pending_payment',
      ownerName: equipment.owner.name,
      ownerPhone: equipment.owner.phone,
      createdAt: new Date().toISOString()
    };

    // Store rental data before payment
    localStorage.setItem('pending_rental', JSON.stringify(bookingData));
    
    setRentalBooking(bookingData);
    setShowPayment(true);
    
    // Scroll to top when showing payment
    window.scrollTo(0, 0);
  };

  const handlePaymentSuccess = () => {
    // Navigate to success page which will handle the rental confirmation
    // The success page will read from localStorage and save the rental
    navigate('/booking/success?session_id=rental_success');
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setRentalBooking(null);
    localStorage.removeItem('pending_rental');
  };

  const generateMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="equipment-detail py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading equipment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="equipment-detail py-4">
        <div className="container">
          <div className="text-center py-5">
            <h4 className="fw-bold mb-3">Equipment Not Found</h4>
            <Link to="/photographer/equipment" className="btn btn-primary">
              ← Back to Equipment List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show payment screen
  if (showPayment && rentalBooking) {
    // Prepare bookingData for StripeCheckout
    const rentalBookingData = {
      ...rentalBooking,
      clientName: user?.name || 'Client',
      clientEmail: user?.email || 'client@example.com',
      phone: user?.phone || '',
      isEquipmentRental: true,
      price: rentalBooking.totalAmount  // Full price for display
    };
    
    return (
      <StripeCheckout
        bookingId={rentalBooking.id}
        amount={rentalBooking.advancePayment}
        photographerName={`${equipment.name} - ${rentalDays} days`}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        isEquipmentRental={true}
        bookingData={rentalBookingData}
      />
    );
  }

  return (
    <div className="equipment-detail py-4">
      <div className="container">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link to="/photographer/equipment">Equipment Rental</Link>
            </li>
            <li className="breadcrumb-item active">{equipment.name}</li>
          </ol>
        </nav>

        <div className="row">
          {/* Left Column - Equipment Info */}
          <div className="col-lg-8">
            {/* Main Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="text-primary mb-2" style={{ fontSize: '4rem' }}>
                      {equipment.images[0]}
                    </div>
                    <h1 className="fw-bold mb-2">{equipment.name}</h1>
                    <div className="text-muted mb-2">
                      {equipment.brand} • {equipment.type} • {equipment.category}
                    </div>
                  </div>
                  <div className="text-end">
                    {equipment.available ? (
                      <span className="badge bg-success fs-6">✅ Available</span>
                    ) : (
                      <span className="badge bg-danger fs-6">❌ Rented</span>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="d-flex align-items-center mb-4">
                  <span className="text-warning me-2 fs-5">⭐</span>
                  <span className="fw-semibold fs-5">{equipment.rating}</span>
                  <span className="text-muted ms-2">({equipment.reviews} reviews)</span>
                  <span className="text-muted ms-3">• Rented {equipment.rentalCount} times</span>
                  <span className="badge bg-info ms-3">{equipment.condition}</span>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">About This Equipment</h5>
                  <p className="text-muted">{equipment.description}</p>
                </div>

                {/* Key Features */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Key Features</h5>
                  <div className="row">
                    {equipment.features.map((feature, idx) => (
                      <div key={idx} className="col-md-6 mb-2">
                        <div className="d-flex align-items-start">
                          <span className="text-success me-2">✓</span>
                          <span className="text-muted small">{feature}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specifications */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Technical Specifications</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <tbody>
                        {Object.entries(equipment.specifications).map(([key, value]) => (
                          <tr key={key}>
                            <td className="fw-semibold bg-light" style={{ width: '40%' }}>
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                            </td>
                            <td>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* What's Included */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">📦 What's Included</h5>
                  <div className="row">
                    {equipment.includes.map((item, idx) => (
                      <div key={idx} className="col-md-6 mb-2">
                        <div className="d-flex align-items-center">
                          <span className="text-primary me-2">📌</span>
                          <span className="text-muted small">{item}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compatible Lenses */}
                {equipment.compatibleLenses && (
                  <div className="alert alert-info">
                    <strong>💡 Compatibility:</strong> {equipment.compatibleLenses}
                  </div>
                )}
              </div>
            </div>

            {/* Owner Info */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Equipment Owner</h5>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{equipment.owner.name}</div>
                    <div className="text-muted small">📍 {equipment.owner.location}</div>
                    <div className="text-muted small">⭐ {equipment.owner.rating} rating • {equipment.owner.totalRentals} rentals</div>
                  </div>
                  <div>
                    <a href={`tel:${equipment.owner.phone}`} className="btn btn-outline-primary btn-sm">
                      📞 Contact
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-lg sticky-top" style={{ top: '20px' }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Rental Information</h5>

                {/* Pricing */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Daily Rate:</span>
                    <span className="fw-semibold">Rs. {equipment.dailyRate.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Weekly Rate:</span>
                    <span className="fw-semibold">Rs. {equipment.weeklyRate.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-muted">Monthly Rate:</span>
                    <span className="fw-semibold">Rs. {equipment.monthlyRate.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-3 border-top">
                    <span className="fw-bold text-warning">Security Deposit:</span>
                    <span className="fw-bold text-warning">Rs. {equipment.deposit.toLocaleString()}</span>
                  </div>
                </div>

                {/* Rental Period Selection */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Rental Period</label>
                  <select
                    className="form-select"
                    value={selectedPeriod}
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      if (e.target.value === 'daily') setRentalDays(1);
                      else if (e.target.value === 'weekly') setRentalDays(7);
                      else setRentalDays(30);
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Number of Days */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Number of Days</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rentalDays}
                    onChange={(e) => setRentalDays(parseInt(e.target.value) || 1)}
                    min="1"
                    max="90"
                  />
                </div>

                {/* Start Date */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={generateMinDate()}
                  />
                </div>

                {/* Cost Summary */}
                <div className="bg-light rounded p-3 mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Rental Cost:</span>
                    <span className="fw-semibold">Rs. {calculateRentalCost().toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Security Deposit:</span>
                    <span className="fw-semibold text-warning">Rs. {equipment.deposit.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top">
                    <span className="fw-bold">Total Amount:</span>
                    <span className="fw-bold text-primary fs-5">
                      Rs. {(calculateRentalCost() + equipment.deposit).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Standard 50/50 Payment Plan */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">Payment Plan</label>
                  
                  {/* 50% Advance Payment Info */}
                  <div className="border rounded-3 p-3 mb-2 border-primary bg-primary bg-opacity-10">
                    <div className="d-flex align-items-start">
                      <div className="me-3">
                        <span className="badge bg-primary rounded-pill px-3 py-2">50%</span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">Pay Now (Advance)</div>
                        <div className="small text-muted">Secure your rental booking</div>
                        <div className="mt-1">
                          <span className="fw-bold text-primary fs-5">Rs. {((calculateRentalCost() + equipment.deposit) * 0.5).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remaining 50% Info */}
                  <div className="border rounded-3 p-3 bg-light">
                    <div className="d-flex align-items-start">
                      <div className="me-3">
                        <span className="badge bg-secondary rounded-pill px-3 py-2">50%</span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold text-muted">Pay on Pickup</div>
                        <div className="small text-muted">Remaining balance when collecting equipment</div>
                        <div className="mt-1">
                          <span className="fw-bold text-secondary fs-5">Rs. {((calculateRentalCost() + equipment.deposit) * 0.5).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rent Button */}
                {equipment.available ? (
                  <button 
                    className="btn btn-primary btn-lg w-100 mb-3"
                    onClick={handleRentNow}
                  >
                    💳 Rent Now
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-lg w-100 mb-3" disabled>
                    ❌ Currently Unavailable
                  </button>
                )}

                {/* Important Notes */}
                <div className="alert alert-info small mb-0">
                  <div className="fw-bold mb-2">📋 Important:</div>
                  <ul className="mb-0 ps-3">
                    <li>Deposit is fully refundable</li>
                    <li>Valid ID required for pickup</li>
                    <li>Late returns: Rs. 500/day extra</li>
                    <li>Damage charges apply if damaged</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetail;
