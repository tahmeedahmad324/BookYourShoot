import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import StripeCheckout from '../../components/StripeCheckout';

const EquipmentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [rentalCart, setRentalCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [rentalBookingData, setRentalBookingData] = useState(null);

  // Mock equipment data
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
      description: "Professional full-frame mirrorless camera with 45MP sensor",
      specifications: {
        megapixels: 45,
        video: "8K RAW",
        iso: "100-51200",
        autofocus: "Dual Pixel CMOS AF",
        weight: "650g"
      },
      image: "📷",
      available: true,
      rating: 4.9,
      reviews: 127,
      rentalCount: 89,
      condition: "Excellent",
      includes: ["Body", "Battery", "Charger", "Strap"],
      popular: true
    },
    {
      id: 2,
      name: "Sony A7R IV",
      category: "Camera",
      type: "Mirrorless Camera",
      brand: "Sony",
      dailyRate: 2200,
      weeklyRate: 13000,
      monthlyRate: 45000,
      deposit: 20000,
      description: "61MP full-frame mirrorless camera for high-resolution photography",
      specifications: {
        megapixels: 61,
        video: "4K 60fps",
        iso: "100-32000",
        autofocus: "693-point AF",
        weight: "665g"
      },
      image: "📸",
      available: true,
      rating: 4.8,
      reviews: 98,
      rentalCount: 67,
      condition: "Excellent",
      includes: ["Body", "2 Batteries", "Charger", "Strap"],
      popular: true
    },
    {
      id: 3,
      name: "Profoto B10",
      category: "Lighting",
      type: "Studio Strobe",
      brand: "Profoto",
      dailyRate: 1500,
      weeklyRate: 8000,
      monthlyRate: 25000,
      deposit: 15000,
      description: "Professional studio strobe with TTL support and built-in battery",
      specifications: {
        power: "250Ws",
        ttl: "Yes",
        batteryLife: "400 flashes",
        recycleTime: "0.05-2.0s",
        colorTemp: "5600K"
      },
      image: "💡",
      available: false,
      rating: 4.7,
      reviews: 45,
      rentalCount: 34,
      condition: "Good",
      includes: ["Strobe", "Battery", "Charger", "Stand Adapter"],
      popular: false
    },
    {
      id: 4,
      name: "DJI Ronin 4D",
      category: "Video",
      type: "Gimbal Camera",
      brand: "DJI",
      dailyRate: 8000,
      weeklyRate: 50000,
      monthlyRate: 150000,
      deposit: 50000,
      description: "Integrated 4-axis gimbal camera system for professional filmmaking",
      specifications: {
        sensor: "4/3 CMOS",
        video: "8K 75fps",
        stabilization: "4-axis gimbal",
        storage: "1TB SSD",
        weight: "2.5kg"
      },
      image: "🎥",
      available: true,
      rating: 5.0,
      reviews: 23,
      rentalCount: 12,
      condition: "Excellent",
      includes: ["Camera Unit", "2 Batteries", "Grip", "Case"],
      popular: true
    },
    {
      id: 5,
      name: "Manfrotto 055 Tripod",
      category: "Support",
      type: "Tripod",
      brand: "Manfrotto",
      dailyRate: 500,
      weeklyRate: 2500,
      monthlyRate: 8000,
      deposit: 5000,
      description: "Professional carbon fiber tripod with fluid video head",
      specifications: {
        maxLoad: "9kg",
        maxHeight: "170cm",
        weight: "2.1kg",
        sections: "4",
        headType: "Fluid video head"
      },
      image: "🗼",
      available: true,
      rating: 4.6,
      reviews: 156,
      rentalCount: 234,
      condition: "Good",
      includes: ["Tripod Legs", "Fluid Head", "Carry Case"],
      popular: false
    },
    {
      id: 6,
      name: "Elgato Key Light Air",
      category: "Lighting",
      type: "LED Panel",
      brand: "Elgato",
      dailyRate: 300,
      weeklyRate: 1500,
      monthlyRate: 5000,
      deposit: 3000,
      description: "Professional LED light panel for studio and streaming setups",
      specifications: {
        power: "80W",
        colorTemp: "2900-7000K",
        brightness: "1400 lux",
        control: "Wi-Fi + Bluetooth",
        weight: "1.2kg"
      },
      image: "💡",
      available: true,
      rating: 4.5,
      reviews: 89,
      rentalCount: 67,
      condition: "Excellent",
      includes: ["Light Panel", "Power Adapter", "Desktop Mount"],
      popular: false
    },
    {
      id: 7,
      name: "Rode VideoMic Pro+",
      category: "Audio",
      type: "Shotgun Microphone",
      brand: "Rode",
      dailyRate: 200,
      weeklyRate: 1000,
      monthlyRate: 3000,
      deposit: 2000,
      description: "Professional shotgun microphone with rechargeable battery",
      specifications: {
        pattern: "Super-cardioid",
        battery: "Built-in rechargeable",
        frequency: "20Hz-20kHz",
        weight: "85g",
        connection: "3.5mm + USB"
      },
      image: "🎤",
      available: true,
      rating: 4.7,
      reviews: 234,
      rentalCount: 189,
      condition: "Good",
      includes: ["Microphone", "Deadcat", "Cable", "Case"],
      popular: false
    },
    {
      id: 8,
      name: "DJI Mavic 3 Pro",
      category: "Drone",
      type: "Camera Drone",
      brand: "DJI",
      dailyRate: 3000,
      weeklyRate: 18000,
      monthlyRate: 60000,
      deposit: 30000,
      description: "Professional drone with triple camera system and Hasselblad color",
      specifications: {
        cameras: "24mm + 70mm + 166mm",
        video: "5.1K 60fps",
        flightTime: "46 minutes",
        range: "15km",
        weight: "895g"
      },
      image: "🚁",
      available: false,
      rating: 4.9,
      reviews: 78,
      rentalCount: 45,
      condition: "Excellent",
      includes: ["Drone", "3 Batteries", "Controller", "Case"],
      popular: true
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch equipment
    setTimeout(() => {
      setEquipment(mockEquipment);
      setLoading(false);
    }, 1000);
  }, []);

  const categories = ['all', 'Camera', 'Lighting', 'Video', 'Audio', 'Support', 'Drone'];

  const filteredEquipment = equipment.filter(item => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'available' && item.available) ||
                         (filter === 'popular' && item.popular);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const addToCart = (equipmentItem, rentalPeriod = 'daily') => {
    const existingItem = rentalCart.find(item => item.id === equipmentItem.id);
    
    if (existingItem) {
      setRentalCart(prev => prev.map(item => 
        item.id === equipmentItem.id 
          ? { ...item, rentalPeriod, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setRentalCart(prev => [...prev, {
        ...equipmentItem,
        rentalPeriod,
        quantity: 1,
        totalPrice: equipmentItem[`${rentalPeriod}Rate`]
      }]);
    }
  };

  const removeFromCart = (itemId) => {
    setRentalCart(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateCartTotal = () => {
    return rentalCart.reduce((total, item) => {
      const rate = item[`${item.rentalPeriod}Rate`];
      return total + (rate * item.quantity);
    }, 0);
  };

  const calculateDepositTotal = () => {
    return rentalCart.reduce((total, item) => total + item.deposit, 0);
  };

  const handleProceedToBooking = () => {
    // Create rental booking data
    const bookingData = {
      id: `RENT-${Date.now()}`,
      items: rentalCart,
      totalAmount: calculateCartTotal(),
      depositAmount: calculateDepositTotal(),
      rentalDate: new Date().toISOString(),
      status: 'pending_payment'
    };
    
    setRentalBookingData(bookingData);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    // In real app, save rental booking to database
    alert(`Equipment rental confirmed!\nRental ID: ${rentalBookingData.id}\nTotal Paid: Rs. ${rentalBookingData.totalAmount.toLocaleString()}\nDeposit: Rs. ${rentalBookingData.depositAmount.toLocaleString()} (Refundable)`);
    setRentalCart([]);
    setShowCart(false);
    setShowPayment(false);
    setRentalBookingData(null);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setRentalBookingData(null);
  };

  const getAvailabilityBadge = (available) => {
    return (
      <span className={`badge ${available ? 'bg-success' : 'bg-danger'} d-inline-flex align-items-center`}>
        <span className="me-1">{available ? '✅' : '❌'}</span>
        {available ? 'Available' : 'Rented Out'}
      </span>
    );
  };

  const getPopularBadge = (popular) => {
    if (!popular) return null;
    return (
      <span className="badge bg-warning d-inline-flex align-items-center">
        <span className="me-1">🔥</span>
        Popular
      </span>
    );
  };

  if (loading) {
    return (
      <div className="equipment-list py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading equipment catalog...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show payment screen if rental booking is ready
  if (showPayment && rentalBookingData) {
    return (
      <StripeCheckout
        bookingId={rentalBookingData.id}
        amount={rentalBookingData.totalAmount + rentalBookingData.depositAmount}
        photographerName={`Equipment Rental - ${rentalBookingData.items.length} items`}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        isEquipmentRental={true}
      />
    );
  }

  return (
    <div className="equipment-list py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 pb-5 mb-4">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="fw-bold mb-2">🔧 Equipment Rental</h1>
              <p className="mb-0">Rent professional photography equipment at affordable rates</p>
            </div>
            <div className="col-md-6">
              <div className="d-flex gap-2 justify-content-md-end">
                <button 
                  className="btn btn-primary btn-lg flex-grow-1 flex-md-grow-0"
                  onClick={() => navigate('/photographer/my-equipment-listings')}
                >
                  📦 List My Equipment
                </button>
                <button 
                  className="btn btn-primary btn-lg flex-grow-1 flex-md-grow-0"
                  onClick={() => setShowCart(!showCart)}
                >
                  🛒 Rental Cart ({rentalCart.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rental Cart Sidebar */}
        {showCart && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0 pt-4 pb-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">🛒 Rental Cart ({rentalCart.length} items)</h5>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowCart(false)}
                >
                  ✖️ Close
                </button>
              </div>
            </div>
            <div className="card-body">
              {rentalCart.length === 0 ? (
                <p className="text-muted">Your rental cart is empty</p>
              ) : (
                <>
                  {rentalCart.map(item => (
                    <div key={item.id} className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div>
                        <h6 className="fw-bold mb-1">{item.name}</h6>
                        <small className="text-muted">
                          {item.rentalPeriod.charAt(0).toUpperCase() + item.rentalPeriod.slice(1)} • 
                          Qty: {item.quantity}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold">Rs. {item[`${item.rentalPeriod}Rate`].toLocaleString()}</span>
                        <button 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-top">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold">Rental Total:</span>
                      <span className="fw-bold text-primary">Rs. {calculateCartTotal().toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="fw-bold">Security Deposit:</span>
                      <span className="fw-bold text-warning">Rs. {calculateDepositTotal().toLocaleString()}</span>
                    </div>
                    <button 
                      className="btn btn-success w-100"
                      onClick={handleProceedToBooking}
                    >
                      � Proceed to Payment
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-3">
                <label className="form-label fw-semibold">Category</label>
                <select 
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => cat !== 'all' && (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Filter</label>
                <select 
                  className="form-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Equipment</option>
                  <option value="available">Available Only</option>
                  <option value="popular">Popular Items</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Search Equipment</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, brand, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Grid */}
        {filteredEquipment.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>🔧</div>
              <h4 className="fw-bold mb-3">No Equipment Found</h4>
              <p className="text-muted">Try adjusting your filters or search terms</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {filteredEquipment.map(item => (
              <div key={item.id} className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex flex-column">
                    {/* Equipment Header */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="text-primary" style={{ fontSize: '2.5rem' }}>{item.image}</div>
                      <div className="d-flex gap-1">
                        {getPopularBadge(item.popular)}
                        {getAvailabilityBadge(item.available)}
                      </div>
                    </div>

                    {/* Equipment Info */}
                    <h5 className="fw-bold mb-1">{item.name}</h5>
                    <div className="text-muted small mb-2">{item.brand} • {item.type}</div>
                    
                    <p className="text-muted small mb-3 flex-grow-1">{item.description}</p>

                    {/* Rating */}
                    <div className="d-flex align-items-center mb-3">
                      <span className="text-warning me-1">⭐</span>
                      <span className="fw-semibold small">{item.rating}</span>
                      <span className="text-muted small ms-1">({item.reviews} reviews)</span>
                      <span className="text-muted small ms-2">Rented {item.rentalCount} times</span>
                    </div>

                    {/* Specifications */}
                    <div className="mb-3">
                      <div className="small text-muted mb-1">Key Specs:</div>
                      <div className="small">
                        {Object.entries(item.specifications).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="text-muted">
                            • {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: {value}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="pricing-info mb-3 p-2 bg-light rounded">
                      <div className="d-flex justify-content-between small">
                        <span>Daily:</span>
                        <span className="fw-semibold">Rs. {item.dailyRate.toLocaleString()}</span>
                      </div>
                      <div className="d-flex justify-content-between small">
                        <span>Weekly:</span>
                        <span className="fw-semibold">Rs. {item.weeklyRate.toLocaleString()}</span>
                      </div>
                      <div className="d-flex justify-content-between small">
                        <span>Monthly:</span>
                        <span className="fw-semibold">Rs. {item.monthlyRate.toLocaleString()}</span>
                      </div>
                      <div className="d-flex justify-content-between small text-warning mt-2 pt-2 border-top">
                        <span>Deposit:</span>
                        <span className="fw-semibold">Rs. {item.deposit.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Condition */}
                    <div className="mb-3">
                      <span className="badge bg-info">Condition: {item.condition}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto">
                      <Link 
                        to={`/photographer/equipment/${item.id}`}
                        className="btn btn-primary w-100"
                      >
                        View Details & Rent 📋
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rental Information */}
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white border-0 pt-4 pb-3">
            <h5 className="fw-bold mb-0">📋 Rental Information</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6 className="fw-semibold mb-3">How Equipment Rental Works</h6>
                <ul className="list-unstyled small">
                  <li className="mb-2">1. Browse and select equipment you need</li>
                  <li className="mb-2">2. Choose rental period (daily/weekly/monthly)</li>
                  <li className="mb-2">3. Pay rental fee + security deposit</li>
                  <li className="mb-2">4. Pick up equipment from our location</li>
                  <li className="mb-2">5. Return equipment in good condition</li>
                  <li className="mb-2">6. Get your deposit back within 48 hours</li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6 className="fw-semibold mb-3">Important Notes</h6>
                <ul className="list-unstyled small">
                  <li className="mb-2">📄 Valid ID card required for all rentals</li>
                  <li className="mb-2">🛡️ Security deposit is fully refundable</li>
                  <li className="mb-2">📦 Equipment must be returned in original condition</li>
                  <li className="mb-2">⚠️ Late returns incur additional charges</li>
                  <li className="mb-2">💊 Damage/loss charges will be deducted from deposit</li>
                  <li className="mb-2">🎓 Special discounts for week-long rentals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentList;
