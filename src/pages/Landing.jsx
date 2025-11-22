import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import TrustBar from '../components/landing/TrustBar';
import AppDownloads from '../components/landing/AppDownloads';
import Footer from '../components/landing/Footer';
import '../styles/landing.css';

const Landing = () => {
  const [searchData, setSearchData] = useState({
    city: '',
    service: 'all'
  });

  return (
    <div className="landing-page">
      <Navbar />
      <Hero searchData={searchData} setSearchData={setSearchData} />
      <Features />
      <HowItWorks />
      <TrustBar />
      <AppDownloads />
      <Footer />
    </div>
  );
};

export default Landing;