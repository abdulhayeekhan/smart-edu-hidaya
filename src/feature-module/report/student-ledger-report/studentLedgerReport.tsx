// Student Ledger Report Component
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DatePicker, Table, Tooltip } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../../store";
import { all_routes } from "../../router/all_routes";
import { GetStudentLedgerReport, clearStudentLedgerReport } from "../../../store/apps/academic-reports";
import useRegionsList from "../../../core/common/selectoption/master/useRegions";
import { useCampusesList } from "../../../core/common/selectoption/master/useCampusesList";
import { useAcademicGrades } from "../../../core/common/selectoption/academic/useAcademicGrades";
import { useSectionList } from "../../../core/common/selectoption/academic/useSections";
import { useAdmissions } from "../../../core/common/selectoption/academic/useAdmissions";
import CommonSelect3 from "../../../core/common/commonSelect3";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { BrandName, PoweredBy, CompanyName } from "../../../environment";
import { useTableAutoScroll } from "../../../core/common/useTableAutoScroll";

const { RangePicker } = DatePicker;

const StudentLedgerReport: React.FC = () => {
  const routes = all_routes;
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const tableContainerRef = useTableAutoScroll();

  // --- Auth & User Level ---
  const storedUserData = window.localStorage.getItem("userData");
  const userInfo = storedUserData ? JSON.parse(storedUserData) : null;
  const loginInfo = userInfo?.data;
  const userLevel = loginInfo?.userLevel; // 1=HO, 2=Region, 3=Campus
  const userLevelId = loginInfo?.userLevelId;

  // --- Filter State ---
  const [regionId, setRegionId] = useState<number | null>(
    userLevel === 2 ? userLevelId : null
  );
  const [selectedCampusId, setSelectedCampusId] = useState<number>(
    userLevel === 3 ? userLevelId : 0
  );
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<number | null>(null);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, "days"),
    dayjs(),
  ]);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // --- Dropdowns Data ---
  const regionsList = useRegionsList();
  const campuses = useCampusesList(userLevel === 2 ? userLevelId : regionId);
  const gradesList = useAcademicGrades();
  const sectionsList = useSectionList(gradeId);
  const { studentOptions, loading: studentsLoading } = useAdmissions({
    externalCampusId: selectedCampusId,
    externalGradeId: gradeId,
    externalSectionId: sectionId,
  });

  // --- Redux Data ---
  const { studentLedgerReport, loading } = useSelector(
    (state: RootState) => state.academicReport
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearStudentLedgerReport());
    };
  }, [dispatch]);

  // Deep Link support (e.g., /report/student-ledger-report?admissionId=15495)
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    const admissionParam = searchParams.get("admissionId") || searchParams.get("studentId");
    if (admissionParam && !deepLinkHandled.current) {
      deepLinkHandled.current = true;
      const parsedId = Number(admissionParam);
      setSelectedAdmissionId(parsedId);
      dispatch(
        GetStudentLedgerReport({
          admissionId: parsedId,
          fromDate: dateRange[0].format("YYYY-MM-DD"),
          toDate: dateRange[1].format("YYYY-MM-DD"),
          pageNo: 1,
          pageSize: 100,
        })
      );
    }
  }, [searchParams, dispatch, dateRange]);

  // Handle Fetch
  const handleGenerateReport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedAdmissionId) {
      toast.error("Please select a student");
      return;
    }

    dispatch(
      GetStudentLedgerReport({
        admissionId: selectedAdmissionId,
        fromDate: dateRange[0].format("YYYY-MM-DD"),
        toDate: dateRange[1].format("YYYY-MM-DD"),
        pageNo: pageNo,
        pageSize: pageSize,
      })
    );
  };

  const handleRegionChange = (option: any) => {
    setRegionId(option?.value || null);
    setSelectedCampusId(0);
    setSelectedAdmissionId(null);
    dispatch(clearStudentLedgerReport());
  };

  const handleCampusChange = (option: any) => {
    setSelectedCampusId(option?.value || 0);
    setSelectedAdmissionId(null);
    dispatch(clearStudentLedgerReport());
  };

  const handleGradeChange = (option: any) => {
    setGradeId(option?.value || null);
    setSectionId(null);
    setSelectedAdmissionId(null);
  };

  const handleSectionChange = (option: any) => {
    setSectionId(option?.value || null);
    setSelectedAdmissionId(null);
  };

  const handleStudentChange = (option: any) => {
    setSelectedAdmissionId(option?.value || null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("student-ledger-printable-doc");
    if (!element) {
      toast.error("No ledger report available to download");
      return;
    }

    setIsDownloadingPdf(true);
    const studentNumber = studentLedgerReport?.studentDetail?.studentNumber || selectedAdmissionId || "Report";
    const filename = `Student_Ledger_${studentNumber}_${dayjs().format("YYYYMMDD_HHmm")}.pdf`;

    const opt: any = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        setIsDownloadingPdf(false);
        toast.success("PDF downloaded successfully");
      })
      .catch((err: any) => {
        console.error("PDF generation failed:", err);
        setIsDownloadingPdf(false);
        toast.error("Failed to generate PDF");
      });
  };

  // Calculations
  const details = useMemo(() => studentLedgerReport?.details || [], [studentLedgerReport]);
  const openingBalance = studentLedgerReport?.openingBalance ?? 0;

  const totalDebit = useMemo(() => {
    return details.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  }, [details]);

  const totalCredit = useMemo(() => {
    return details.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  }, [details]);

  const closingBalance = useMemo(() => {
    if (details.length > 0) {
      return details[details.length - 1].balance ?? 0;
    }
    return openingBalance;
  }, [details, openingBalance]);

  const getEntryTypeBadge = (entryType?: string) => {
    if (!entryType) return <span className="badge badge-soft-secondary">-</span>;
    const type = entryType.toLowerCase();
    switch (type) {
      case "receipt":
        return (
          <span className="badge badge-soft-success d-inline-flex align-items-center">
            <i className="ti ti-arrow-down-left me-1" />
            Receipt
          </span>
        );
      case "feecharge":
      case "charge":
      case "fee charge":
        return (
          <span className="badge badge-soft-danger d-inline-flex align-items-center">
            <i className="ti ti-receipt me-1" />
            Fee Charge
          </span>
        );
      case "discount":
        return (
          <span className="badge badge-soft-warning d-inline-flex align-items-center">
            <i className="ti ti-discount-2 me-1" />
            Discount
          </span>
        );
      case "settlement":
        return (
          <span
            className="badge badge-soft-purple d-inline-flex align-items-center"
            style={{ backgroundColor: "#f3e8ff", color: "#7e22ce" }}
          >
            <i className="ti ti-scale me-1" />
            Settlement
          </span>
        );
      default:
        return <span className="badge badge-soft-info">{entryType}</span>;
    }
  };

  const getVoucherTypeBadge = (voucherType?: string) => {
    if (!voucherType) return <span className="badge badge-soft-secondary">-</span>;
    const vType = voucherType.toLowerCase();
    if (vType.includes("receipt")) {
      return <span className="badge badge-soft-success text-capitalize">{voucherType}</span>;
    } else if (vType.includes("fee")) {
      return <span className="badge badge-soft-primary text-capitalize">{voucherType}</span>;
    } else if (vType.includes("journal")) {
      return <span className="badge badge-soft-warning text-capitalize">{voucherType}</span>;
    } else if (vType.includes("payment")) {
      return <span className="badge badge-soft-danger text-capitalize">{voucherType}</span>;
    }
    return <span className="badge badge-soft-secondary text-capitalize">{voucherType}</span>;
  };

  const rangePresets: { label: string; value: [Dayjs, Dayjs] }[] = [
    { label: "Today", value: [dayjs(), dayjs()] },
    { label: "Last 7 Days", value: [dayjs().subtract(7, "d"), dayjs()] },
    { label: "Last 30 Days", value: [dayjs().subtract(30, "d"), dayjs()] },
    { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
    {
      label: "Last Month",
      value: [
        dayjs().subtract(1, "month").startOf("month"),
        dayjs().subtract(1, "month").endOf("month"),
      ],
    },
    { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
    { label: "All Time (1 Year)", value: [dayjs().subtract(1, "year"), dayjs()] },
  ];

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: any, __: any, index: number) => (pageNo - 1) * pageSize + index + 1,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
      render: (text: string) => (text ? dayjs(text).format("DD-MMM-YYYY") : "-"),
    },
    {
      title: "Posted Date",
      dataIndex: "postedDate",
      key: "postedDate",
      width: 140,
      render: (text: string) =>
        text ? (
          <span className="text-muted" style={{ fontSize: "12px" }}>
            {dayjs(text).format("DD-MMM-YYYY hh:mm A")}
          </span>
        ) : (
          "-"
        ),
    },
    {
      title: "Voucher #",
      dataIndex: "voucherNumber",
      key: "voucherNumber",
      width: 90,
      render: (text: string) => <span className="badge badge-soft-dark fw-bold">#{text}</span>,
    },
    {
      title: "Voucher Type",
      dataIndex: "voucherType",
      key: "voucherType",
      width: 150,
      render: (text: string) => getVoucherTypeBadge(text),
    },
    {
      title: "Entry Type",
      dataIndex: "entryType",
      key: "entryType",
      width: 120,
      render: (text: string) => getEntryTypeBadge(text),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ cursor: "pointer" }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      width: 110,
      align: "right" as const,
      className: "text-end",
      render: (value: number) => (
        <span className="text-danger fw-semibold">
          {value > 0 ? value.toLocaleString() : "-"}
        </span>
      ),
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      width: 110,
      align: "right" as const,
      className: "text-end",
      render: (value: number) => (
        <span className="text-success fw-semibold">
          {value > 0 ? value.toLocaleString() : "-"}
        </span>
      ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 120,
      align: "right" as const,
      className: "text-end",
      render: (value: number) => (
        <strong className={value < 0 ? "text-danger" : "text-dark"}>
          {Number(value ?? 0).toLocaleString()}
        </strong>
      ),
    },
  ];

  const studentDetail = studentLedgerReport?.studentDetail;

  return (
    <div className="page-wrapper">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
          }
          body * {
            visibility: hidden;
          }
          #student-ledger-printable-doc,
          #student-ledger-printable-doc * {
            visibility: visible;
          }
          #student-ledger-printable-doc {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
            color: #000 !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #333 !important;
            padding: 4px 6px !important;
          }
          .print-table th {
            background-color: #f0f0f0 !important;
            color: #000 !important;
            font-weight: bold !important;
          }
          .print-page-break {
            page-break-inside: avoid;
          }
        }

        .print-doc-container {
          background: #fff;
          color: #000;
          font-family: Arial, sans-serif;
        }
        .print-doc-container table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .print-doc-container th, .print-doc-container td {
          border: 1px solid #444;
          padding: 5px 6px;
        }
        .print-doc-container th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: left;
        }
      `}</style>

      <div className="content">
        {/* Page Header (No Print) */}
        <div className="d-md-flex d-block align-items-center justify-content-between mb-3 no-print">
          <div className="my-auto mb-2">
            <h3 className="page-title mb-1">Student Ledger Report</h3>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to={routes.reports}>Reports</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Student Ledger Report
                </li>
              </ol>
            </nav>
          </div>
          <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
            {studentLedgerReport && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-danger d-flex align-items-center"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                >
                  <i className="ti ti-file-download me-2" />
                  {isDownloadingPdf ? "Generating PDF..." : "Download PDF (A4)"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary d-flex align-items-center"
                  onClick={handlePrint}
                >
                  <i className="ti ti-printer me-2" />
                  Print A4
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={() => handleGenerateReport()}
              disabled={loading || !selectedAdmissionId}
            >
              <i className="ti ti-refresh me-2" />
              {loading ? "Loading..." : "Refresh Report"}
            </button>
          </div>
        </div>

        {/* Filter Card (No Print) */}
        <div className="card mb-4 no-print">
          <div className="card-header bg-light">
            <div className="d-flex align-items-center">
              <i className="ti ti-filter text-primary fs-18 me-2" />
              <h5 className="card-title mb-0">Filter Parameters</h5>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleGenerateReport}>
              <div className="row g-3">
                {/* Region */}
                {userLevel === 1 && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Region</label>
                    <CommonSelect3
                      options={regionsList}
                      value={regionsList.find((r) => r.value === regionId) || null}
                      onChange={handleRegionChange}
                      placeholder="Select Region"
                    />
                  </div>
                )}

                {/* Campus */}
                {userLevel !== 3 && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Campus</label>
                    <CommonSelect3
                      options={campuses}
                      value={campuses.find((c) => c.value === selectedCampusId) || null}
                      onChange={handleCampusChange}
                      placeholder="Select Campus"
                    />
                  </div>
                )}

                {/* Grade */}
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Class / Grade</label>
                  <CommonSelect3
                    options={[{ value: null, label: "All Grades" }, ...gradesList]}
                    value={gradesList.find((g) => g.value === gradeId) || null}
                    onChange={handleGradeChange}
                    placeholder="All Grades"
                  />
                </div>

                {/* Section */}
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Section</label>
                  <CommonSelect3
                    options={[{ value: null, label: "All Sections" }, ...sectionsList]}
                    value={sectionsList.find((s) => s.value === sectionId) || null}
                    onChange={handleSectionChange}
                    placeholder="All Sections"
                    isDisabled={!gradeId}
                  />
                </div>

                {/* Student Selector */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold">
                    Select Student <span className="text-danger">*</span>
                  </label>
                  <CommonSelect3
                    options={studentOptions}
                    value={studentOptions.find((s) => s.value === selectedAdmissionId) || null}
                    onChange={handleStudentChange}
                    placeholder="Search & Select Student..."
                    loading={studentsLoading}
                  />
                </div>

                {/* Date Range */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Date Range</label>
                  <RangePicker
                    className="form-control"
                    value={dateRange}
                    presets={rangePresets}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        setDateRange([dates[0], dates[1]]);
                      }
                    }}
                    format="DD-MMM-YYYY"
                  />
                </div>

                {/* Action Button */}
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading || !selectedAdmissionId}
                  >
                    <i className="ti ti-search me-1" />
                    {loading ? "Searching..." : "Generate"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Report Content */}
        {studentLedgerReport ? (
          <>
            {/* Screen UI - Student Profile Overview Card (No Print) */}
            {studentDetail && (
              <div className="card border-primary-light mb-4 shadow-sm no-print">
                <div className="card-body p-3">
                  <div className="row align-items-center g-3">
                    <div className="col-md-3">
                      <div className="d-flex align-items-center">
                        <span className="avatar avatar-lg rounded-circle bg-primary-transparent text-primary me-3">
                          <i className="ti ti-school fs-24" />
                        </span>
                        <div>
                          <h5 className="mb-0 text-dark fw-bold">{studentDetail.fullName}</h5>
                          <span className="badge badge-soft-info mt-1">
                            {studentDetail.studentNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <p className="text-muted mb-1 fs-12 text-uppercase">Father / Guardian</p>
                      <h6 className="mb-0 text-dark">{studentDetail.fatherName || "N/A"}</h6>
                      {studentDetail.contactNumber && (
                        <span className="text-muted fs-12">
                          <i className="ti ti-phone me-1" />
                          {studentDetail.contactNumber}
                        </span>
                      )}
                    </div>
                    <div className="col-md-3">
                      <p className="text-muted mb-1 fs-12 text-uppercase">Class & Section</p>
                      <h6 className="mb-0 text-primary">
                        {studentDetail.grade} - {studentDetail.section}
                      </h6>
                      <span className="text-muted fs-12">
                        Admitted:{" "}
                        {studentDetail.admissionDate
                          ? dayjs(studentDetail.admissionDate).format("DD-MMM-YYYY")
                          : "-"}
                      </span>
                    </div>
                    <div className="col-md-3 text-md-end">
                      <p className="text-muted mb-1 fs-12 text-uppercase">Enrollment Status</p>
                      <span className="badge badge-soft-success text-capitalize fs-13 px-3 py-1">
                        <i className="ti ti-circle-filled fs-6 me-1" />
                        {studentDetail.status || "Active"}
                      </span>
                      {selectedAdmissionId && (
                        <div className="mt-2">
                          <Link
                            to={`/student/student-details/${selectedAdmissionId}`}
                            className="btn btn-sm btn-outline-secondary"
                            target="_blank"
                          >
                            <i className="ti ti-user me-1" />
                            View Profile
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Screen UI - Summary Metrics (No Print) */}
            <div className="row g-3 mb-4 no-print">
              <div className="col-sm-6 col-lg-3">
                <div className="card shadow-none border mb-0 bg-light-50">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">
                          Opening Balance
                        </p>
                        <h4 className="mb-0 text-dark fw-bold">
                          {openingBalance.toLocaleString()}
                        </h4>
                      </div>
                      <span className="avatar avatar-md rounded-circle bg-primary-transparent text-primary">
                        <i className="ti ti-wallet fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card shadow-none border mb-0 bg-light-50">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">
                          Period Debits
                        </p>
                        <h4 className="mb-0 text-danger fw-bold">
                          {totalDebit.toLocaleString()}
                        </h4>
                      </div>
                      <span className="avatar avatar-md rounded-circle bg-danger-transparent text-danger">
                        <i className="ti ti-arrow-up-right fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card shadow-none border mb-0 bg-light-50">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">
                          Period Credits
                        </p>
                        <h4 className="mb-0 text-success fw-bold">
                          {totalCredit.toLocaleString()}
                        </h4>
                      </div>
                      <span className="avatar avatar-md rounded-circle bg-success-transparent text-success">
                        <i className="ti ti-arrow-down-left fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card shadow-none border mb-0 bg-light-50">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">
                          Closing Balance
                        </p>
                        <h4
                          className={`mb-0 fw-bold ${
                            closingBalance < 0 ? "text-danger" : "text-primary"
                          }`}
                        >
                          {closingBalance.toLocaleString()}
                        </h4>
                      </div>
                      <span className="avatar avatar-md rounded-circle bg-info-transparent text-info">
                        <i className="ti ti-scale fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen UI - Ledger Transactions Statement Table (No Print) */}
            <div className="card no-print">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <div className="d-flex align-items-center">
                  <i className="ti ti-file-analytics text-primary fs-20 me-2" />
                  <h4 className="card-title mb-0">Transaction Statement</h4>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                  >
                    <i className="ti ti-file-download me-1" />
                    PDF (A4)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={handlePrint}
                  >
                    <i className="ti ti-printer me-1" />
                    Print
                  </button>
                  <span className="text-muted fs-13 ms-2">
                    Period: <strong>{dateRange[0].format("DD-MMM-YYYY")}</strong> to{" "}
                    <strong>{dateRange[1].format("DD-MMM-YYYY")}</strong>
                  </span>
                </div>
              </div>
              <div className="card-body p-0">
                <div ref={tableContainerRef} className="table-responsive">
                  <Table
                    columns={columns}
                    dataSource={details}
                    loading={loading}
                    pagination={{
                      current: pageNo,
                      pageSize: pageSize,
                      total: studentLedgerReport?.totalCount || details.length,
                      onChange: (page, size) => {
                        setPageNo(page);
                        setPageSize(size);
                      },
                      showSizeChanger: true,
                      pageSizeOptions: ["25", "50", "100", "200"],
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} entries`,
                    }}
                    rowKey={(_, index) => String(index || 0)}
                    scroll={{ x: 1000 }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-light fw-bold">
                          <Table.Summary.Cell index={0} colSpan={7} className="text-end">
                            Opening Balance:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell
                            index={1}
                            colSpan={2}
                            className="text-center text-muted"
                          >
                            -
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} className="text-end fw-bold">
                            {openingBalance.toLocaleString()}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                        <Table.Summary.Row className="bg-light fw-bold">
                          <Table.Summary.Cell index={0} colSpan={7} className="text-end">
                            Period Total:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} className="text-end text-danger fw-bold">
                            {totalDebit > 0 ? totalDebit.toLocaleString() : "-"}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} className="text-end text-success fw-bold">
                            {totalCredit > 0 ? totalCredit.toLocaleString() : "-"}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell
                            index={3}
                            className={`text-end fw-bold ${
                              closingBalance < 0 ? "text-danger" : "text-dark"
                            }`}
                          >
                            {closingBalance.toLocaleString()}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Dedicated Printable / PDF A4 Sheet */}
            <div
              id="student-ledger-printable-doc"
              className="print-doc-container p-4"
              style={{
                backgroundColor: "#fff",
                color: "#000",
                maxWidth: "100%",
                margin: "0 auto",
              }}
            >
              {/* Document Header */}
              <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "10px" }}>
                <h2 style={{ margin: 0, fontWeight: "bold", fontSize: "20px", textTransform: "uppercase", color: "#000" }}>
                  {BrandName || CompanyName || "DAR-E-ARQAM SCHOOLS"}
                </h2>
                <h4 style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: "bold", textDecoration: "underline", color: "#000" }}>
                  STUDENT LEDGER STATEMENT
                </h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#333" }}>
                  Statement Period: <strong>{dateRange[0].format("DD-MMM-YYYY")}</strong> to <strong>{dateRange[1].format("DD-MMM-YYYY")}</strong> &nbsp;|&nbsp; Generated on: <strong>{dayjs().format("DD-MMM-YYYY hh:mm A")}</strong>
                </p>
              </div>

              {/* Student Profile Info Table */}
              {studentDetail && (
                <div style={{ marginBottom: "14px", border: "1px solid #000", padding: "8px", borderRadius: "3px", backgroundColor: "#fafafa" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: "none", fontSize: "11px" }}>
                    <tbody>
                      <tr>
                        <td style={{ border: "none", width: "18%", fontWeight: "bold", padding: "3px 6px" }}>Student Name:</td>
                        <td style={{ border: "none", width: "32%", padding: "3px 6px" }}>{studentDetail.fullName}</td>
                        <td style={{ border: "none", width: "18%", fontWeight: "bold", padding: "3px 6px" }}>Student Number:</td>
                        <td style={{ border: "none", width: "32%", padding: "3px 6px", fontWeight: "bold" }}>{studentDetail.studentNumber}</td>
                      </tr>
                      <tr>
                        <td style={{ border: "none", fontWeight: "bold", padding: "3px 6px" }}>Father's Name:</td>
                        <td style={{ border: "none", padding: "3px 6px" }}>{studentDetail.fatherName || "N/A"}</td>
                        <td style={{ border: "none", fontWeight: "bold", padding: "3px 6px" }}>Contact No:</td>
                        <td style={{ border: "none", padding: "3px 6px" }}>{studentDetail.contactNumber || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style={{ border: "none", fontWeight: "bold", padding: "3px 6px" }}>Grade &amp; Section:</td>
                        <td style={{ border: "none", padding: "3px 6px" }}>{studentDetail.grade} - {studentDetail.section}</td>
                        <td style={{ border: "none", fontWeight: "bold", padding: "3px 6px" }}>Admission Date:</td>
                        <td style={{ border: "none", padding: "3px 6px" }}>
                          {studentDetail.admissionDate ? dayjs(studentDetail.admissionDate).format("DD-MMM-YYYY") : "-"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: "none", fontWeight: "bold", padding: "3px 6px" }}>Status:</td>
                        <td style={{ border: "none", padding: "3px 6px", textTransform: "capitalize" }}>{studentDetail.status || "Active"}</td>
                        <td style={{ border: "none", fontWeight: "bold", padding: "3px 6px" }}>Opening Balance:</td>
                        <td style={{ border: "none", padding: "3px 6px", fontWeight: "bold" }}>Rs. {openingBalance.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transactions Table */}
              <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#eaeaea" }}>
                    <th style={{ border: "1px solid #333", width: "4%", textAlign: "center", padding: "5px 3px" }}>#</th>
                    <th style={{ border: "1px solid #333", width: "11%", padding: "5px 4px" }}>Date</th>
                    <th style={{ border: "1px solid #333", width: "7%", textAlign: "center", padding: "5px 3px" }}>Vch #</th>
                    <th style={{ border: "1px solid #333", width: "14%", padding: "5px 4px" }}>Voucher Type</th>
                    <th style={{ border: "1px solid #333", width: "10%", padding: "5px 4px" }}>Entry Type</th>
                    <th style={{ border: "1px solid #333", width: "28%", padding: "5px 4px" }}>Description</th>
                    <th style={{ border: "1px solid #333", width: "8%", textAlign: "right", padding: "5px 4px" }}>Debit</th>
                    <th style={{ border: "1px solid #333", width: "8%", textAlign: "right", padding: "5px 4px" }}>Credit</th>
                    <th style={{ border: "1px solid #333", width: "10%", textAlign: "right", padding: "5px 4px" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr style={{ backgroundColor: "#f9f9f9", fontWeight: "bold" }}>
                    <td colSpan={8} style={{ border: "1px solid #333", textAlign: "right", padding: "5px 6px" }}>
                      OPENING BALANCE:
                    </td>
                    <td style={{ border: "1px solid #333", textAlign: "right", padding: "5px 6px" }}>
                      {openingBalance.toLocaleString()}
                    </td>
                  </tr>

                  {/* Transaction Rows */}
                  {details.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ border: "1px solid #333", textAlign: "center", padding: "10px" }}>
                        No transactions found for the selected period
                      </td>
                    </tr>
                  ) : (
                    details.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: "1px solid #333", textAlign: "center", padding: "4px 3px" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #333", padding: "4px 4px" }}>
                          {item.date ? dayjs(item.date).format("DD-MMM-YYYY") : "-"}
                        </td>
                        <td style={{ border: "1px solid #333", textAlign: "center", padding: "4px 3px" }}>{item.voucherNumber}</td>
                        <td style={{ border: "1px solid #333", padding: "4px 4px", textTransform: "capitalize" }}>{item.voucherType}</td>
                        <td style={{ border: "1px solid #333", padding: "4px 4px" }}>{item.entryType || "-"}</td>
                        <td style={{ border: "1px solid #333", padding: "4px 4px", wordBreak: "break-word" }}>{item.description}</td>
                        <td style={{ border: "1px solid #333", textAlign: "right", padding: "4px 4px", color: item.debit > 0 ? "#b91c1c" : "#000" }}>
                          {item.debit > 0 ? item.debit.toLocaleString() : "-"}
                        </td>
                        <td style={{ border: "1px solid #333", textAlign: "right", padding: "4px 4px", color: item.credit > 0 ? "#15803d" : "#000" }}>
                          {item.credit > 0 ? item.credit.toLocaleString() : "-"}
                        </td>
                        <td style={{ border: "1px solid #333", textAlign: "right", padding: "4px 4px", fontWeight: "bold" }}>
                          {Number(item.balance ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Period Totals & Closing Balance Row */}
                  <tr style={{ backgroundColor: "#eaeaea", fontWeight: "bold", borderTop: "2px solid #000" }}>
                    <td colSpan={6} style={{ border: "1px solid #333", textAlign: "right", padding: "6px" }}>
                      PERIOD TOTALS &amp; CLOSING BALANCE:
                    </td>
                    <td style={{ border: "1px solid #333", textAlign: "right", padding: "6px", color: "#b91c1c" }}>
                      {totalDebit > 0 ? totalDebit.toLocaleString() : "0"}
                    </td>
                    <td style={{ border: "1px solid #333", textAlign: "right", padding: "6px", color: "#15803d" }}>
                      {totalCredit > 0 ? totalCredit.toLocaleString() : "0"}
                    </td>
                    <td style={{ border: "1px solid #333", textAlign: "right", padding: "6px", fontSize: "11px" }}>
                      {closingBalance.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures & Summary Footer */}
              <div style={{ marginTop: "40px", pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
                  <div style={{ width: "28%", borderTop: "1px solid #000", textAlign: "center", paddingTop: "5px", fontSize: "11px", fontWeight: "bold" }}>
                    Prepared By
                  </div>
                  <div style={{ width: "28%", borderTop: "1px solid #000", textAlign: "center", paddingTop: "5px", fontSize: "11px", fontWeight: "bold" }}>
                    Accounts Officer
                  </div>
                  <div style={{ width: "28%", borderTop: "1px solid #000", textAlign: "center", paddingTop: "5px", fontSize: "11px", fontWeight: "bold" }}>
                    Principal / Authorized Signatory
                  </div>
                </div>

                <div style={{ textAlign: "center", fontSize: "9px", color: "#555", borderTop: "1px dashed #ccc", paddingTop: "6px" }}>
                  Powered by <strong>{PoweredBy}</strong> &nbsp;|&nbsp; This is a system-generated document.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center py-5 no-print">
            <div className="card-body">
              <div className="avatar avatar-xxl bg-light-50 rounded-circle text-primary mb-3">
                <i className="ti ti-file-search fs-36" />
              </div>
              <h4 className="text-dark">No Student Selected</h4>
              <p className="text-muted max-w-450 mx-auto">
                Select a campus, student, and date range above then click{" "}
                <strong>Generate</strong> to view the student's complete ledger history.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLedgerReport;
