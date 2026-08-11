import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // Assuming you're using React Router
import { all_routes } from "../../../feature-module/router/all_routes";
import ImageWithBasePath from "../imageWithBasePath";

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

      // Hide the loader after 2.5 seconds
      const timeoutId = setTimeout(() => {
        setShowLoader(false);
      }, 2500);

      return () => {
        clearTimeout(timeoutId); // Clear the timeout when component unmounts
      };
    } else {
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

export const Preloader = () => {
  return (
    <div id="global-loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999 }}>
      <div className="d-flex flex-column align-items-center">
        <ImageWithBasePath src="assets/img/Educatin.gif" alt="Loading..." style={{ maxWidth: '280px', height: 'auto' }} />
      </div>
    </div>
  );
};

export default Loader;
