import photographersData from '../data/photographers.json';

// Mock API functions for the landing page
export const searchPhotographers = async (city, service = 'all') => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let photographers = photographersData.photographers;
  
  // Filter by city
  if (city) {
    photographers = photographers.filter(photographer => 
      photographer.location.toLowerCase().includes(city.toLowerCase())
    );
  }
  
  // Filter by service
  if (service !== 'all') {
    photographers = photographers.filter(photographer => 
      photographer.specialty.some(specialty => 
        specialty.toLowerCase().includes(service.toLowerCase())
      )
    );
  }
  
  // Sort by rating and availability
  photographers.sort((a, b) => {
    if (a.availability !== b.availability) {
      return b.availability - a.availability;
    }
    return b.rating - a.rating;
  });
  
  return photographers;
};

// Get photographer by ID
export const getPhotographerById = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const photographer = photographersData.photographers.find(p => p.id === parseInt(id));
  return photographer || null;
};

// Get cities from photographers data
export const getPopularCities = () => {
  const cities = photographersData.photographers.map(p => p.location);
  return [...new Set(cities)];
};

// Get services from photographers data
export const getPopularServices = () => {
  const services = photographersData.photographers.flatMap(p => p.specialty);
  return [...new Set(services)];
};

// Mock booking function
export const createBookingRequest = async (photographerId, bookingData) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate booking creation
  const booking = {
    id: Math.floor(Math.random() * 10000),
    photographerId,
    ...bookingData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  return booking;
};

// Mock review submission
export const submitReview = async (photographerId, reviewData) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const review = {
    id: Math.floor(Math.random() * 10000),
    photographerId,
    ...reviewData,
    createdAt: new Date().toISOString()
  };
  
  return review;
};
