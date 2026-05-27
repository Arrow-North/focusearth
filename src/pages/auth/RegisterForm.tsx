import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { USER_TYPE_LABELS } from '@/lib/roles';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import type { UserType } from '@/types/database';

const logoIcon = '/images/logo.png';

export default function RegisterForm() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const userType = role as UserType;
  const label = USER_TYPE_LABELS[userType] ?? 'User';

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      type: userType,
      username: form.email,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created. Please check your email to confirm.');
      navigate('/confirm-email');
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with overlapping circles */}
      <div className="absolute inset-0" style={{ backgroundColor: '#d4d4d4' }}>
        <div
          className="absolute rounded-full"
          style={{
            backgroundColor: '#9CB59D',
            width: '1100px',
            height: '1100px',
            top: '-350px',
            left: '-350px',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            backgroundColor: '#9BB8C9',
            width: '1000px',
            height: '1000px',
            top: '-300px',
            right: '-350px',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            backgroundColor: '#9CB59D',
            width: '900px',
            height: '900px',
            bottom: '-400px',
            left: '-250px',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            backgroundColor: '#E5D9A5',
            width: '1000px',
            height: '1000px',
            bottom: '-500px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            backgroundColor: '#9BB8C9',
            width: '850px',
            height: '850px',
            bottom: '-350px',
            right: '-300px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full max-w-[1200px] mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <a href="https://www.focusearth.com" target="_blank" rel="noopener noreferrer">
              <img src={logoIcon} alt="logo" className="h-10" />
            </a>

            <ul className="hidden lg:flex items-center gap-0 list-none m-0 p-0">
              <li>
                <button className="nav-button">
                  <span>Solutions</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
              </li>
              <li>
                <button className="nav-button">
                  <span>Sectors</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
              </li>
              <li>
                <a href="https://www.focusearth.com/insights" className="nav-link">
                  Insights
                </a>
              </li>
              <li>
                <a href="https://www.focusearth.com/contact" className="nav-link">
                  Contact
                </a>
              </li>
              <li className="flex items-center gap-2 ml-4">
                <Link to="/register">
                  <button className="header-btn">
                    <h2 className="m-0 text-base font-semibold">Get Started</h2>
                  </button>
                </Link>
                <Link to="/login">
                  <button className="header-btn">
                    <h2 className="m-0 text-base font-semibold">Login</h2>
                  </button>
                </Link>
              </li>
            </ul>
          </div>
        </header>

        {/* Register Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 mt-2">
          <div className="register-container">
            {/* Back Button */}
            <Link to="/register" className="back-button">
              <img width="25px" src="/images/back_register.png" alt="back arrow" />
              <p className="back-text">BACK</p>
            </Link>

            <form noValidate onSubmit={handleSubmit}>
              <div className="form-content">
                <h2 className="form-heading">Welcome to the Energy Portal</h2>

                {/* 2-column Grid */}
                <div className="form-grid">
                  <div className="form-field">
                    <label style={{ width: '100%' }}>
                      <span className="field-label">First Name:</span>
                      <input
                        name="firstName"
                        value={form.first_name}
                        onChange={(e) => updateField('first_name', e.target.value)}
                        className="form-input"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-field">
                    <label style={{ width: '100%' }}>
                      <span className="field-label">Last Name:</span>
                      <input
                        name="lastName"
                        value={form.last_name}
                        onChange={(e) => updateField('last_name', e.target.value)}
                        className="form-input"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-field">
                    <label style={{ width: '100%' }}>
                      <span className="field-label">Email Address:</span>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="form-input"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-field">
                    <label style={{ width: '100%' }}>
                      <span className="field-label">Phone Number:</span>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="form-input"
                        autoComplete="on"
                      />
                    </label>
                  </div>
                  <div className="form-field">
                    <label style={{ width: '100%' }}>
                      <span className="field-label">Password:</span>
                      <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        className="form-input"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-field">
                    <label style={{ width: '100%' }}>
                      <span className="field-label">Repeat Password:</span>
                      <input
                        name="repeatPassword"
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        className="form-input"
                        required
                      />
                    </label>
                  </div>
                </div>

                <p className="password-hint">
                  Minimum of 8 characters, one capital letter, and one number
                </p>

                {/* Terms & Conditions */}
                <label className="terms-container">
                  <span className="terms-label">Terms & Conditions:</span>
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={() => setTermsAccepted(!termsAccepted)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-custom"></span>
                    <span className="checkbox-text">
                      Check here to indicate you have read and agree to the terms outlined in the Energy Portal &nbsp;
                      <a
                        href="https://www.focusearth.com/terms-of-service-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="terms-link"
                      >
                        Terms & Conditions
                      </a>
                    </span>
                  </label>
                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!termsAccepted || loading}
                  className="submit-button"
                  style={{
                    backgroundColor: !termsAccepted ? '#A9A9A9' : '#619C48',
                    cursor: !termsAccepted || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <img width="20px" src="/images/sign_up.svg" alt="Sign Up" />
                  <p className="submit-text">
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </p>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&display=swap');

        .nav-button {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          font-size: 16px;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 400;
          color: black;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .nav-button:hover {
          opacity: 0.7;
        }

        .nav-link {
          padding: 8px 16px;
          font-size: 16px;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 400;
          color: black;
          text-decoration: none;
        }
        .nav-link:hover {
          opacity: 0.7;
        }

        .header-btn {
          padding: 8px 24px;
          background: white;
          border: 1px solid black;
          border-radius: 9999px;
          cursor: pointer;
          font-family: 'Titillium Web', sans-serif;
        }
        .header-btn:hover {
          background: #f5f5f5;
        }

        .register-container {
          position: relative;
          display: flex;
          align-items: center;
          flex-direction: column;
          margin: 0 16px;
          margin-top: 10px;
          padding: 48px 80px;
          max-width: 900px;
          width: 100%;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(34, 34, 34, 0.25);
          background: rgba(255, 255, 255, 0.8);
        }

        .back-button {
          position: absolute;
          top: 30px;
          left: 30px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .back-button:hover {
          opacity: 0.7;
        }

        .back-text {
          margin: 0;
          margin-left: 4px;
          font-family: 'Titillium Web', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: black;
        }

        .form-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 761px;
          max-width: 100%;
          margin-bottom: 48px;
        }

        .form-heading {
          text-align: center;
          margin: -20px 0 12px 0;
          font-size: 36px;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 700;
          color: black;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
          margin-top: 32px;
          width: 100%;
        }

        .form-field {
          width: 100%;
        }

        .field-label {
          font-family: 'Titillium Web', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #2C628D;
        }

        .form-input {
          width: 100%;
          padding-left: 2.5rem;
          padding-right: 1rem;
          background: #fff;
          margin-top: 5px;
          min-height: 50px;
          border: 1px solid #A9A9A9;
          font-size: 18px;
          border-radius: 5px;
          outline: none;
          box-sizing: border-box;
        }
        .form-input:focus {
          box-shadow: none;
          outline: none;
        }

        .password-hint {
          font-size: 12px;
          color: #666;
          margin: 8px 0 20px 0;
        }

        .terms-container {
          display: block;
        }

        .terms-label {
          display: block;
          font-family: 'Titillium Web', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #2C628D;
          margin-bottom: 8px;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          border: 1px solid #A9A9A9;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
        }

        .checkbox-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-custom {
          width: 20px;
          height: 20px;
          min-width: 20px;
          border: 2px solid #A9A9A9;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .checkbox-input:checked + .checkbox-custom {
          background: #2C628D;
          border-color: #2C628D;
        }

        .checkbox-input:checked + .checkbox-custom::after {
          content: '✓';
          color: white;
          font-size: 14px;
        }

        .checkbox-text {
          font-size: 14px;
          color: #222222;
        }

        .terms-link {
          border-bottom: 1px solid #A9A9A9;
          color: inherit;
          text-decoration: none;
        }
        .terms-link:hover {
          opacity: 0.7;
        }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 467px;
          height: 40px;
          margin: 48px auto 0;
          border: none;
          border-radius: 5px;
        }
        .submit-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .submit-text {
          margin: 0;
          margin-left: 4px;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 600;
          font-size: 18px;
          color: white;
        }
      `}</style>
    </div>
  );
}
