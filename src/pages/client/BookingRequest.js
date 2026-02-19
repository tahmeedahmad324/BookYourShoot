import { useState, useEffect } from "react"
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { useAuth } from "../../context/AuthContext"
import { photographerAPI, travelAPI } from "../../api/api"
import StripeCheckout from "../../components/StripeCheckout"
import useFormPersistence from "../../hooks/useFormPersistence"
import TermsModal from "../../components/legal/TermsModal"

const API_BASE = 'http://localhost:8000/api';

const BookingRequest = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [photographer, setPhotographer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedService, setSelectedService] = useState(searchParams.get("service") || "")
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [showPayment, setShowPayment] = useState(false)
  const [bookingData, setBookingData] = useState(null)
  const [error, setError] = useState(null)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // Travel cost state
  const [travelEstimate, setTravelEstimate] = useState(null)
  const [travelLoading, setTravelLoading] = useState(false)
  const [eventCity, setEventCity] = useState("")
  const [availableCities, setAvailableCities] = useState([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [travelType, setTravelType] = useState('one_way') // 'one_way' = same-day, 'round_trip' = overnight

  // Photographer services data
  const photographerServices = {
    "Wedding Photography": {
      description: "Complete wedding coverage from preparation to reception",
      duration: "6-12 hours",
      basePrice: 30000,
      hourlyRate: 5000,
    },
    "Portrait Photography": {
      description: "Professional portraits for individuals and families",
      duration: "1-3 hours",
      basePrice: 5000,
      hourlyRate: 4000,
    },
    "Event Photography": {
      description: "Corporate events, birthdays, and special occasions",
      duration: "3-8 hours",
      basePrice: 8000,
      hourlyRate: 3500,
    },
    "Product Photography": {
      description: "Professional product shots for businesses",
      duration: "2-6 hours",
      basePrice: 6000,
      hourlyRate: 4500,
    },
  }

  // Validation schema
  const bookingSchema = yup.object().shape({
    clientName: yup.string().required("Full name is required"),
    clientEmail: yup.string().email("Invalid email format").required("Email is required"),
    clientPhone: yup
      .string()
      .matches(/^(\+92|0)?[3-9]\d{9}$/, "Please enter a valid Pakistani phone number")
      .required("Phone number is required"),
    serviceType: yup.string().required("Please select a service"),
    eventDate: yup.string().required("Event date is required"),
    eventTime: yup.string().required("Event time is required"),
    duration: yup.number().min(1, "Duration must be at least 1 hour").required("Duration is required"),
    location: yup.string().required("Location is required"),
    specialRequests: yup.string(),
    agreedToTerms: yup.bool().oneOf([true], "You must agree to the terms and conditions"),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm({
    resolver: yupResolver(bookingSchema),
    defaultValues: {
      clientName: user?.name || "",
      clientEmail: user?.email || "",
      clientPhone: user?.phone || "",
      serviceType: selectedService,
      duration: 1,
    },
  })

  const serviceType = watch("serviceType")
  const duration = watch("duration")
  const formValues = watch()

  // Persist form data (exclude sensitive data)
  const { clearSavedData } = useFormPersistence(
    `booking-request-${id}`,
    formValues,
    setValue,
    ['clientName', 'clientEmail', 'clientPhone', 'serviceType', 'eventDate', 'eventTime', 'duration', 'location', 'specialRequests'],
    500
  )

  useEffect(() => {
    // Fetch photographer details from API
    const fetchPhotographer = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await photographerAPI.getById(id)

        if (response.success && response.data) {
          setPhotographer(response.data)
        } else {
          setError('Photographer not found')
        }
      } catch (err) {
        console.error('Error fetching photographer:', err)
        setError(err.message || 'Failed to load photographer')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPhotographer()
    }
  }, [id])

  useEffect(() => {
    // Calculate price based on service and duration
    if (serviceType && duration) {
      const service = photographerServices[serviceType]
      if (service) {
        const price = service.basePrice + service.hourlyRate * (duration - 1)
        setCalculatedPrice(price)
      }
    }
  }, [serviceType, duration])

  // Fetch available cities on component mount
  useEffect(() => {
    const fetchCities = async () => {
      setCitiesLoading(true)
      try {
        const response = await travelAPI.getCities()
        setAvailableCities(response.data || [])
      } catch (error) {
        console.error('[BookingRequest] Failed to fetch cities:', error)
        setAvailableCities([])
      } finally {
        setCitiesLoading(false)
      }
    }
    fetchCities()
  }, [])

  // Fetch travel estimate when event city or photographer changes
  useEffect(() => {
    const fetchTravelEstimate = async () => {
      if (!eventCity || !photographer?.location) {
        setTravelEstimate(null)
        return
      }
      
      // Normalize city names for comparison
      const normalizedEventCity = eventCity.trim().toLowerCase()
      const normalizedPhotographerCity = photographer.location.trim().toLowerCase()
      
      // Same city = no travel cost
      if (normalizedEventCity === normalizedPhotographerCity) {
        setTravelEstimate({ 
          source: 'same_city', 
          distance_km: 0, 
          duration_minutes: 0,
          estimates: { 
            one_way: { total: 0, breakdown: [] }, 
            round_trip: { total: 0, breakdown: [] } 
          } 
        })
        return
      }

      setTravelLoading(true)
      try {
        const response = await travelAPI.estimate({
          from_city: photographer.location,
          to_city: eventCity,
          photographer_id: id,
        })
        if (response.data) {
          setTravelEstimate(response.data)
        }
      } catch (error) {
        console.error('[BookingRequest] Failed to fetch travel estimate:', error)
        setTravelEstimate(null)
      } finally {
        setTravelLoading(false)
      }
    }

    fetchTravelEstimate()
  }, [eventCity, photographer?.location, id])

  const onSubmit = async (data) => {
    setSubmitting(true)

    try {
      // Calculate total price including travel
      const travelCost = travelEstimate?.estimates?.[travelType]?.total || 0
      const totalPrice = calculatedPrice + travelCost

      // Create booking data
      const newBookingData = {
        id: `BOOK-${Date.now()}`,
        photographerId: String(photographer.id),
        photographerName: photographer.name,
        photographerEmail: photographer.email || `photographer-${photographer.id}@bookyourshoot.com`,
        clientId: user.id,
        clientName: data.clientName,
        clientEmail: data.clientEmail || user.email, // Use form email, fallback to auth email
        service: data.serviceType,
        date: data.eventDate,
        time: data.eventTime,
        duration: data.duration,
        location: data.location,
        eventCity: eventCity,
        price: totalPrice,
        servicePrice: calculatedPrice,
        travelCost: travelCost,
        travelDetails: travelEstimate ? {
          from_city: photographer.location,
          to_city: eventCity,
          distance_km: travelEstimate.distance_km,
          duration_minutes: travelEstimate.duration_minutes,
          source: travelEstimate.source,
          travel_type: travelType,
        } : null,
        advancePayment: totalPrice * 0.5, // Standard 50% advance
        remainingPayment: totalPrice * 0.5, // 50% after work
        status: "pending_payment",
        specialRequests: data.specialRequests,
        createdAt: new Date().toISOString(),
      }

      // Store booking data temporarily
      setBookingData(newBookingData)

      // Show payment screen and scroll to top
      setShowPayment(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })

    } catch (error) {
      console.error("Booking error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = async () => {
    // Update booking status to confirmed
    const confirmedBooking = {
      ...bookingData,
      status: "confirmed",
      paymentStatus: "advance_paid",
      paymentDate: new Date().toISOString()
    }

    // Clear saved form data after successful payment
    clearSavedData()

    // Store in localStorage (in real app, send to API)
    const existingBookings = JSON.parse(localStorage.getItem("userBookings") || "[]")
    existingBookings.push(confirmedBooking)
    localStorage.setItem("userBookings", JSON.stringify(existingBookings))

    // Send booking confirmation email via backend
    try {
      await fetch(`${API_BASE}/payments/send-booking-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_email: user.email,
          client_name: bookingData.clientName,
          photographer_name: bookingData.photographerName,
          booking_id: bookingData.id,
          service_type: bookingData.service,
          event_date: bookingData.date,
          event_time: bookingData.time,
          location: bookingData.location,
          amount: bookingData.price,
          advance_paid: bookingData.advancePayment
        })
      })
    } catch (err) {
      console.error('Failed to send confirmation email:', err)
    }

    // Redirect to success
    navigate("/client/dashboard", {
      state: {
        bookingSuccess: true,
        message: "Payment successful! Your booking has been confirmed. The photographer will contact you soon.",
      },
    })
  }

  const handlePaymentCancel = () => {
    setShowPayment(false)
    setBookingData(null)
  }

  const generateTimeSlots = () => {
    const times = []
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        times.push(time)
      }
    }
    return times
  }

  const generateMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }

  if (loading) {
    return (
      <div className="booking-request py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading booking form...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!photographer) {
    return (
      <div className="booking-request py-4">
        <div className="container">
          <div className="text-center py-5">
            <h4 className="fw-bold mb-3">
              {error ? 'Error Loading Photographer' : 'Photographer Not Found'}
            </h4>
            <p className="text-muted mb-4">
              {error || "The photographer you're trying to book doesn't exist."}
            </p>
            <Link to="/search" className="btn btn-primary" onClick={() => window.scrollTo(0, 0)}>
              Find Photographers
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show payment screen if booking data is ready
  if (showPayment && bookingData) {
    return (
      <StripeCheckout
        bookingId={bookingData.id}
        amount={bookingData.advancePayment}
        photographerName={`${bookingData.photographerName} - ${bookingData.service}`}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        bookingData={bookingData}
      />
    )
  }

  return (
    <div className="booking-request py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="fw-bold mb-2">Book {photographer.name}</h1>
                  <p className="mb-2">Complete the form below to request a booking</p>
                  <div className="text-white-50">
                    <span className="me-3">📍 {photographer.location}</span>
                    <span className="me-3">⭐ {photographer.rating} rating</span>
                    <span className="me-3">⏱️ {photographer.response_time} response time</span>
                  </div>
                  <button
                    className="btn btn-outline-light btn-sm mt-2"
                    onClick={() => navigate(`/client/chat/${photographer.id}`)}
                  >
                    💬 Have questions? Message first
                  </button>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="text-white">
                    <div className="small opacity-75">Photographer Rate</div>
                    <div className="h3 fw-bold">PKR {photographer.hourly_rate}/hr</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Booking Form */}
          <div className="col-lg-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Client Information */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">👤 Your Information</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.clientName ? "is-invalid" : ""}`}
                        {...register("clientName")}
                        placeholder="Enter your full name"
                      />
                      {errors.clientName && <div className="text-danger small mt-1">{errors.clientName.message}</div>}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Email Address *</label>
                      <input
                        type="email"
                        className={`form-control ${errors.clientEmail ? "is-invalid" : ""}`}
                        {...register("clientEmail")}
                        placeholder="your@email.com"
                      />
                      {errors.clientEmail && <div className="text-danger small mt-1">{errors.clientEmail.message}</div>}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        className={`form-control ${errors.clientPhone ? "is-invalid" : ""}`}
                        {...register("clientPhone")}
                        placeholder="+92 300 1234567"
                      />
                      {errors.clientPhone && <div className="text-danger small mt-1">{errors.clientPhone.message}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Selection */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">📸 Service Selection</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Service Type *</label>
                    <select
                      className={`form-select ${errors.serviceType ? "is-invalid" : ""}`}
                      {...register("serviceType")}
                      onChange={(e) => {
                        setSelectedService(e.target.value)
                        setValue("serviceType", e.target.value)
                        trigger("serviceType")
                      }}
                    >
                      <option value="">Select a service</option>
                      {Object.entries(photographerServices).map(([name, details]) => (
                        <option key={name} value={name}>
                          {name} - Starting from PKR {details.basePrice.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {errors.serviceType && <div className="text-danger small mt-1">{errors.serviceType.message}</div>}
                  </div>

                  {selectedService && photographerServices[selectedService] && (
                    <div className="alert alert-info">
                      <div className="fw-bold mb-1">{selectedService}</div>
                      <div className="small mb-2">{photographerServices[selectedService].description}</div>
                      <div className="small">
                        Duration: {photographerServices[selectedService].duration} | Base Price: PKR{" "}
                        {photographerServices[selectedService].basePrice.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">📅 Event Details</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Event Date *</label>
                      <input
                        type="date"
                        className={`form-control ${errors.eventDate ? "is-invalid" : ""}`}
                        {...register("eventDate")}
                        min={generateMinDate()}
                        onChange={(e) => {
                          setSelectedDate(e.target.value)
                          setValue("eventDate", e.target.value)
                          trigger("eventDate")
                        }}
                      />
                      {errors.eventDate && <div className="text-danger small mt-1">{errors.eventDate.message}</div>}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Start Time *</label>
                      <select
                        className={`form-select ${errors.eventTime ? "is-invalid" : ""}`}
                        {...register("eventTime")}
                        onChange={(e) => {
                          setSelectedTime(e.target.value)
                          setValue("eventTime", e.target.value)
                          trigger("eventTime")
                        }}
                      >
                        <option value="">Select time</option>
                        {generateTimeSlots().map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      {errors.eventTime && <div className="text-danger small mt-1">{errors.eventTime.message}</div>}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Duration (hours) *</label>
                      <input
                        type="number"
                        className={`form-control ${errors.duration ? "is-invalid" : ""}`}
                        {...register("duration", { valueAsNumber: true })}
                        min="1"
                        max="12"
                        onChange={(e) => {
                          setSelectedDuration(Number.parseInt(e.target.value))
                          setValue("duration", Number.parseInt(e.target.value))
                          trigger("duration")
                        }}
                      />
                      {errors.duration && <div className="text-danger small mt-1">{errors.duration.message}</div>}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Event City *</label>
                      <select
                        className="form-select"
                        value={eventCity}
                        onChange={(e) => setEventCity(e.target.value)}
                        disabled={citiesLoading}
                      >
                        <option value="">Select event city...</option>
                        {availableCities.map((city) => (
                          <option key={city.name} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                      <small className="text-muted">
                        {photographer?.location ? `Photographer is based in ${photographer.location}` : 'Select city where event will be held'}
                      </small>
                      
                      {/* Same city - no travel cost */}
                      {eventCity && photographer?.location && eventCity.toLowerCase() === photographer.location.toLowerCase() && (
                        <div className="alert alert-success py-2 mt-2 mb-0 small">
                          <span className="me-2">✓</span>
                          <strong>No travel cost!</strong> Event is in photographer's base city.
                        </div>
                      )}
                      
                      {/* Different city - show travel info */}
                      {eventCity && photographer?.location && eventCity.toLowerCase() !== photographer.location.toLowerCase() && (
                        <div className="alert alert-info py-2 mt-2 mb-0 small">
                          <span className="me-2">✈️</span>
                          {travelLoading ? (
                            <span>Calculating travel cost from {photographer.location}...</span>
                          ) : travelEstimate && travelEstimate.distance_km > 0 ? (
                            <span>
                              <strong>Inter-city booking:</strong> {photographer.location} → {eventCity} 
                              (~{travelEstimate.distance_km?.toFixed(0)} km, {travelEstimate.duration_display || `${Math.round((travelEstimate.duration_minutes || 0) / 60)}h`})
                            </span>
                          ) : (
                            <span>Calculating travel cost from {photographer.location}...</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Travel Type Selection - Only for inter-city bookings */}
                  {eventCity && photographer?.location && eventCity.toLowerCase() !== photographer.location.toLowerCase() && (
                    <div className="alert alert-light border mb-3">
                    <label className="form-label fw-semibold mb-3">Event Type & Travel *</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="travelType"
                          id="travelOneWay"
                          value="one_way"
                          checked={travelType === 'one_way'}
                          onChange={(e) => setTravelType(e.target.value)}
                        />
                        <label className="form-check-label" htmlFor="travelOneWay">
                          <strong>📸 Same-Day Event</strong>
                          <div className="small text-muted">Single-day photoshoot<br />Photographer travels there & back same day</div>
                          <div className="small mt-1 text-primary fw-semibold">PKR {travelEstimate?.estimates?.one_way?.total?.toLocaleString() || 0}</div>
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="travelType"
                          id="travelRoundTrip"
                          value="round_trip"
                          checked={travelType === 'round_trip'}
                          onChange={(e) => setTravelType(e.target.value)}
                        />
                        <label className="form-check-label" htmlFor="travelRoundTrip">
                          <strong>🏨 Multi-Day Event (Overnight)</strong>
                          <div className="small text-muted">Multi-day coverage<br />Includes photographer accommodation</div>
                          <div className="small mt-1 text-primary fw-semibold">PKR {travelEstimate?.estimates?.round_trip?.total?.toLocaleString() || 0}</div>
                        </label>
                      </div>
                    </div>
                    <div className="small text-muted mt-2 ms-2">
                      💡 <strong>Note:</strong> Both options include round-trip travel costs (to event location and back)
                    </div>
                  </div>
                )}

                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <label className="form-label fw-semibold">Full Location/Address *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.location ? "is-invalid" : ""}`}
                        {...register("location")}
                        placeholder="Event location address (venue name, street, city)"
                      />
                      {errors.location && <div className="text-danger small mt-1">{errors.location.message}</div>}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Special Requests</label>
                    <textarea
                      className="form-control"
                      {...register("specialRequests")}
                      rows="4"
                      placeholder="Any special requirements or preferences for the shoot..."
                    />
                  </div>
                </div>
              </div>

              {/* Terms and Submit */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <div className="form-check mb-4">
                    <input
                      className={`form-check-input ${errors.agreedToTerms ? "is-invalid" : ""}`}
                      type="checkbox"
                      id="terms"
                      {...register("agreedToTerms")}
                    />
                    <label className="form-check-label" htmlFor="terms">
                      I agree to the{' '}
                      <button
                        type="button"
                        className="btn btn-link p-0 text-primary text-decoration-none"
                        onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                      >
                        booking terms and conditions
                      </button>, including the 100% upfront payment policy
                    </label>
                    {errors.agreedToTerms && (
                      <div className="text-danger small mt-1">{errors.agreedToTerms.message}</div>
                    )}
                  </div>

                  <div className="d-flex gap-3">
                    <button type="submit" className="btn btn-primary btn-lg px-5" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          Proceed to Payment 💳
                        </>
                      )}
                    </button>
                    <Link to={`/photographer/${photographer.id}`} className="btn btn-outline-secondary btn-lg" onClick={() => window.scrollTo(0, 0)}>
                      Back to Profile
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Pricing Summary */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: "20px" }}>
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">💰 Pricing Summary</h5>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2 text-muted">
                  <span>Base Price</span>
                  <span>PKR {selectedService ? photographerServices[selectedService]?.basePrice.toLocaleString() : "0"}</span>
                </div>

                <div className="d-flex justify-content-between mb-2 text-muted">
                  <span>+{selectedDuration - 1} extra hour(s)</span>
                  <span>PKR {selectedService ? (photographerServices[selectedService]?.hourlyRate * (selectedDuration - 1)).toLocaleString() : "0"}</span>
                </div>

                {/* Travel Cost Section */}
                {travelEstimate && travelEstimate.source === 'same_city' && (
                  <div className="border-top pt-2 mb-2">
                    <div className="d-flex justify-content-between mb-1 text-success small">
                      <span>✓ Travel Cost</span>
                      <span className="fw-semibold">PKR 0 (Same City)</span>
                    </div>
                  </div>
                )}
                
                {travelEstimate && travelEstimate.estimates && travelEstimate.source !== 'same_city' && (
                  <div className="border-top pt-2 mb-2">
                    <div className="d-flex justify-content-between mb-1 text-muted small">
                      <span>✈️ Travel Cost ({travelType === 'round_trip' ? 'Multi-Day + Accommodation' : 'Same-Day'})</span>
                      <span>PKR {travelEstimate.estimates[travelType]?.total?.toLocaleString() || "0"}</span>
                    </div>
                    {travelEstimate.estimates[travelType]?.breakdown && travelEstimate.estimates[travelType].breakdown.length > 0 && (
                      <div className="ms-3 small text-muted">
                        {travelEstimate.estimates[travelType].breakdown.map((item, idx) => (
                          <div key={idx} className="d-flex justify-content-between" style={{ fontSize: '0.75rem' }}>
                            <span>{item.label}</span>
                            <span>PKR {item.amount?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="small text-muted mt-1">
                      <span className="badge bg-secondary">{travelEstimate.source?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                )}

                {travelLoading && (
                  <div className="border-top pt-2 mb-2 text-muted small">
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Calculating travel cost...
                  </div>
                )}

                <div className="d-flex justify-content-between py-3 border-top border-bottom mb-3">
                  <span className="fw-bold fs-6">Total</span>
                  <span className="fw-bold fs-5 text-primary">
                    PKR {(calculatedPrice + (travelEstimate?.estimates?.[travelType]?.total || 0)).toLocaleString()}
                  </span>
                </div>

                {travelEstimate && travelEstimate.source !== 'same_city' && travelEstimate.estimates?.[travelType]?.total > 0 && (
                  <div className="alert alert-info py-2 mb-3 small">
                    <strong>ℹ️ Travel Cost Breakdown:</strong>
                    <ul className="mb-1 mt-2 ps-3" style={{ fontSize: '0.85rem' }}>
                      <li><strong>Round-Trip Travel:</strong> Bus/train fare (both ways)</li>
                      <li><strong>Local Transport:</strong> Taxi at destination (PKR 800)</li>
                      <li><strong>Handling Fee:</strong> Administrative & coordination costs (PKR 500)</li>
                      {travelType === 'round_trip' && (
                        <li><strong>Accommodation:</strong> Overnight stay for multi-day events (PKR 3,000)</li>
                      )}
                    </ul>
                    <small className="d-block text-muted">
                      {travelType === 'round_trip' 
                        ? '🏨 Multi-day package includes overnight accommodation'
                        : '📸 Same-day event: Photographer travels to location and returns home that day'}
                    </small>
                  </div>
                )}

                {/* Payment Summary */}
                <div className="mb-3">
                  <p className="small text-muted mb-2">Payment Plan:</p>

                  {/* Standard 50/50 Payment */}
                  <div className="border rounded-3 p-3 mb-2 border-primary bg-primary bg-opacity-10">
                    <div className="d-flex align-items-start">
                      <div className="text-primary me-2">✓</div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">Standard Payment (50/50)</div>
                        <div className="small text-muted">Pay 50% now to confirm, 50% after completion</div>
                        <div className="mt-2">
                          <div className="d-flex justify-content-between mb-1">
                            <span className="small">Advance Payment (Now):</span>
                            <span className="badge bg-primary">PKR {((calculatedPrice + (travelEstimate?.estimates?.[travelType]?.total || 0)) * 0.5).toLocaleString()}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="small text-muted">Remaining (After Work):</span>
                            <span className="badge bg-secondary">PKR {((calculatedPrice + (travelEstimate?.estimates?.[travelType]?.total || 0)) * 0.5).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="small text-muted mb-3">
                  <div className="d-flex align-items-center mb-1">
                    <span className="text-success me-2">✓</span> Free cancellation up to 48 hours
                  </div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="text-success me-2">✓</span> Secure payment via Stripe
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="text-success me-2">✓</span> Money-back guarantee
                  </div>
                </div>

                <div className="alert alert-light border small mb-0 py-2">
                  <strong>Note:</strong> Booking confirmed after advance payment. Travel charges may apply outside {photographer.location}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TermsModal show={showTermsModal} onHide={() => setShowTermsModal(false)} />    </div>
  )
}

export default BookingRequest
