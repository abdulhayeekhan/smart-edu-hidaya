import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // Assuming you're using React Router
import { all_routes } from "../../../feature-module/router/all_routes";

const Loader = () => {
  const routes = all_routes
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
      

    if (location.pathname === routes.adminDashboard || location.pathname === routes.teacherDashboard 
      || location.pathname === routes.studentDashboard || location.pathname === routes.parentDashboard 
    ) {
      
      // Show the loader when navigating to a new route
      setShowLoader(true);

      // Hide the loader after 2 seconds
      const timeoutId = setTimeout(() => {
        setShowLoader(false);
      }, 2000);

      return () => {
        clearTimeout(timeoutId); // Clear the timeout when component unmounts
      };
    }else {
      setShowLoader(false)
    }
  }, [location.pathname]);

  return (
    <>
      {showLoader && <Preloader />}
      <div>
        {/* Your other content goes here */}
      </div>
    </>
  );
};

const Preloader = () => {
  return (
    <div id="global-loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111111', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999 }}>
      <style>
        {`
          .book-loader {
            --color: #FFD700;
            --duration: 6.8s;
            width: 32px;
            height: 12px;
            position: relative;
            margin: 32px 0 0 0;
            zoom: 1.5;
          }
          .book-loader .inner {
            width: 32px;
            height: 12px;
            position: relative;
            transform-origin: 2px 2px;
            transform: rotateZ(-90deg);
            animation: book-loader var(--duration) ease infinite;
          }
          .book-loader .inner .left,
          .book-loader .inner .right {
            width: 60px;
            height: 4px;
            top: 0;
            border-radius: 2px;
            background: var(--color);
            position: absolute;
          }
          .book-loader .inner .left {
            right: 28px;
            transform-origin: 58px 2px;
            transform: rotateZ(90deg);
            animation: left var(--duration) ease infinite;
          }
          .book-loader .inner .right {
            left: 28px;
            transform-origin: 2px 2px;
            transform: rotateZ(-90deg);
            animation: right var(--duration) ease infinite;
          }
          .book-loader .inner .middle {
            width: 32px;
            height: 12px;
            border: 4px solid var(--color);
            border-top: 0;
            border-radius: 0 0 9px 9px;
            transform: translateY(2px);
          }
          .book-loader ul {
            margin: 0;
            padding: 0;
            list-style: none;
            position: absolute;
            left: 50%;
            top: 0;
          }
          .book-loader ul li {
            height: 4px;
            border-radius: 2px;
            transform-origin: 100% 2px;
            width: 48px;
            right: 0;
            top: -10px;
            position: absolute;
            background: var(--color);
            transform: rotateZ(0deg) translateX(-18px);
            animation-duration: var(--duration);
            animation-timing-function: ease;
            animation-iteration-count: infinite;
          }
          .book-loader ul li:nth-child(1) { animation-name: page-1; }
          .book-loader ul li:nth-child(2) { animation-name: page-2; }
          .book-loader ul li:nth-child(3) { animation-name: page-3; }
          .book-loader ul li:nth-child(4) { animation-name: page-4; }
          .book-loader ul li:nth-child(5) { animation-name: page-5; }
          .book-loader ul li:nth-child(6) { animation-name: page-6; }
          
          @keyframes page-1 { 4% { transform: rotateZ(0deg) translateX(-18px); } 13%, 54% { transform: rotateZ(180deg) translateX(-18px); } 63% { transform: rotateZ(0deg) translateX(-18px); } }
          @keyframes page-2 { 5.86% { transform: rotateZ(0deg) translateX(-18px); } 14.74%, 55.86% { transform: rotateZ(180deg) translateX(-18px); } 64.74% { transform: rotateZ(0deg) translateX(-18px); } }
          @keyframes page-3 { 7.72% { transform: rotateZ(0deg) translateX(-18px); } 16.48%, 57.72% { transform: rotateZ(180deg) translateX(-18px); } 66.48% { transform: rotateZ(0deg) translateX(-18px); } }
          @keyframes page-4 { 9.58% { transform: rotateZ(0deg) translateX(-18px); } 18.22%, 59.58% { transform: rotateZ(180deg) translateX(-18px); } 68.22% { transform: rotateZ(0deg) translateX(-18px); } }
          @keyframes page-5 { 11.44% { transform: rotateZ(0deg) translateX(-18px); } 19.96%, 61.44% { transform: rotateZ(180deg) translateX(-18px); } 70.96% { transform: rotateZ(0deg) translateX(-18px); } }
          @keyframes page-6 { 13.3% { transform: rotateZ(0deg) translateX(-18px); } 21.7%, 63.3% { transform: rotateZ(180deg) translateX(-18px); } 72.7% { transform: rotateZ(0deg) translateX(-18px); } }
          @keyframes left { 4% { transform: rotateZ(90deg); } 10%, 40% { transform: rotateZ(0deg); } 46%, 54% { transform: rotateZ(90deg); } 60%, 90% { transform: rotateZ(0deg); } 96% { transform: rotateZ(90deg); } }
          @keyframes right { 4% { transform: rotateZ(-90deg); } 10%, 40% { transform: rotateZ(0deg); } 46%, 54% { transform: rotateZ(-90deg); } 60%, 90% { transform: rotateZ(0deg); } 96% { transform: rotateZ(-90deg); } }
          @keyframes book-loader { 4% { transform: rotateZ(-90deg); } 10%, 40% { transform: rotateZ(0deg); transform-origin: 2px 2px; } 40.01%, 59.99% { transform-origin: 30px 2px; } 46%, 54% { transform: rotateZ(90deg); } 60%, 90% { transform: rotateZ(0deg); transform-origin: 2px 2px; } 96% { transform: rotateZ(-90deg); } }
        `}
      </style>
      <div className="d-flex flex-column align-items-center">
        <div className="book-loader">
          <div className="inner">
            <div className="left"></div>
            <div className="middle"></div>
            <div className="right"></div>
          </div>
          <ul>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
        <h4 className="mt-5 text-white fw-bold" style={{ letterSpacing: '3px', fontSize: '1.2rem', opacity: 0.9 }}>LOADING PORTAL...</h4>
      </div>
    </div>
  );
};

export default Loader;
