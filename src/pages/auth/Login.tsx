import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
const logoIcon = '/images/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError('Incorrect username or password.');
      toast.error(error.message);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with overlapping circles */}
      <div className="absolute inset-0" style={{ backgroundColor: '#d4d4d4' }}>
        {/* Top-left green circle */}
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
        {/* Top-right blue circle */}
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
        {/* Bottom-left green circle */}
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
        {/* Bottom-center yellow circle */}
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
        {/* Bottom-right blue circle */}
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
            {/* Logo */}
            <a href="https://www.focusearth.com" target="_blank" rel="noopener noreferrer">
              <img src={logoIcon} alt="logo" className="h-10" />
            </a>

            {/* Navigation */}
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

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 mt-8">
          <div className="login-container">
            <form onSubmit={handleSubmit}>
              <div className="login-stack">
                <h2 className="login-heading">
                  Welcome to the Energy Portal
                </h2>

                {/* Email */}
                <div className="input-group">
                  <label style={{ width: '100%' }}>
                    <span className="input-label">Email:</span>
                    <input
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="login-input"
                      required
                    />
                  </label>
                </div>

                {/* Password */}
                <div className="input-group">
                  <label style={{ width: '100%' }}>
                    <span className="input-label">Password:</span>
                    <input
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input"
                      required
                    />
                  </label>
                </div>

                {error && (
                  <p className="text-red-500 text-sm m-0">{error}</p>
                )}

                {/* Login Button */}
                <button type="submit" className="login-button" disabled={loading}>
                  <img width="25px" src="/images/login.svg" alt="Energy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <p className="login-button-text">
                    {loading ? 'Logging in...' : 'Login'}
                  </p>
                </button>

                {/* Bottom Row */}
                <div className="bottom-row">
                  <span className="bottom-row-inner">
                    <div className="bottom-left">
                      Don't have an account?
                    </div>
                    <div className="bottom-middle">
                      <Link to="/register">
                        <button type="button" className="bottom-link">
                          Sign Up
                        </button>
                      </Link>
                    </div>
                    <div className="bottom-right">
                      <Link to="/forgot-password">
                        <button type="button" className="bottom-link">
                          Forgot password?
                        </button>
                      </Link>
                    </div>
                  </span>
                </div>
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

        .login-container {
          position: relative;
          display: flex;
          align-items: center;
          flex-direction: column;
          margin: 0 16px;
          margin-top: 30px;
          padding: 48px 80px;
          max-width: 900px;
          width: 100%;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(34, 34, 34, 0.25);
          background: rgba(255, 255, 255, 0.8);
        }

        .login-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 761px;
          max-width: 100%;
          margin-bottom: 48px;
          gap: 20px;
        }

        .login-heading {
          margin: 0;
          font-size: 36px;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 700;
          color: black;
        }

        .input-group {
          width: 100%;
          border-radius: 5px;
        }

        .input-label {
          font-family: 'Titillium Web', sans-serif;
          color: #2C628D;
          font-weight: 600;
        }

        .login-input {
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
        .login-input:focus {
          box-shadow: none;
          outline: none;
        }
        .login-input::placeholder {
          color: #a9a9a9;
          opacity: 1;
        }

        .login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 467px;
          height: 40px;
          background-color: #6B9E78;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .login-button:hover {
          background-color: #5a8a66;
        }
        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-button-text {
          margin: 0;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: white;
        }

        .bottom-row {
          width: 100%;
          min-height: 50px;
          border: 1px solid #A9A9A9;
          border-radius: 6px;
          background: white;
        }

        .bottom-row-inner {
          display: flex;
          align-items: center;
          min-height: 50px;
          font-size: 16px;
        }

        .bottom-left {
          width: 40%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #A9A9A9;
          font-weight: 400;
          font-size: 18px;
          font-style: italic;
          color: black;
        }

        .bottom-middle {
          width: 20%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #A9A9A9;
        }

        .bottom-right {
          width: 40%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .bottom-link {
          font-family: 'Titillium Web', sans-serif;
          background: transparent;
          border: none;
          text-decoration: underline;
          font-weight: 600;
          font-size: 18px;
          color: black;
          cursor: pointer;
        }
        .bottom-link:hover {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
