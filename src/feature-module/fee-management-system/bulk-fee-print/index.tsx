import React, { ChangeEvent, useEffect, FormEvent, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
// import { feeGroup, feesTypes, paymentType } from '../../../core/common/selectoption/selectoption'
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { all_routes } from "../../router/all_routes";
import {
    AdmissionNo,
    Hostel,
    PickupPoint,
    VehicleNumber,
    academicYear,
    allClass,
    allSection,
    bloodGroup,
    cast,
    gender,
    house,
    mothertongue,
    names,
    religion,
    rollno,
    roomNO,
    route,
    status,
    feesStatuses
} from "../../../core/common/selectoption/selectoption";
import useRegionsList from "../../../core/common/selectoption/master/useRegions";
import { useCampusesList } from "../../../core/common/selectoption/master/useCampusesList";
import { useAcademicGrades } from "../../../core/common/selectoption/academic/useAcademicGrades";
import { useCities } from "../../../core/common/selectoption/address/useCities";
import { TagsInput } from "react-tag-input-component";
import CommonSelect from "../../../core/common/commonSelect";
import CommonSelect2 from "../../../core/common/commonSelect2"
import CommonSelect3 from "../../../core/common/commonSelect3"
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import axios from "axios";
import { useLastAcademicSession } from '../../../core/common/selectoption/academic/useLastAcademicSession';
import { BulkInvoicePayload, GenerateBulkInvoice, GetFeeInvoices, FeeInvoiceFilter, CancelInvoice, CancelInvoicePayload } from '../../../store/apps/fee-invoice'
import { useAcademicSessions } from '../../../core/common/selectoption/academic/useAcademicSessions';
import toast from "react-hot-toast";
import html2pdf from 'html2pdf.js';
import Barcode from 'react-barcode';
import { QRCodeCanvas } from 'qrcode.react';
import { CompnayIcon, BrandName, PoweredBy, feeTermsConditions } from '../../../environment'
import { GetCampusBanksByCampus } from "../../../store/apps/campus-bank";
import { GetAllCampus } from "../../../store/apps/campus-management";
const baseURL = process.env.REACT_APP_API_BASE_URL

const { RangePicker } = DatePicker;

interface InvoiceFilterPayload {
    pageNo: number;
    pageSize: number;
    gradeId: number;
    sessionId: number;
    campusId: number;
    dateFrom: string; // ISO String format
    dateTo: string;   // ISO String format
    admissionId?: number;
    status: string;
}
interface Props {
    datalist: any[];
}

const BulkFeePrint = () => {
    const routes = all_routes;
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [hasSearched, setHasSearched] = useState(false); // New state
    const { data: datalist, totalCount, totalPages, currentPage, loading } = useSelector((state: RootState) => state.feeInvoice);
    const dispatch = useDispatch<AppDispatch>();
    const sessions = useAcademicSessions();
    const userInfoString = localStorage.getItem("userData");
    const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
    const loginInfo = userInfo?.data
    const userId = loginInfo?.id
    const regionsList = useRegionsList();

    const [regionId, setRegionId] = useState(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : null)
    const handleSelectRegion = (name: string, option: any) => {
        setRegionId(option?.value ?? 0);
    }
    const campuses = useCampusesList(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : regionId);
    const grades = useAcademicGrades()

    const [campusId, setCampusId] = useState<number>(loginInfo?.userLevel === 3 ? loginInfo?.userLevelId : 0);


    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [formData, setFormData] = useState<InvoiceFilterPayload>({
        pageNo: 1, // Usually starts at 1 for pagination
        pageSize: 10000, // Default page size
        gradeId: 0,
        sessionId: 0,
        campusId: 0,
        // Setting dates to start and end of current day in ISO format
        dateFrom: dayjs().startOf('day').toISOString(),
        dateTo: dayjs().endOf('day').toISOString(),
        // admissionId: 0,
        status: "pending", // Default status
    });



    // useEffect(() => {
    //     dispatch(GetFeeInvoices(formData as FeeInvoiceFilter))
    // }, [dispatch, formData])
    const handleChange = (name: keyof InvoiceFilterPayload, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // 3. Update handleSelectCampus to also update formData
    const handleSelectCampus = (name: string, option: any) => {
        const selectedId = option?.value ?? 0;
        setCampusId(selectedId);
        setFormData(prev => ({
            ...prev,
            campusId: selectedId
        }));
    };
    const handleSelectChanges = (name: string, option: any) => {
        const selectedId = option?.value ?? 0;
        setFormData(prev => ({
            ...prev,
            [name]: selectedId
        }));
    };


    // 2. Sync campusId and userId when loginInfo or user details change
    useEffect(() => {
        // 1. Guard clause: Wait until loginInfo is actually available
        if (!loginInfo || !userId) return;
        // 2. Determine Campus ID (Ensure it defaults to 0 if not Level 3)
        const effectiveCampusId = loginInfo.userLevel === 3 ? loginInfo.userLevelId : 0;
        // 3. Update states
        setCampusId(effectiveCampusId);
        setFormData(prev => ({
            ...prev,
            campusId: effectiveCampusId
        }));

        // Only re-run when these specific values change
    }, [loginInfo?.userLevel, loginInfo?.userLevelId, userId]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        setErrors({}); // Clear previous errors

        // --- Validation Logic ---
        const newErrors: { [key: string]: string } = {};

        if (!formData.campusId || formData.campusId === 0) {
            newErrors.campusId = "Please select a campus.";

        }
        if (!formData.gradeId || formData.gradeId === 0) {
            newErrors.gradeId = "Please select a grade.";
        }
        if (!formData.dateFrom || !formData.dateTo) {
            newErrors.period = "Invoice period is required.";
        }
        if (!formData.status) {
            newErrors.status = "Status is required.";
        }
        // If there are errors, stop execution
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fill in all required fields.");
            setIsActionLoading(false);
            return;
        }
        try {
            await dispatch(GetFeeInvoices(formData as FeeInvoiceFilter));
            setHasSearched(true);
            // if (GenerateBulkInvoice.fulfilled.match(resultAction)) {
            //     const results = resultAction.payload; // This is the array of { isSuccess, message, etc. }


            //     // Check if there were any actual successes
            //     const successCount = results.filter((r: any) => r.isSuccess).length;
            //     const failureCount = results.filter((r: any) => !r.isSuccess).length;

            //     if (successCount > 0) {
            //         toast.success(`Successfully generated ${successCount} invoices.`);
            //     }

            //     if (failureCount > 0) {
            //         toast.error(`${failureCount} invoices skipped (already exist or error).`);
            //     }
            // }
        } catch (error) {
            console.error("Failed to generate invoices", error);
        } finally {
            setIsActionLoading(false);
        }
    }






    return (
        <div className="page-wrapper">
            <div className="content content-two">
                {/* Page Header */}
                <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
                    <div className="my-auto mb-2">
                        <h3 className="mb-1">Print Bulk Fee Invoices</h3>
                        <nav>
                            <ol className="breadcrumb mb-0">
                                <li className="breadcrumb-item">
                                    <Link to={routes.adminDashboard}>Dashboard</Link>
                                </li>
                                <li className="breadcrumb-item">
                                    <Link to={routes.feeInvoices}>Fee Invoices</Link>
                                </li>
                                <li className="breadcrumb-item active" aria-current="page">
                                    Print Bulk Fee Invoices
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>


                <div className="row">
                    <div className="col-md-12">
                        <form onSubmit={handleSave}>
                            <div className="card pb-5">
                                <div className="card-header bg-light">
                                    <div className="d-flex align-items-center">
                                        <span className="bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0">
                                            <i className="ti ti-printer fs-16" />
                                        </span>
                                        <h4 className="text-dark">Print Bulk Fee Invoices</h4>
                                    </div>
                                </div>
                                <div className="card-body pb-1">

                                    <div className="row">
                                        {loginInfo?.userLevel === 1 && (
                                            <div className="col-md-6 mb-3">
                                                <div className="mb-3">
                                                    <label className="form-label">Region</label>
                                                    <CommonSelect3
                                                        className="select"
                                                        options={regionsList}
                                                        onChange={(option) => handleSelectRegion('regions', option)}
                                                        value={regionId ? regionsList.find(r => r.value === regionId) : regionsList[0]}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {(loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                                            <div className="col-md-6 mb-3">
                                                <div className="mb-3">
                                                    <label className="form-label">Campus</label>
                                                    <CommonSelect3
                                                        className="select"
                                                        options={campuses}
                                                        onChange={(option) =>
                                                            handleSelectCampus('campusId', option)
                                                        }
                                                        value={formData?.campusId ? campuses.find(c => c.value === formData?.campusId) : campuses[0]}
                                                    />
                                                    {errors.campusId && <small className="text-danger">{errors.campusId}</small>}
                                                </div>
                                            </div>
                                        )}
                                        <div className="col-md-6 mb-3">
                                            <div className="mb-3">
                                                <label className="form-label">Sessions</label>
                                                <CommonSelect3
                                                    className="select"
                                                    options={sessions}
                                                    onChange={(option) => handleSelectChanges('sessionId', option)}
                                                    value={formData?.sessionId ? sessions.find(r => r.value === formData?.sessionId) : sessions[0]}
                                                />
                                                {errors.sessionId && <small className="text-danger">{errors.sessionId}</small>}
                                            </div>
                                        </div>

                                        <div className="col-md-6 mb-3">
                                            <div className="mb-3">
                                                <label className="form-label">Grades</label>
                                                <CommonSelect3
                                                    className="select"
                                                    options={grades}
                                                    onChange={(option) => handleSelectChanges('gradeId', option)}
                                                    value={formData?.gradeId ? grades.find(r => r.value === formData?.gradeId) : grades[0]}
                                                />
                                                {errors.gradeId && <small className="text-danger">{errors.gradeId}</small>}
                                            </div>
                                        </div>



                                        <div className="col-md-6 mb-3">
                                            <div className="input-icon position-relative">
                                                <label className="form-label mb-0">Invoice Months</label>
                                                {/* Use 'row' to create a horizontal container and 'align-items-center' for vertical alignment */}
                                                <div className="row align-items-center mt-2">
                                                    <div className="input-icon position-relative">
                                                        <RangePicker
                                                            className="form-control datetimepicker w-100"
                                                            format="DD-MM-YYYY"
                                                            // CHANGE: Set a border color instead of 'none'
                                                            style={{
                                                                border: '1px solid #E9EDF4',
                                                                boxShadow: 'none',
                                                                height: '38px' // Matching your previous div height
                                                            }}
                                                            onChange={(dates) => {
                                                                if (dates && dates[0] && dates[1]) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        dateFrom: dates[0]?.format('YYYY-MM-DD') ?? '',
                                                                        dateTo: dates[1]?.format('YYYY-MM-DD') ?? ''
                                                                    }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        dateFrom: '',
                                                                        dateTo: ''
                                                                    }));
                                                                }
                                                            }}
                                                        />
                                                        <span className="input-icon-addon" style={{ zIndex: 5 }}>
                                                            <i className="ti ti-calendar" />
                                                        </span>
                                                    </div>
                                                    {errors.period && <small className="text-danger">{errors.period}</small>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 mb-3 mt-4">
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <><span className="spinner-border spinner-border-sm me-2" /> Generating...</>
                                                ) : (
                                                    'Show Invoices'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-12">
                        {hasSearched && datalist && datalist.length > 0 ? (
                            <LandscapeFeeVoucher datalist={datalist} />
                        ) : hasSearched && !loading ? (
                            <div className="card p-4 text-center">
                                <h5>No invoices found for the selected criteria.</h5>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div >
        </div>
    );
};
interface Props {
    datalist: any[];
}

function LandscapeFeeVoucher({ datalist }: Props) {
    const dispatch = useDispatch<AppDispatch>();
    const contentRef = useRef<HTMLDivElement>(null);
    const { data: bankDetails } = useSelector((state: RootState) => state.campusBank);
    const campusState = useSelector((state: RootState) => state.campus);

    useEffect(() => {
        if (!campusState?.data || campusState.data.length === 0) {
            dispatch(GetAllCampus({ pageNumber: 1, pageSize: 1000 }));
        }
    }, [dispatch, campusState?.data]);

    useEffect(() => {
        if (datalist && datalist.length > 0) {
            const campusId = datalist[0].campusId;
            if (campusId) {
                dispatch(GetCampusBanksByCampus(campusId));
            }
        }
    }, [datalist, dispatch]);

    const [deposits, setDeposits] = useState<any[]>([]);
    useEffect(() => {
        const fetchDeposits = async () => {
            if (datalist && datalist.length > 0) {
                try {
                    const admissionIds = datalist.map(item => item.admissionId).filter((v, i, a) => a.indexOf(v) === i);
                    const depositPromises = admissionIds.map(id =>
                        axios.get(`${baseURL}/api/SecurityDeposit/GetDepositDetail/${id}`)
                            .then(res => res.data)
                            .catch(() => ({ status: false }))
                    );
                    const results = await Promise.all(depositPromises);
                    const validDeposits = results
                        .filter(r => r.status && r.data)
                        .map(r => r.data);
                    setDeposits(validDeposits);
                } catch (error) {
                    console.error("Error fetching deposits:", error);
                }
            }
        };
        fetchDeposits();
    }, [datalist]);


    const vouchersData = useMemo(() => {
        return datalist?.map((item) => {
            const deposit = deposits.find(d => d.admissionId === item.admissionId);
            const details = item.details ? [...item.details] : [];
            let totalPayable = item.netAmount || 0;

            if (deposit && deposit.amount > 0 && deposit.depositedAt === null) {
                const exists = details.find((d: any) => d.feeName === "Security");
                if (!exists) {
                    details.push({
                        feeName: "Security Deposit",
                        remainingAmount: deposit.amount
                    });
                    totalPayable += deposit.amount;
                }
            }

            const invoiceNumber = item.invoiceNumber !== undefined && item.invoiceNumber !== null ? item.invoiceNumber.toString() : ((item as any).voucherNo?.toString() || item.id?.toString() || "");
            const payproId = (item as any).payproId || (item as any).payProId || (item as any).orderNumber || invoiceNumber;
            const click2Pay = (item as any).click2Pay || (item as any).paymentUrl || "";
            const serialNo = invoiceNumber;
            const voucherNo = invoiceNumber;
            const oneBillId = payproId;
            const issueDate = item.invoiceDate ? dayjs(item.invoiceDate).format("MMM DD, YYYY") : "";
            const dueDate = item.dueDate ? dayjs(item.dueDate).format("MMM DD, YYYY") : "";
            const validityDate = item.dueDate ? dayjs(item.dueDate).add(5, 'day').format("MMM DD, YYYY") : "";

            const ubl = bankDetails?.find((b: any) => b.tblAccountBank?.name?.toLowerCase().includes('ubl'))?.iban
                || bankDetails[0]?.iban || "";
            const abl = bankDetails?.find((b: any) => b.tblAccountBank?.name?.toLowerCase().includes('abl'))?.iban
                || bankDetails[1]?.iban || "";
            const mcb = bankDetails?.find((b: any) => b.tblAccountBank?.name?.toLowerCase().includes('mcb'))?.iban
                || bankDetails[2]?.iban || "";

            const bankAccounts = bankDetails?.map((b: any) => {
                const bankName = b.tblAccountBank?.name || b.bankName || "Bank";
                const title = b.accountTitle ? ` (${b.accountTitle})` : "";
                const iban = b.iban || b.accountNo || b.accountNumber || "";
                return {
                    label: `${bankName}${title}:`,
                    value: iban
                };
            }) || [];

            const matchedCampus = campusState?.data?.find((c: any) => 
                c.id === item.campusId || 
                c.name?.toLowerCase() === item.campusName?.toLowerCase()
            );

            const isPayProEnabled = matchedCampus?.isPayProEnabled !== undefined
                ? Boolean(matchedCampus.isPayProEnabled)
                : item.isPayProEnabled !== undefined
                    ? Boolean(item.isPayProEnabled)
                    : item.isPayproEnabled !== undefined
                        ? Boolean(item.isPayproEnabled)
                        : true;

            const bankQrValue = bankAccounts && bankAccounts.length > 0
                ? bankAccounts.map((b: any) => `${b.label} ${b.value}`).join('\n')
                : [
                    ubl ? `UBL Account: ${ubl}` : '',
                    abl ? `ABL Account: ${abl}` : '',
                    mcb ? `MCB Account: ${mcb}` : '',
                  ].filter(Boolean).join('\n') || `Campus: ${(matchedCampus?.name || item.campusName)?.toUpperCase() || ''}\nVoucher: ${serialNo}`;

            const campusAddress = matchedCampus?.address || item.campusAddress || item.tblCampus?.address || item.campusDetails?.address || "";
            const campusContact = matchedCampus?.contactNumber || matchedCampus?.contactNo || item.campusContactNumber || item.campusContact || item.campusPhone || item.tblCampus?.contactNumber || "";
            const campusEmail = matchedCampus?.email || item.campusEmail || item.tblCampus?.email || "";
            const ntn = matchedCampus?.ntn || item.ntn || item.campusNTN || "";

            const rawStudentImage = item.imageUrl || item.image || item.photo || item.studentImage || item.profileImage || item.studentPhoto || "";
            const normalizedStudentImage = rawStudentImage ? rawStudentImage.replace(/\\/g, '/') : "";
            const studentImage = normalizedStudentImage ? (normalizedStudentImage.startsWith('http') ? normalizedStudentImage : `${baseURL}/${normalizedStudentImage}`) : "/assets/img/students/student-01.jpg";

            return {
                id: item.id,
                campus: (matchedCampus?.name || item.campusName)?.toUpperCase() || "",
                ntn: ntn,
                campusAddress: campusAddress,
                campusContact: campusContact,
                campusEmail: campusEmail,
                studentImage: studentImage,
                studentName: `${item.firstName || ''} ${item.lastName || ''}`.trim().toUpperCase(),
                regNo: item.studentNumber || (item.id ? String(item.id) : ""),
                grade: item.grade || "",
                fatherName: item.fatherName?.toUpperCase() || "",
                address: item.address || "",
                contact: item.contactNumber || item.phone || item.mobileNumber || "",
                email: item.email || "",
                serialNo: serialNo,
                voucherNo: voucherNo,
                oneBillId: oneBillId,
                payproId: payproId,
                click2Pay: click2Pay,
                issueDate: issueDate,
                dueDate: dueDate,
                validityDate: validityDate,
                feePeriod: item.invoiceDate ? `${dayjs(item.invoiceDate).format("MMM YYYY")} - ${dayjs(item.invoiceDate).format("MMM YYYY")}` : "",
                totalPayable: totalPayable - (item.amountReceived || 0),
                payableByDueDate: totalPayable - (item.amountReceived || 0),
                payableAfterDueDate: (totalPayable - (item.amountReceived || 0)) + (item.lateFee || 0),
                ublAccount: ubl,
                ablAccount: abl,
                mcbAccount: mcb,
                bankAccounts: bankAccounts,
                bankQrValue: bankQrValue,
                details: details,
                isPayProEnabled: isPayProEnabled
            };
        });
    }, [datalist, deposits, bankDetails]);

    if (!datalist || datalist.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
                <h5>No voucher data available to display.</h5>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#525659', minHeight: '100vh' }}>
            <style>{`
        @media screen {
          .invoice-page-container {
            background: white;
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            padding: 12mm 15mm;
            box-shadow: 0 0 20px rgba(0,0,0,0.4);
            box-sizing: border-box;
            font-family: 'Inter', Arial, sans-serif;
            color: #000;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden;
          }

          #print-area, #print-area * {
            visibility: visible !important;
          }

          #print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
          }

          .invoice-page-container {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .invoice-page-container:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

            <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                    onClick={handlePrint}
                    style={{ padding: '12px 24px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Print All Vouchers
                </button>
            </div>

            <div id="print-area" ref={contentRef}>
                {vouchersData?.map((voucher: any) => (
                    <div key={voucher.id} className="invoice-page-container">
                        
                        {/* TOP SECTION: PARENT COPY */}
                        <div style={{ borderBottom: '2px dashed #444', paddingBottom: '16px', marginBottom: '16px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#000' }}>
                                    {voucher.campus}
                                </h3>
                                {voucher.ntn && (
                                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#000' }}>
                                        NTN {voucher.ntn}
                                    </div>
                                )}
                                {voucher.campusAddress && (
                                    <div style={{ fontSize: '10px', color: '#222', marginTop: '1px', fontWeight: 600 }}>
                                        Address: {voucher.campusAddress}
                                    </div>
                                )}
                                {(voucher.campusContact || voucher.campusEmail) && (
                                    <div style={{ fontSize: '10px', color: '#222', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '1px', fontWeight: 600 }}>
                                        {voucher.campusContact && <span>Contact: {voucher.campusContact}</span>}
                                        {voucher.campusEmail && <span>Email: {voucher.campusEmail}</span>}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    {/* Student Information Table with Photo */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '3px' }}>
                                        <table style={{ flex: 1, borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10.5px' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600, width: '120px' }}>Student Name:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 700 }}>{voucher.studentName}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Student ID:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.regNo}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Class:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.grade}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Parent Name:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.fatherName}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Address:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.address}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Contact:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.contact}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Email:</td>
                                                    <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.email}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Student Photo */}
                                        <div style={{ width: '130px', border: '1px solid #000', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9', flexShrink: 0 }}>
                                            <img 
                                                src={voucher.studentImage} 
                                                alt={voucher.studentName}
                                                onError={(e: any) => { e.target.src = "/assets/img/students/student-01.jpg"; }}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '8px', color: '#444' }}>
                                        If the above information is incorrect please update using the Parent app
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10.5px', marginBottom: '8px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600, width: '160px' }}>Voucher Number:</td>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 700 }}>{voucher.serialNo}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>
                                                    {voucher.isPayProEnabled ? "For PayPro / 1-Bill Payment" : "For 1-Bill Payment"}
                                                </td>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 700 }}>{voucher.oneBillId}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Issue Date:</td>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.issueDate}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Due Date:</td>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.dueDate}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000', fontWeight: 600 }}>Validity Date:</td>
                                                <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{voucher.validityDate}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10.5px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #000' }}>
                                                <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700 }}>
                                                    Fee Period {voucher.feePeriod}
                                                </th>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #000' }}>
                                                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700 }}>Charges</th>
                                                <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, width: '100px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {voucher.details?.map((item: any, idx: number) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '3px 6px' }}>{item.feeName}</td>
                                                    <td style={{ padding: '3px 6px', textAlign: 'right' }}>{item.remainingAmount?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {Array.from({ length: Math.max(0, 2 - (voucher.details?.length || 0)) }).map((_, i) => (
                                                <tr key={`empty-${i}`} style={{ height: '18px', borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '3px 6px' }}>&nbsp;</td>
                                                    <td style={{ padding: '3px 6px' }}>&nbsp;</td>
                                                </tr>
                                            ))}
                                            <tr style={{ borderTop: '1px solid #000', fontWeight: 700 }}>
                                                <td style={{ padding: '4px 6px' }}>Total Payable</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right' }}>{voucher.totalPayable?.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '4px 6px', fontWeight: 600 }}>Payable by '{voucher.dueDate}'</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{voucher.payableByDueDate?.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '4px 6px', fontWeight: 600 }}>Payable after due date</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{voucher.payableAfterDueDate?.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Mobile Application Promo Section */}
                                    <div style={{ border: '1px solid #000', padding: '8px', borderRadius: '4px', textAlign: 'center', backgroundColor: '#fafafa' }}>
                                        
                                        {/* Mobile App Promo Banner Image */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <img 
                                                src="/assets/img/mobile-app-promo.jpg" 
                                                alt="Get Yours Now - Track child development" 
                                                style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #ccc', display: 'block', margin: '0 auto' }} 
                                            />
                                        </div>

                                        {/* QR Codes Under Image (Uncomment when application is published) */}
                                        {/* <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '6px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ border: '1px solid #ccc', padding: '3px', backgroundColor: '#fff', borderRadius: '4px', display: 'inline-block' }}>
                                                    <QRCodeCanvas value="https://smartedu.app/ios" size={42} fgColor="#333" />
                                                </div>
                                                <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px' }}>IOS</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ border: '1px solid #ccc', padding: '3px', backgroundColor: '#fff', borderRadius: '4px', display: 'inline-block' }}>
                                                    <QRCodeCanvas value="https://smartedu.app/android" size={42} fgColor="#333" />
                                                </div>
                                                <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px' }}>Android</div>
                                            </div>
                                        </div> */}

                                        {/* Mobile App Status */}
                                        <div style={{
                                            backgroundColor: '#fff3cd',
                                            border: '1px solid #ffeeba',
                                            color: '#856404',
                                            fontWeight: 800,
                                            fontSize: '9.5px',
                                            padding: '3px 8px',
                                            borderRadius: '3px',
                                            display: 'inline-block',
                                            margin: '2px 0'
                                        }}>
                                            Mobile Application Coming Soon!
                                        </div>
                                    </div>

                                    {/* Payment Note Box */}
                                    <div style={{ border: '1px solid #000', padding: '6px 8px', borderRadius: '4px', fontSize: '9.5px', lineHeight: '1.4' }}>
                                        <div style={{ fontWeight: 800, marginBottom: '2px' }}>Note:</div>
                                        {voucher.isPayProEnabled ? (
                                            <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000' }}>
                                                Pay through PayPro
                                            </div>
                                        ) : (
                                            <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000' }}>
                                                Bank details are available in the QR code.
                                            </div>
                                        )}
                                    </div>

                                     {/* Payment QR Codes (PayPro QR / Bank Details QR & Payment Link QR) */}
                                     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '16px', margin: '4px 0 6px 0' }}>
                                         {/* PayPro QR Code (if isPayProEnabled) OR Campus Bank Details QR Code (if !isPayProEnabled) */}
                                         {voucher.isPayProEnabled ? (
                                             (voucher.payproId || voucher.oneBillId) && (
                                                 <div style={{ textAlign: 'center' }}>
                                                     <div style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: '#fff', borderRadius: '4px', display: 'inline-block' }}>
                                                         <QRCodeCanvas value={voucher.payproId || voucher.oneBillId} size={58} fgColor="#000" />
                                                     </div>
                                                     <div style={{ fontSize: '8.5px', fontWeight: 700, marginTop: '2px', color: '#111' }}>
                                                         PayPro ID: {voucher.payproId || voucher.oneBillId}
                                                     </div>
                                                 </div>
                                             )
                                         ) : (
                                             voucher.bankQrValue && (
                                                 <div style={{ textAlign: 'center' }}>
                                                     <div style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: '#fff', borderRadius: '4px', display: 'inline-block' }}>
                                                         <QRCodeCanvas value={voucher.bankQrValue} size={58} fgColor="#000" />
                                                     </div>
                                                     <div style={{ fontSize: '8.5px', fontWeight: 700, marginTop: '2px', color: '#111' }}>
                                                         Bank Details
                                                     </div>
                                                 </div>
                                             )
                                         )}

                                         {/* Click2Pay Payment Link QR Code */}
                                         {voucher.click2Pay && (
                                             <div style={{ textAlign: 'center' }}>
                                                 <div style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: '#fff', borderRadius: '4px', display: 'inline-block' }}>
                                                     <QRCodeCanvas value={voucher.click2Pay} size={58} fgColor="#000" />
                                                 </div>
                                                 <div style={{ fontSize: '8.5px', fontWeight: 700, marginTop: '2px', color: '#111' }}>
                                                     Payment Link QR
                                                 </div>
                                             </div>
                                         )}
                                     </div>

                                     {/* Important Instructions Box (Set under PayPro / Bank Details QR code) */}
                                     <div style={{ border: '1px solid #000', padding: '6px 8px', borderRadius: '4px', fontSize: '8px', lineHeight: '1.3', backgroundColor: '#fff' }}>
                                         <div style={{ fontWeight: 800, fontSize: '8.5px', marginBottom: '3px', textTransform: 'uppercase', color: '#111' }}>
                                             Important Instructions:
                                         </div>
                                         <ol style={{ margin: 0, paddingLeft: '12px', color: '#222' }}>
                                             {feeTermsConditions
                                                 .filter((instruction) => voucher.isPayProEnabled || !instruction.toLowerCase().includes('paypro'))
                                                 .map((instruction, idx) => (
                                                     <li key={idx} style={{ marginBottom: '1.5px' }}>{instruction}</li>
                                                 ))}
                                         </ol>
                                     </div>

                                    {/* Parent Copy Label */}
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'capitalize' }}>
                                            Parent Copy
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM SECTION: BANK COPY */}
                        <div style={{ paddingTop: '8px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#000' }}>
                                    {voucher.campus}
                                </h4>
                                {voucher.ntn && (
                                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#000' }}>
                                        NTN {voucher.ntn}
                                    </div>
                                )}
                                {voucher.campusAddress && (
                                    <div style={{ fontSize: '9.5px', color: '#222', marginTop: '1px', fontWeight: 600 }}>
                                        Address: {voucher.campusAddress}
                                    </div>
                                )}
                                {(voucher.campusContact || voucher.campusEmail) && (
                                    <div style={{ fontSize: '9.5px', color: '#222', display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '1px', fontWeight: 600 }}>
                                        {voucher.campusContact && <span>Contact: {voucher.campusContact}</span>}
                                        {voucher.campusEmail && <span>Email: {voucher.campusEmail}</span>}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    {/* Student Information Table with Photo */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                        <table style={{ flex: 1, borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #000' }}>
                                                    <th colSpan={2} style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>
                                                        Student Information
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', width: '120px', fontWeight: 600 }}>Student Name:</td>
                                                    <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 700 }}>{voucher.studentName}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '3px 6px', borderBottom: '1px solid #000', fontWeight: 600 }}>Student ID:</td>
                                                    <td style={{ padding: '3px 6px', borderBottom: '1px solid #000' }}>{voucher.regNo}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Student Photo */}
                                        <div style={{ width: '105px', border: '1px solid #000', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9', flexShrink: 0 }}>
                                            <img 
                                                src={voucher.studentImage} 
                                                alt={voucher.studentName}
                                                onError={(e: any) => { e.target.src = "/assets/img/students/student-01.jpg"; }}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10px' }}>
                                        <tbody>
                                            <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #000' }}>
                                                <th colSpan={2} style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>
                                                    Challan Information
                                                </th>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>Voucher Number:</td>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 700 }}>{voucher.serialNo}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>Due Date:</td>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc' }}>{voucher.dueDate}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', fontWeight: 600 }}>Validity Date:</td>
                                                <td style={{ padding: '3px 6px' }}>{voucher.validityDate}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '10px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #000' }}>
                                                <th colSpan={2} style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 700 }}>
                                                    Fee Period {voucher.feePeriod}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>Payable by '{voucher.dueDate}'</td>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>{voucher.payableByDueDate?.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #000', fontWeight: 600 }}>Payable after due date</td>
                                                <td style={{ padding: '3px 6px', borderBottom: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>{voucher.payableAfterDueDate?.toLocaleString()}</td>
                                            </tr>
                                            {voucher.bankAccounts && voucher.bankAccounts.length > 0 ? (
                                                voucher.bankAccounts.map((b: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>{b.label}</td>
                                                        <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontFamily: 'monospace', fontWeight: 600 }}>{b.value}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <>
                                                    {voucher.ublAccount && (
                                                        <tr>
                                                            <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>UBL Account:</td>
                                                            <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontFamily: 'monospace', fontWeight: 600 }}>{voucher.ublAccount}</td>
                                                        </tr>
                                                    )}
                                                    {voucher.ablAccount && (
                                                        <tr>
                                                            <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>ABL Account:</td>
                                                            <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontFamily: 'monospace', fontWeight: 600 }}>{voucher.ablAccount}</td>
                                                        </tr>
                                                    )}
                                                    {voucher.mcbAccount && (
                                                        <tr>
                                                            <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontWeight: 600 }}>MCB Account:</td>
                                                            <td style={{ padding: '3px 6px', borderBottom: '1px solid #ccc', fontFamily: 'monospace', fontWeight: 600 }}>{voucher.mcbAccount}</td>
                                                        </tr>
                                                    )}
                                                </>
                                            )}
                                            <tr>
                                                <td style={{ padding: '3px 6px', fontWeight: 600 }}>
                                                    {voucher.isPayProEnabled ? "For PayPro / 1-Bill Payment" : "For 1-Bill Payment"}
                                                </td>
                                                <td style={{ padding: '3px 6px', fontFamily: 'monospace', fontWeight: 700 }}>{voucher.oneBillId}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '9.5px', color: '#222' }}>
                                <div style={{ fontWeight: 600 }}>
                                    {voucher.isPayProEnabled
                                        ? "For Payments: Pay through PayPro (Fee will not be accepted without PayPro application)"
                                        : "For Payments: use Voucher Number"
                                    }
                                </div>
                                <div>{dayjs().format("DD/MM/YYYY hh:mm:ss A")}</div>
                                <div style={{ fontWeight: 800, fontSize: '11px' }}>Bank Copy</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BulkFeePrint;
