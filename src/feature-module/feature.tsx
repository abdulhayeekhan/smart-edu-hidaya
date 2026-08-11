import { useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router";
import Header from "../core/common/header";
import Sidebar from "../core/common/sidebar";
import ThemeSettings from "../core/common/theme-settings";
import Loader from "../core/common/loader";
import ImageWithBasePath from "../core/common/imageWithBasePath";
import { useEffect, useState } from "react";
import { all_routes } from "./router/all_routes";
const Feature = () => {
  const routes = all_routes;
  const [showLoader, setShowLoader] = useState(true);
  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );
  const miniSidebar = useSelector(
    (state: any) => state.sidebarSlice.miniSidebar
  );
  const expandMenu = useSelector((state: any) => state.sidebarSlice.expandMenu);

  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);
  const dataTopBar = useSelector((state: any) => state.themeSetting.dataTopBar);
  const dataTheme = useSelector((state: any) => state.themeSetting.dataTheme);
  const dataSidebar = useSelector(
    (state: any) => state.themeSetting.dataSidebar
  );
  const dataSidebarBg = useSelector(
    (state: any) => state.themeSetting.dataSidebarBg
  );
  const dataColor = useSelector((state: any) => state.themeSetting.dataColor);
  const location = useLocation();
  useEffect(() => {
    if (dataTheme === "dark_data_theme") {
      document.documentElement.setAttribute("data-theme", "darks");
    } else {
      document.documentElement.setAttribute("data-theme", "");
    }
  }, [dataTheme]);
  useEffect(() => {
    if (
      location.pathname === routes.adminDashboard ||
      location.pathname === routes.teacherDashboard ||
      location.pathname === routes.studentDashboard ||
      location.pathname === routes.parentDashboard
    ) {
      // Show the loader when navigating to a new route
      setShowLoader(true);

      // Hide the loader after delay so gif animation completes
      const timeoutId = setTimeout(() => {
        setShowLoader(false);
      }, 2500);

      return () => {
        clearTimeout(timeoutId); // Clear the timeout when component unmounts
      };
    } else {
      setShowLoader(false);
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const Preloader = () => {
    return (
      <div id="global-loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999 }}>
        <ImageWithBasePath src="assets/img/Educatin.gif" alt="Loading..." style={{ maxWidth: '280px', height: 'auto' }} />
      </div>
    );
  };
  return (
    <>
      {/* Global Dashboard Aesthetic Styles */}
      <style>
        {`
          body {
            background: #f8f9fa;
          }
          .dashboard-global-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #001F3F 0%, #0a3366 60%, #D4AF37 100%);
            z-index: -1;
            overflow: hidden;
          }
          .dashboard-animated-blob-1 {
            position: absolute;
            top: -10%; left: -5%; width: 600px; height: 600px; 
            background: rgba(212, 175, 55, 0.15); border-radius: 50%; filter: blur(60px);
            animation: blobFloat 10s infinite ease-in-out;
          }
          .dashboard-animated-blob-2 {
            position: absolute;
            bottom: -20%; right: -10%; width: 700px; height: 700px; 
            background: rgba(0, 31, 63, 0.4); border-radius: 50%; filter: blur(80px);
            animation: blobFloat 12s infinite ease-in-out reverse;
          }
          .glass-panel {
            background: rgba(255, 255, 255, 0.15) !important;
            backdrop-filter: blur(25px) !important;
            -webkit-backdrop-filter: blur(25px) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
          }
          .sidebar .sidebar-menu ul li a,
          .sidebar .sidebar-menu ul li a span {
            color: #ffffff !important;
          }
          .sidebar .sidebar-menu ul li a i,
          .sidebar .sidebar-menu ul li a i::before,
          .sidebar .sidebar-menu ul li a svg,
          .sidebar .sidebar-menu ul li a svg path {
            color: #D4AF37 !important;
            fill: #D4AF37 !important;
          }
          .sidebar .submenu-hdr span {
            color: #D4AF37 !important; 
          }
          .sidebar .sidebar-menu ul li a:hover,
          .sidebar .sidebar-menu ul li a.active,
          .sidebar .sidebar-menu ul li a.subdrop {
            background: rgba(212, 175, 55, 0.1) !important;
          }
          .sidebar .sidebar-menu ul li a:hover span,
          .sidebar .sidebar-menu ul li a.active span,
          .sidebar .sidebar-menu ul li a.subdrop span {
            color: #D4AF37 !important;
            background: transparent !important;
          }
          .sidebar .sidebar-menu ul li a:hover i,
          .sidebar .sidebar-menu ul li a:hover i::before,
          .sidebar .sidebar-menu ul li a:hover svg,
          .sidebar .sidebar-menu ul li a:hover svg path,
          .sidebar .sidebar-menu ul li a.active i,
          .sidebar .sidebar-menu ul li a.active i::before,
          .sidebar .sidebar-menu ul li a.active svg,
          .sidebar .sidebar-menu ul li a.active svg path,
          .sidebar .sidebar-menu ul li a.subdrop i,
          .sidebar .sidebar-menu ul li a.subdrop i::before,
          .sidebar .sidebar-menu ul li a.subdrop svg,
          .sidebar .sidebar-menu ul li a.subdrop svg path {
            color: #D4AF37 !important;
            fill: #D4AF37 !important;
          }
          .sidebar {
            transition: all 0.05s ease !important;
          }
          .sidebar .sidebar-menu ul {
            transition: all 0s !important;
          }
          .header .header-left .logo-normal img {
             filter: drop-shadow(0px 0px 5px rgba(255,255,255,0.5));
          }
          .header .user-menu > .nav-item > a,
          .header .header-left > a,
          .header > a {
             color: #ffffff !important;
          }
          .header .user-menu > .nav-item > a > i,
          .header .header-left > a > i,
          .header > a > i {
             color: #D4AF37 !important;
          }
          /* Fix for Profile Dropdown */
          .header .dropdown-menu {
             background: #ffffff !important;
          }
          .header .dropdown-menu a, 
          .header .dropdown-menu span, 
          .header .dropdown-menu h6, 
          .header .dropdown-menu p {
             color: #202C4B !important;
          }
          .header .dropdown-menu a:hover {
             background: #f8f9fa !important;
             color: #D4AF37 !important;
          }
          .header .dropdown-menu i,
          .header .dropdown-menu svg {
             color: #001F3F !important;
             fill: #001F3F !important;
          }
          .page-wrapper {
            background: rgba(255, 255, 255, 0.95) !important;
            border-top-left-radius: 20px;
            box-shadow: -5px 0 25px rgba(0,0,0,0.1);
          }
          @keyframes blobFloat {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
        `}
      </style>
      
      <div className="dashboard-global-bg">
        <div className="dashboard-animated-blob-1"></div>
        <div className="dashboard-animated-blob-2"></div>
      </div>

    <div
      className={`
       ${dataLayout === "mini_layout" ? "mini-sidebar" : ""}
      ${miniSidebar && dataLayout !== "mini_layout" ? "mini-sidebar" : ""}
     ${
       (expandMenu && miniSidebar) ||
       (expandMenu && dataLayout === "mini_layout")
         ? "expand-menu"
         : ""
     }
      ${dataLayout === "default_layout" ? "default-layout" : ""}
      ${dataLayout === "boxed_layout" ? "layout-box-mode" : ""}

      ${dataTheme === "dark_data_theme" ? "dark-data-theme" : ""}
      ${dataLayout === "dark_data_theme" ? "dark-data-theme" : ""}
      ${dataLayout === "rtl" ? "layout-mode-rtl" : ""}

      ${dataTopBar === "default_topbar_color" ? "default-topbar" : ""}
      ${dataTopBar === "dark_topbar_color" ? "dark-topbar" : ""}
      ${dataTopBar === "primary_topbar_color" ? "primary-topbar" : ""}
      ${dataTopBar === "grey_topbar_color" ? "grey-topbar" : ""}
      ${dataTheme === "default_data_theme" ? "default-data-theme" : ""}
      
      ${dataSidebar === "default_data_sidebar" ? "default-data-sidebar" : ""}
      ${dataSidebar === "dark_data_sidebar" ? "dark-data-sidebar" : ""}
      ${dataSidebar === "primary_data_sidebar" ? "primary-data-sidebar" : ""}
      ${
        dataSidebar === "darkblack_data_sidebar" ? "darkblack-data-sidebar" : ""
      }
      ${dataSidebar === "darkblue_data_sidebar" ? "darkblue-data-sidebar" : ""}
      ${
        dataSidebarBg === "default_data_sidebar_bg"
          ? "default-data-sidebar-bg"
          : ""
      }
      ${dataSidebarBg === "data_sidebar_1" ? "data-sidebar-1" : ""}
      ${dataSidebarBg === "data_sidebar_2" ? "data-sidebar-2" : ""}
      ${dataSidebarBg === "data_sidebar_3" ? "data-sidebar-3" : ""}
      ${dataSidebarBg === "data_sidebar_4" ? "data-sidebar-4" : ""}
      ${dataSidebarBg === "data_sidebar_5" ? "data-sidebar-5" : ""}
      ${dataSidebarBg === "data_sidebar_6" ? "data-sidebar-6" : ""}
      ${dataColor === "default_data_color" ? "default-data-color" : ""}
      ${dataColor === "violet_data_color" ? "violet-data-color" : ""}
      ${dataColor === "pink_data_color" ? "pink-data-color" : ""}
      ${dataColor === "orange_data_color" ? "orange-data-color" : ""}
      ${dataColor === "green_data_color" ? "green-data-color" : ""}
      ${dataColor === "red_data_color" ? "red-data-color" : ""}
      `}
    >
      {showLoader ? (
        <>
          <Preloader />
          <div
            className={`main-wrapper 
        ${mobileSidebar ? "slide-nav" : ""}`}
          >
            <Header />
            <Sidebar />
            <Outlet />
            {!location.pathname.includes("layout") && <ThemeSettings />}
          </div>
        </>
      ) : (
        <>
          <div
            className={`main-wrapper 
        ${mobileSidebar ? "slide-nav" : ""}`}
          >
            <Header />
            <Sidebar />
            <Outlet />
            {!location.pathname.includes("layout") && <ThemeSettings />}
          </div>
        </>
      )}
      {/* <Loader/> */}

      <div className="sidebar-overlay"></div>
    </div>
    </>
  );
};

export default Feature;
