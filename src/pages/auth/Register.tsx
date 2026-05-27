import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
const logoIcon = '/images/logo.png';

type UserTypeOption = 'reu' | 'su' | 'eu' | 'gu' | '';

export default function Register() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<UserTypeOption>('');

  const signUp = () => {
    if (selectedType) {
      navigate(`/register/${selectedType}`);
    }
  };

  const getCardStyle = (type: UserTypeOption) => {
    const selectedColors: Record<string, string> = {
      reu: '#6AA1E0',
      su: '#FFE68D',
      eu: '#FF7F56',
      gu: '#81C166',
    };

    if (selectedType === type) {
      return {
        backgroundColor: selectedColors[type],
        border: '5px solid #2C628D',
        boxShadow: 'inset 0px 0px 5px 6px rgba(34, 34, 34, 0.49)',
      };
    }
    return {
      backgroundColor: '#2C628D',
      border: 'none',
    };
  };

  const getTextColor = (type: UserTypeOption) => {
    return selectedType === type ? 'black' : 'white';
  };

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

        {/* Register Container */}
        <div className="flex-1 flex items-center justify-center px-4 mt-2">
          <div className="register-container">
            <h2 className="register-heading">Select Your User Type</h2>

            {/* 2x2 Grid */}
            <div className="cards-grid">
              <div
                className="user-card"
                style={getCardStyle('reu')}
                onClick={() => setSelectedType('reu')}
              >
                <img
                  src={selectedType === 'reu' ? '/images/reu_black.svg' : '/images/reu.svg'}
                  alt="Architecture"
                  onError={(e) => { e.currentTarget.src = '/images/reu.svg'; }}
                />
                <p className="card-text" style={{ color: getTextColor('reu') }}>
                  I'm a real estate owner/manager
                </p>
              </div>
              <div
                className="user-card"
                style={getCardStyle('su')}
                onClick={() => setSelectedType('su')}
              >
                <img
                  src={selectedType === 'su' ? '/images/su_black.svg' : '/images/su.svg'}
                  alt="Energy"
                  onError={(e) => { e.currentTarget.src = '/images/su.svg'; }}
                />
                <p className="card-text" style={{ color: getTextColor('su') }}>
                  I'm an LED supplier
                </p>
              </div>
              <div
                className="user-card"
                style={getCardStyle('eu')}
                onClick={() => setSelectedType('eu')}
              >
                <img
                  src={selectedType === 'eu' ? '/images/el_black.svg' : '/images/el.svg'}
                  alt="Electrician"
                  onError={(e) => { e.currentTarget.src = '/images/el.svg'; }}
                />
                <p className="card-text" style={{ color: getTextColor('eu') }}>
                  I'm an electrician/electrical contractor
                </p>
              </div>
              <div
                className="user-card"
                style={getCardStyle('gu')}
                onClick={() => setSelectedType('gu')}
              >
                <img
                  src={selectedType === 'gu' ? '/images/gu_black.svg' : '/images/gu.svg'}
                  alt="Education"
                  onError={(e) => { e.currentTarget.src = '/images/gu.svg'; }}
                />
                <p className="card-text" style={{ color: getTextColor('gu') }}>
                  I'm just here to learn!
                </p>
              </div>
            </div>

            {/* Sign Up Button */}
            <button
              type="button"
              className="signup-button"
              disabled={!selectedType}
              onClick={signUp}
              style={{
                backgroundColor: !selectedType ? '#A9A9A9' : '#619C48',
                cursor: !selectedType ? 'not-allowed' : 'pointer',
              }}
            >
              <img src="/images/sign_up.svg" alt="Sign Up" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <p className="signup-button-text">Sign Up</p>
            </button>
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
          padding: 32px 80px;
          max-width: 900px;
          width: 100%;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(34, 34, 34, 0.25);
          background: rgba(255, 255, 255, 0.8);
        }

        .register-heading {
          margin: 8px 0 0 0;
          font-size: 36px;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 700;
          color: black;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: 360px 360px;
          grid-template-rows: 200px 200px;
          gap: 1.5rem;
          padding: 1.5rem 0;
        }

        .user-card {
          cursor: pointer;
          position: relative;
          overflow: hidden;
          height: 200px;
          width: 360px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-card img {
          max-height: 75px;
          max-width: 91px;
        }

        .card-text {
          position: absolute;
          bottom: 10px;
          margin: 0;
          font-size: 15px;
          font-family: 'Titillium Web', sans-serif;
        }

        .signup-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 467px;
          height: 40px;
          border: none;
          border-radius: 5px;
        }
        .signup-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .signup-button-text {
          margin: 0;
          font-family: 'Titillium Web', sans-serif;
          font-weight: 600;
          font-size: 18px;
          color: white;
        }
      `}</style>
    </div>
  );
}
