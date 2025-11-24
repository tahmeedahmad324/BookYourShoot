import React, { useState } from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import AppDownloads from '../components/landing/AppDownloads';
import '../styles/landing.css';

const Landing = () => {
  // searchData removed with search form removal

  return (
    <div className="landing-page">
      <Hero />
      <Features />
      <HowItWorks />
      <AppDownloads />
    </div>
  );
};

export default Landing;
