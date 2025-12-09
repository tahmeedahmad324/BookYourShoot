import React, { useState } from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import PhotographerCTA from '../components/landing/PhotographerCTA';
import PlatformFeatures from '../components/landing/PlatformFeatures';
import '../styles/landing.css';

const Landing = () => {
  // searchData removed with search form removal

  return (
    <div className="landing-page">
      <Hero />
      <HowItWorks />
      <Features />
      <PhotographerCTA />
      <PlatformFeatures />
    </div>
  );
};

export default Landing;
