'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    gymName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard (we'll create this later)
        alert('Account created successfully!');
        router.push('/dashboard');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Server error. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };


    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="container">
            <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
                <div className="card shadow-lg border-0 rounded-4">
                <div className="card-body p-5">
                    
                    {/* Header */}
                    <div className="text-center mb-4">
                    <div className="mb-3">
                        <i className="bi bi-building fs-1 text-primary"></i>
                    </div>
                    <h3 className="fw-bold">Create your gym account</h3>
                    <p className="text-muted small">
                        Start managing your gym memberships digitally
                    </p>
                    </div>

                    {/* Error */}
                    {error && (
                    <div className="alert alert-danger small">{error}</div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>

                    {/* Gym Name */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Gym Name</label>
                        <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi bi-house-door"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            name="gymName"
                            required
                            placeholder="Fitness Pro Gym"
                            value={formData.gymName}
                            onChange={handleChange}
                        />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Email</label>
                        <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi bi-envelope"></i>
                        </span>
                        <input
                            type="email"
                            className="form-control"
                            name="email"
                            required
                            placeholder="owner@gym.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                    <label className="form-label fw-semibold">Password</label>
                    <div className="input-group">
                        <span className="input-group-text">
                        <i className="bi bi-lock"></i>
                        </span>

                        <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        name="password"
                        required
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        />

                        <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                    </div>
                    </div>


                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn btn-primary w-100 py-2 fw-semibold"
                        disabled={loading}
                    >
                        {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Creating account...
                        </>
                        ) : (
                        'Create account'
                        )}
                    </button>
                    </form>

                    {/* Footer */}
                    <div className="text-center mt-4">
                    <small className="text-muted">
                        Already have an account?{' '}
                        <a href="/login" className="fw-semibold text-decoration-none">
                        Sign in
                        </a>
                    </small>
                    </div>

                </div>
                </div>

                {/* Extra trust text */}
                <p className="text-center text-muted small mt-3">
                🔒 Secure & encrypted · No credit card required
                </p>

            </div>
            </div>
        </div>
        </div>
    );
}