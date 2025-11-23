import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="container py-5">
        <h2 className="fw-bold mb-3">Profile</h2>
        <p className="text-muted">You are not logged in.</p>
      </div>
    );
  }
  return (
    <div className="container py-5">
      <h2 className="fw-bold mb-3">Profile</h2>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="card-title mb-3">{user.name}</h5>
          <p className="mb-1"><strong>Email:</strong> {user.email}</p>
          <p className="mb-1"><strong>Role:</strong> {user.role}</p>
          <p className="text-muted mt-3 mb-0">This is a placeholder profile page. We will expand it later.</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
