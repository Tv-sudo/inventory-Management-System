import React, { useState } from 'react';
import toast from 'react-hot-toast';

const Register = ({ onBack }) => {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match.');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.');

    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDone(true);
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '64px', height: '64px', background: '#00b89415', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" fill="none" stroke="#00b894" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#2d3436', margin: '0 0 12px' }}>Registration Submitted</h2>
          <p style={{ color: '#636e72', fontSize: '14px', lineHeight: '1.7', margin: '0 0 28px' }}>
            Your account request has been submitted. The system administrator will review and approve your account before you can log in.
          </p>
          <button onClick={onBack} style={{ width: '100%', padding: '13px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '40px', maxWidth: '480px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#636e72', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', padding: 0 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Login
        </button>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ width: '44px', height: '44px', background: '#e67e22', borderRadius: '10px', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#2d3436', margin: '0 0 6px' }}>Request Account Access</h2>
          <p style={{ color: '#636e72', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
            Fill in your details. Your request will be reviewed by the administrator before you can access the system.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            { field: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
            { field: 'email', label: 'Work Email Address', type: 'email', placeholder: 'Enter your email' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '7px', fontWeight: 600, fontSize: '12px', color: '#2d3436', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </label>
              <input
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #dfe6e9', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f5f6fa' }}
                type={type} placeholder={placeholder}
                value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required
              />
            </div>
          ))}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '7px', fontWeight: 600, fontSize: '12px', color: '#2d3436', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ width: '100%', padding: '12px 48px 12px 14px', border: '1.5px solid #dfe6e9', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f5f6fa' }}
                type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#636e72', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', marginBottom: '7px', fontWeight: 600, fontSize: '12px', color: '#2d3436', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Confirm Password
            </label>
            <input
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #dfe6e9', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f5f6fa' }}
              type="password" placeholder="Repeat your password"
              value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#b2bec3' : '#e67e22', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Submitting...' : 'Submit Registration Request'}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '14px 16px', background: '#f5f6fa', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#636e72', lineHeight: '1.6' }}>
            Your account will be assigned the Standard User role by default. The administrator can upgrade your role after approval.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
