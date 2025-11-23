import React, { useState } from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import AppDownloads from '../components/landing/AppDownloads';
import '../styles/landing.css';

const Landing = () => {
  const [searchData, setSearchData] = useState({ city: '', service: 'all' });

  return (
    <div className="landing-page">
      <Hero searchData={searchData} setSearchData={setSearchData} />
      <Features />
      <HowItWorks />
      <AppDownloads />
    </div>
  );
};

export default Landing;
