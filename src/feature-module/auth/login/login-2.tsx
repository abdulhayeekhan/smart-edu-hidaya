import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { Companylogo, Copyright, CoverPhoto, CurrYear, BrandName } from '../../../environment'
import useAuth from "../../../hooks/useAuth";
import { LoginParams } from "../../../context/AuthContext";

type PasswordField = "password";

const Login2 = () => {
  const routes = all_routes;
  const navigation = useNavigate();


  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const [rememberMe, setRememberMe] = useState(true);
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<LoginParams>({
    username: "",
    password: "",
    rememberMe: true,
  });

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    const { username, password } = data;

    try {
      await auth.login({ username, password, rememberMe });
      // success — maybe navigate to dashboard
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Login failed:", error.message);
      } else {
        console.error("Login failed:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <div className="container-fluid p-0">
        {/* Injecting Custom Animations for the WOW Factor */}
        <style>
          {`
            @keyframes blobFloat {
              0% { transform: translate(0px, 0px) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.9); }
              100% { transform: translate(0px, 0px) scale(1); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes marquee {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            @keyframes floatBadge {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
              100% { transform: translateY(0px); }
            }
            .animated-badge {
              animation: floatBadge 4s ease-in-out infinite;
            }
            .marquee-text {
              position: absolute;
              top: 50%;
              left: 0;
              width: 100%;
              transform: translateY(-50%);
              white-space: nowrap;
              font-size: 12vw;
              font-weight: 900;
              color: rgba(255, 255, 255, 0.03);
              animation: marquee 25s linear infinite;
              pointer-events: none;
              z-index: 1;
            }
            .animated-blob-1 {
              animation: blobFloat 8s infinite ease-in-out;
            }
            .animated-blob-2 {
              animation: blobFloat 10s infinite ease-in-out reverse;
            }
            .premium-btn {
              background: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%);
              border: none;
              color: #001F3F;
              transition: all 0.3s ease;
            }
            .premium-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(212, 175, 55, 0.4);
              color: #001F3F;
            }
            .premium-input:focus {
              box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2) !important;
              border-color: #D4AF37 !important;
            }
            .glass-panel {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1);
            }
            .fade-in-element {
              animation: fadeIn 0.8s ease-out forwards;
            }
            .login-right-side {
              background: #fdfdfd;
            }
          `}
        </style>

        <div className="login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
          <div className="row g-0 h-100">
            {/* Left Side - Vibrant Educational Hero */}
            <div className="col-lg-7 d-none d-lg-flex position-relative align-items-center justify-content-center h-100" 
                 style={{
                   background: 'linear-gradient(135deg, #001F3F 0%, #0a3366 60%, #D4AF37 100%)',
                   overflow: 'hidden'
                 }}>
              
              {/* Dynamic Animated Blobs */}
              <div className="animated-blob-1" style={{ position: 'absolute', top: '10%', left: '-5%', width: '450px', height: '450px', background: 'rgba(212, 175, 55, 0.15)', borderRadius: '50%', filter: 'blur(50px)' }}></div>
              <div className="animated-blob-2" style={{ position: 'absolute', bottom: '-10%', right: '10%', width: '550px', height: '550px', background: 'rgba(0, 31, 63, 0.4)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
              
              {/* Background Moving Text */}
              <div className="marquee-text">EMPOWERING STUDENTS • INSPIRING LEADERS • FOSTERING EXCELLENCE •</div>
              
              <div className="glass-panel text-center text-white fade-in-element" style={{
                borderRadius: '30px',
                padding: '4rem',
                maxWidth: '75%',
                zIndex: 10
              }}>
                <div className="mb-5">
                  <div style={{ background: 'white', padding: '20px', borderRadius: '20px', display: 'inline-block', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
                    <ImageWithBasePath src={CoverPhoto} alt="School Logo" style={{ maxWidth: '200px' }} />
                  </div>
                </div>
                
                <h1 className="display-4 fw-bold mb-3" style={{ color: '#FFD700', letterSpacing: '-1px', textShadow: '0 4px 15px rgba(255, 215, 0, 0.4)' }}>
                  Shape Your Future.
                </h1>
                
                <p className="lead fs-5 mb-5 mx-auto" style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.8', maxWidth: '600px', fontWeight: '300' }}>
                  Welcome to a world-class educational portal designed to empower students, connect educators, and inspire the next generation of global leaders.
                </p>

                <div className="d-flex justify-content-center gap-4 flex-wrap mt-4">
                  <div className="animated-badge d-flex align-items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '30px' }}>
                    <i className="ti ti-book text-warning fs-4"></i>
                    <span className="fw-medium">World-Class Curriculum</span>
                  </div>
                  <div className="animated-badge d-flex align-items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '30px', animationDelay: '2s' }}>
                    <i className="ti ti-chart-pie text-info fs-4"></i>
                    <span className="fw-medium">Smart Analytics</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Premium Login Form */}
            <div className="col-lg-5 col-md-12 d-flex align-items-center justify-content-center h-100 login-right-side">
              <div className="w-100 p-4 p-md-5 fade-in-element" style={{ maxWidth: '520px', animationDelay: '0.2s' }}>
                <form onSubmit={e => onSubmit(e)}>
                  
                  {/* Mobile Logo */}
                  <div className="d-block d-lg-none text-center mb-5">
                    <ImageWithBasePath src={Companylogo} className="img-fluid" alt="Logo" style={{ maxWidth: '160px' }} />
                  </div>

                  <div className="card border-0 bg-transparent">
                    <div className="card-body p-0">
                      
                      <div className="mb-5">
                        <h2 className="fw-bold mb-2" style={{ color: '#1E293B', fontSize: '2rem' }}>Staff Portal</h2>
                        <p className="mb-0" style={{ color: '#64748B', fontSize: '1.1rem' }}>Please sign in to access your dashboard.</p>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold" style={{ color: '#334155' }}>Username / Student ID</label>
                        <div className="input-icon position-relative">
                          <span className="input-icon-addon position-absolute" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 10 }}>
                            <i className="ti ti-mail fs-5" />
                          </span>
                          <input 
                            type="text" 
                            name="username" 
                            onChange={e => handleInfoChange(e)} 
                            className="form-control form-control-lg premium-input" 
                            placeholder="e.g. HDS-2023-001"
                            style={{ 
                              paddingLeft: '3rem', 
                              height: '56px', 
                              backgroundColor: '#F1F5F9',
                              border: '1px solid transparent',
                              borderRadius: '12px'
                            }}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label fw-semibold mb-0" style={{ color: '#334155' }}>Password</label>
                          <Link to={routes.forgotPassword} className="text-decoration-none small fw-semibold" style={{ color: '#4776E6' }}>
                            Forgot Password?
                          </Link>
                        </div>
                        <div className="pass-group position-relative">
                          <span className="input-icon-addon position-absolute" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 10 }}>
                            <i className="ti ti-lock fs-5" />
                          </span>
                          <input
                            type={passwordVisibility.password ? "text" : "password"}
                            name="password"
                            onChange={e => handleInfoChange(e)}
                            className="pass-input form-control form-control-lg premium-input"
                            placeholder="Enter your password"
                            style={{ 
                              paddingLeft: '3rem', 
                              height: '56px',
                              backgroundColor: '#F1F5F9',
                              border: '1px solid transparent',
                              borderRadius: '12px'
                            }}
                          />
                          <span
                            className={`ti toggle-passwords position-absolute ${passwordVisibility.password ? "ti-eye" : "ti-eye-off"}`}
                            onClick={() => togglePasswordVisibility("password")}
                            style={{ right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 10, color: '#94A3B8' }}
                          ></span>
                        </div>
                      </div>

                      <div className="form-check mb-5 d-flex align-items-center">
                        <input
                          className="form-check-input mt-0 shadow-none"
                          type="checkbox"
                          id="rememberMe"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <label className="form-check-label ms-2" htmlFor="rememberMe" style={{ color: '#64748B', cursor: 'pointer' }}>
                          Keep me signed in on this device
                        </label>
                      </div>

                      <div className="mb-0">
                        <button
                          type="submit"
                          className="premium-btn w-100 fw-bold"
                          disabled={isLoading || !rememberMe}
                          style={{ 
                            borderRadius: '12px',
                            height: '60px',
                            fontSize: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isLoading ? (
                            <span><i className="ti ti-loader ti-spin me-2 fs-4"></i>Authenticating...</span>
                          ) : (
                            <span className="d-flex align-items-center">Sign In to Portal <i className="ti ti-arrow-right ms-2 fs-4"></i></span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 text-center">
                    <p className="small mb-0" style={{ color: '#94A3B8' }}>
                      &copy; {CurrYear}{" "}
                      <a href="https://smartedu.site/" target="_blank" rel="noopener noreferrer" className="fw-semibold text-dark text-decoration-none hover-a">
                        Smart Edu
                      </a>. <br className="d-block d-sm-none" /> Powered by <a href="https://devprism.site/" target="_blank" rel="noopener noreferrer" className="text-dark text-decoration-none fw-semibold hover-a">{Copyright}</a>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login2;
