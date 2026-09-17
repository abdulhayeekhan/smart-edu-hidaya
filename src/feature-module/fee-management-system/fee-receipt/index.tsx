import React, { ChangeEvent, useEffect, FormEvent, useState, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { useSectionList } from "../../../core/common/selectoption/academic/useSections";
import { useAdmissions } from "../../../core/common/selectoption/academic/useAdmissions";
import { useCities } from "../../../core/common/selectoption/address/useCities";
import { TagsInput } from "react-tag-input-component";
import CommonSelect from "../../../core/common/commonSelect";
import CommonSelect2 from "../../../core/common/commonSelect2"
import CommonSelect3 from "../../../core/common/commonSelect3"
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import axios from "axios";
import { useLastAcademicSession } from '../../../core/common/selectoption/academic/useLastAcademicSession';
import { GetFeeInvoices, FeeInvoiceFilter, CancelInvoice, GetInvoiceByNumber, ManualReceiptDiscount, ManualReceiptPayload } from '../../../store/apps/fee-invoice'
import { ReceiveDeposit } from "../../../store/apps/security-deposit";
import { useCampusFeeRecAccount } from '../../../core/common/selectoption/financial/useCampusFeeRecAccount';
import toast from "react-hot-toast";
import html2pdf from 'html2pdf.js';
import Barcode from 'react-barcode';
import { QRCodeCanvas } from 'qrcode.react';
import { CompnayIcon, BrandName, PoweredBy, feeTermsConditions } from '../../../environment'
import { GetCampusBanksByCampus } from "../../../store/apps/campus-bank";

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

interface SearchInvoice {
    invoiceNumber: number;
    campusId: number;
    receiptAccount?: number;
    referenceNo?: string;
    detail?: {
        feeTypeId: number;
        month: string;
        amountReceived: number;
    }[];
}

export interface InvoiceDetail {
    id: number;
    feeInvoiceId: number;
    feeTypeId: number;
    feeName: string;
    invoiceAmount: number;
    discountAmount: number;
    receivedAmount: number;
    remainingAmount: number;
    invoiceMonth: string; // ISO Date string
}

export interface Invoice {
    id: number;
    campusId: number;
    studentNumber: string;
    fatherName: string;
    campusName: string;
    admissionId: number;
    firstName: string;
    lastName: string;
    session: string;
    grade: string;
    invoiceVoucherId: number;
    invoiceNumber: number;
    invoiceDate: string; // ISO Date string
    monthFrom: string; // ISO Date string
    monthTo: string; // ISO Date string
    dueDate: string; // ISO Date string
    totalAmount: number;
    totalDiscount: number;
    netAmount: number;
    amountReceived: number;
    invoiceStatusId: number;
    status: 'pending' | 'paid' | 'partial' | string; // Narrowed type based on data
    orderNumber: string;
    orderId: string;
    details: InvoiceDetail[];
    receipts: any[]; // Kept as any[] since the data is empty
}

const FeeReceipt = () => {
    const routes = all_routes;
    const dispatch = useDispatch<AppDispatch>();
    const userInfoString = localStorage.getItem("userData");
    const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
    const loginInfo = userInfo?.data
    const userId = loginInfo?.id
    const regionsList = useRegionsList();
    const { data: bankDetails } = useSelector((state: RootState) => state.campusBank);
    const bankOptions = bankDetails?.map((bank: any) => ({
        value: bank.accountId,
        label: `${bank.tblAccountBank?.name} (${bank.iban})`
    }));
    const feeRecAccountOptions = useCampusFeeRecAccount()
    const combinedOptions = [
        ...feeRecAccountOptions,
        ...(bankOptions || [])
    ];
    const [regionId, setRegionId] = useState(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : null)
    const handleSelectRegion = (name: string, option: any) => {
        setRegionId(option?.value ?? 0);
    }
    const campuses = useCampusesList(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : regionId);

    const location = useLocation();

    const initialCampusId = location.state?.campusId || (loginInfo?.userLevel === 3 ? loginInfo?.userLevelId : 0);
    const [campusId, setCampusId] = useState<number>(initialCampusId);

    useEffect(() => {
        if (campusId) {
            dispatch(GetCampusBanksByCampus(campusId));
        }
    }, [campusId, dispatch]);

    const [gradeId, setGradeId] = useState<number>(0);
    const [sectionId, setSectionId] = useState<number>(0);
    const [admissionId, setAdmissionId] = useState<number>(0);

    const grades = useAcademicGrades();
    const sections = useSectionList(campusId);
    const { studentOptions } = useAdmissions({ externalCampusId: campusId, externalGradeId: gradeId, externalSectionId: sectionId });


    const [searchMode, setSearchMode] = useState<"student" | "voucher">("student");
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [searchInvoice, setSearchInvoice] = useState<SearchInvoice>({
        invoiceNumber: location.state?.invoiceNumber || 0,
        campusId: campusId
    });

    const [depositDetail, setDepositDetail] = useState<any>(null);
    const [securityAmountReceived, setSecurityAmountReceived] = useState<number>(0);

    const handleSearchInvoice = (e: any) => {
        const { name, value } = e.target;
        setSearchInvoice(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const [formData, setFormData] = useState<Invoice>({
        id: 0,
        campusId: campusId,
        studentNumber: '',
        fatherName: '',
        campusName: '',
        admissionId: 0,
        firstName: '',
        lastName: '',
        session: '',
        grade: '',
        invoiceVoucherId: 0,
        invoiceNumber: 0,
        invoiceDate: '',
        monthFrom: '',
        monthTo: '',
        dueDate: '',
        totalAmount: 0,
        totalDiscount: 0,
        netAmount: 0,
        amountReceived: 0,
        invoiceStatusId: 0,
        status: '',
        orderNumber: '',
        orderId: '',
        details: [],
        receipts: []
    });


    // useEffect(() => {
    //     dispatch(GetFeeInvoices(formData as FeeInvoiceFilter))
    // }, [dispatch, formData])
    const handleChange = (name: keyof SearchInvoice, value: any) => {
        setSearchInvoice((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // 3. Update handleSelectCampus to also update formData
    const handleSelectCampus = (name: string, option: any) => {
        const selectedId = option?.value ?? 0;
        setCampusId(selectedId);
        setSearchInvoice(prev => ({
            ...prev,
            campusId: selectedId
        }));
    };


    const [searching, setSearching] = useState(false)
    const handleSearchInvoiceData = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearching(true)
        try {
            let targetInvoiceNumber = searchInvoice.invoiceNumber;
            if (!targetInvoiceNumber && admissionId) {
                // Fetch the latest pending invoice for the admission
                const invoicesData: any = await dispatch(GetFeeInvoices({ admissionId, status: "pending", pageSize: 1, pageNo: 1 } as FeeInvoiceFilter));
                const invoices = invoicesData?.payload?.data;
                if (invoices && invoices.length > 0) {
                    targetInvoiceNumber = invoices[0].invoiceNumber;
                    // Update form so it visually shows the found invoice
                    setSearchInvoice(prev => ({ ...prev, invoiceNumber: targetInvoiceNumber }));
                } else {
                    toast.error("No pending invoices found for this student.");
                    setSearching(false);
                    return;
                }
            }

            if (!targetInvoiceNumber) {
                toast.error("Please enter a voucher number or select a student.");
                setSearching(false);
                return;
            }

            const data: any = await dispatch(GetInvoiceByNumber({ ...searchInvoice, invoiceNumber: targetInvoiceNumber }))
            const payload = data?.payload;
            if (payload?.invoiceStatusId === 2) {
                setSearching(false)
            } else if (payload) {
                // 1. Map the API 'details' to your state's 'detail' format
                const mappedDetails = payload.details.map((item: any) => ({
                    feeTypeId: item.feeTypeId,
                    month: item.invoiceMonth,
                    amountReceived: item.remainingAmount // Mapping remaining to received as requested
                }));

                // 2. Update the searchInvoice state
                setSearchInvoice((prevState) => ({
                    ...prevState,
                    invoiceNumber: payload.invoiceNumber,
                    detail: mappedDetails
                }));

                // Fetch Security Deposit
                try {
                    const depData: any = await axios.get(`${baseURL}/api/SecurityDeposit/GetDepositDetail/${payload.admissionId}`);
                    if (depData.data.status && depData.data.data) {
                        setDepositDetail(depData.data.data);
                        setSecurityAmountReceived(depData.data.data.amount); // Default to full amount
                    } else {
                        setDepositDetail(null);
                        setSecurityAmountReceived(0);
                    }
                } catch (err) {
                    console.error("Error fetching deposit:", err);
                    setDepositDetail(null);
                    setSecurityAmountReceived(0);
                }

                // If you still need to set the general form data
                setFormData(payload);
                setSearching(false);
            } else {
                setSearching(false)
            }
        } catch (error) {
            toast.error("Failed to fetch invoice data. Please check the voucher number and try again.");
            console.error(error);
            setSearching(false)
        } finally {
            setSearching(false)
        }
    }

    useEffect(() => {
        if (location.state?.invoiceNumber) {
            handleSearchInvoiceData({ preventDefault: () => {} } as React.FormEvent);
            // Optional: clear state so refresh doesn't trigger it again
            window.history.replaceState({}, document.title)
        }
    }, [location.state?.invoiceNumber]);

    const handleReceiptChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        feeTypeId: number,
        month: string,
        maxAmount: number
    ) => {
        const value = parseFloat(e.target.value) || 0;

        // Validation: Don't allow values higher than remainingAmount or less than 0
        if (value > maxAmount) {
            toast.error(`Amount cannot exceed the remaining balance of ${maxAmount}`);
            return;
        }
        if (value < 0) return;

        setSearchInvoice((prev) => ({
            ...prev,
            detail: prev?.detail?.map((d) =>
                d.feeTypeId === feeTypeId && d.month === month
                    ? { ...d, amountReceived: value }
                    : d
            ),
        }));
    };
    const totalReceived = useMemo(() => {
        const detailTotal = searchInvoice?.detail?.reduce((sum, item) => {
            return sum + (Number(item.amountReceived) || 0);
        }, 0) || 0;
        return detailTotal + securityAmountReceived;
    }, [searchInvoice?.detail, securityAmountReceived]);

    const handleSelectChanges = (name: string, option: any) => {
        const selectedId = option?.value ?? 0;
        setSearchInvoice(prev => ({
            ...prev,
            [name]: selectedId
        }));
    };


    // 2. Sync campusId and userId when loginInfo or user details change

    const [isActionLoading, setIsActionLoading] = useState(false);
    const handleSaveReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        // Add "|| 0" at the very end of the expression
        const totalReceivedAmount = searchInvoice?.detail?.reduce((sum, item) => {
            return sum + (Number(item?.amountReceived) || 0);
        }, 0) || 0; // This ensures the result is 0 if detail is undefined
        // --- 1. Validation Logic ---
        const hasDetails = searchInvoice.detail && searchInvoice.detail.length > 0;
        const hasAmount = totalReceived > 0;
        const hasAccount = !!searchInvoice.receiptAccount;

        if (!hasDetails) {
            toast.error("No fee details found for this invoice.");
            setIsActionLoading(false);
            return;
        }

        if (!hasAccount) {
            toast.error("Please select a Bank/Cash account.");
            setIsActionLoading(false);
            return;
        }

        if (!hasAmount) {
            toast.error("Total amount received must be greater than 0.");
            setIsActionLoading(false);
            return;
        }

        // Filter out rows where amountReceived is 0 to send clean data to API
        const finalPayload = {
            ...searchInvoice,
            detail: searchInvoice?.detail?.filter(d => d.amountReceived > 0)
        };

        try {
            // Only call ManualReceiptDiscount if there are regular fee items to pay
            if (totalReceivedAmount > 0) {
                await dispatch(ManualReceiptDiscount(finalPayload as ManualReceiptPayload));
            }

            // Call ReceiveDeposit if security amount is entered
            if (securityAmountReceived > 0 && depositDetail) {
                await dispatch(ReceiveDeposit({
                    admissionId: formData.admissionId,
                    amount: securityAmountReceived,
                    actionDate: dayjs().format("YYYY-MM-DD"),
                    userId: userId,
                    accountSettingType: "security_deposit_received"
                }));
            }

            // --- 2. Reset State as requested ---
            setSearchInvoice({
                invoiceNumber: 0,
                campusId: campusId,
                // detail, receiptAccount, and referenceNo are removed
            });
            setDepositDetail(null);
            setSecurityAmountReceived(0);

            // Clear form data to hide the invoice details UI
            // --- 3. Full Reset of formData State ---
            setFormData({
                id: 0,
                campusId: campusId,
                studentNumber: '',
                fatherName: '',
                campusName: '',
                admissionId: 0,
                firstName: '',
                lastName: '',
                session: '',
                grade: '',
                invoiceVoucherId: 0,
                invoiceNumber: 0,
                invoiceDate: '',
                monthFrom: '',
                monthTo: '',
                dueDate: '',
                totalAmount: 0,
                totalDiscount: 0,
                netAmount: 0,
                amountReceived: 0,
                invoiceStatusId: 0,
                status: '',
                orderNumber: '',
                orderId: '',
                details: [],
                receipts: []
            });

        } catch (error) {
            toast.error("Failed to save receipt.");
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCancel = () => {
        setGradeId(0);
        setSectionId(0);
        setAdmissionId(0);
        setSearchInvoice({
            invoiceNumber: 0,
            campusId: campusId,
        });
        setFormData({
            id: 0,
            campusId: campusId,
            studentNumber: '',
            fatherName: '',
            campusName: '',
            admissionId: 0,
            firstName: '',
            lastName: '',
            session: '',
            grade: '',
            invoiceVoucherId: 0,
            invoiceNumber: 0,
            invoiceDate: '',
            monthFrom: '',
            monthTo: '',
            dueDate: '',
            totalAmount: 0,
            totalDiscount: 0,
            netAmount: 0,
            amountReceived: 0,
            invoiceStatusId: 0,
            status: '',
            orderNumber: '',
            orderId: '',
            details: [],
            receipts: []
        });
        setDepositDetail(null);
        setSecurityAmountReceived(0);
        toast.dismiss();
    };






    return (
        <div className="page-wrapper">
            <div className="content content-two">
                {/* Page Header */}
                <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
                    <div className="my-auto mb-2">
                        <h3 className="mb-1">Add Fee Receipt (Single)</h3>
                        <nav>
                            <ol className="breadcrumb mb-0">
                                <li className="breadcrumb-item">
                                    <Link to={routes.adminDashboard}>Dashboard</Link>
                                </li>
                                <li className="breadcrumb-item">
                                    <Link to={routes.feeInvoices}>Fee Invoices</Link>
                                </li>
                                <li className="breadcrumb-item active" aria-current="page">
                                    Add Fee Receipt
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>


                <div className="row">
                    <div className="col-md-12">
                        <form onSubmit={handleSearchInvoiceData}>
                            <div className="card shadow-sm border-0 mb-4">
                                <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                                    <div>
                                        <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                                            <i className="ti ti-receipt-2 text-primary me-2 fs-20" /> Search & Load Fee Invoice
                                        </h5>
                                        <p className="text-muted fs-12 mb-0 mt-1">
                                            Quickly find fee invoices by Class & Student Admission or directly via Voucher Number.
                                        </p>
                                    </div>
                                    <div className="btn-group bg-light p-1 rounded-pill border">
                                        <button
                                            type="button"
                                            className={`btn btn-sm rounded-pill px-3 fw-medium ${searchMode === "student" ? "btn-primary shadow-sm" : "btn-light text-muted border-0"}`}
                                            onClick={() => setSearchMode("student")}
                                        >
                                            <i className="ti ti-user me-1" /> By Student
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm rounded-pill px-3 fw-medium ${searchMode === "voucher" ? "btn-primary shadow-sm" : "btn-light text-muted border-0"}`}
                                            onClick={() => setSearchMode("voucher")}
                                        >
                                            <i className="ti ti-barcode me-1" /> By Voucher #
                                        </button>
                                    </div>
                                </div>

                                <div className="card-body p-4">
                                    {searchMode === "student" ? (
                                        <div className="row g-3">
                                            {loginInfo?.userLevel === 1 && (
                                                <div className="col-md-4 col-lg-3">
                                                    <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                        <i className="ti ti-map-pin text-primary me-1" /> Region
                                                    </label>
                                                    <CommonSelect3
                                                        className="select"
                                                        options={regionsList}
                                                        onChange={(option) => handleSelectRegion('regions', option)}
                                                        value={regionId ? regionsList.find(r => r.value === regionId) : regionsList[0]}
                                                    />
                                                </div>
                                            )}
                                            {(loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                                                <div className="col-md-4 col-lg-3">
                                                    <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                        <i className="ti ti-building text-primary me-1" /> Campus
                                                    </label>
                                                    <CommonSelect3
                                                        className="select"
                                                        options={campuses}
                                                        onChange={(option) => handleSelectCampus('campusId', option)}
                                                        value={searchInvoice?.campusId ? campuses.find(c => c.value === searchInvoice?.campusId) : campuses[0]}
                                                    />
                                                    {errors.campusId && <small className="text-danger d-block mt-1">{errors.campusId}</small>}
                                                </div>
                                            )}
                                            <div className="col-md-4 col-lg-3">
                                                <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                    <i className="ti ti-school text-primary me-1" /> Grade / Class
                                                </label>
                                                <CommonSelect3
                                                    className="select"
                                                    options={grades}
                                                    onChange={(option) => { setGradeId(option?.value ? Number(option.value) : 0); setSectionId(0); setAdmissionId(0); }}
                                                    value={gradeId ? grades.find(c => c.value === gradeId) : grades[0]}
                                                    placeholder="Select Grade"
                                                />
                                            </div>
                                            <div className="col-md-4 col-lg-3">
                                                <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                    <i className="ti ti-layout-grid text-primary me-1" /> Section
                                                </label>
                                                <CommonSelect3
                                                    className="select"
                                                    options={sections}
                                                    onChange={(option) => { setSectionId(option?.value ? Number(option.value) : 0); setAdmissionId(0); }}
                                                    value={sectionId ? sections.find(c => c.value === sectionId) : sections[0]}
                                                    placeholder="Select Section"
                                                />
                                            </div>
                                            <div className="col-md-8 col-lg-8">
                                                <label className="form-label fw-semibold text-dark fs-13 mb-1 d-flex align-items-center justify-content-between">
                                                    <span><i className="ti ti-user-circle text-primary me-1" /> Student (Admission)</span>
                                                    {studentOptions && studentOptions.length > 1 && (
                                                        <span className="badge bg-primary-subtle text-primary fw-medium fs-11">
                                                            {studentOptions.length - 1} Students Found
                                                        </span>
                                                    )}
                                                </label>
                                                <CommonSelect3
                                                    className="select"
                                                    options={studentOptions}
                                                    onChange={(option) => setAdmissionId(option?.value ? Number(option.value) : 0)}
                                                    value={admissionId ? studentOptions.find((c: any) => c.value === admissionId) : studentOptions[0]}
                                                    placeholder="Search student by Name, Roll No or Father Name..."
                                                />
                                            </div>
                                            <div className="col-md-4 col-lg-4 d-flex align-items-end">
                                                <div className="d-flex gap-2 w-100">
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary d-inline-flex align-items-center justify-content-center flex-grow-1 shadow-sm"
                                                        style={{ height: "40px" }}
                                                        disabled={searching}
                                                    >
                                                        {searching ? (
                                                            <><span className="spinner-border spinner-border-sm me-2" /> Searching...</>
                                                        ) : (
                                                            <><i className="ti ti-search me-1 fs-15" /> Search Invoice</>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancel}
                                                        className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center px-3"
                                                        style={{ height: "40px" }}
                                                        title="Reset filters"
                                                    >
                                                        <i className="ti ti-rotate fs-15" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="row g-3">
                                            {loginInfo?.userLevel === 1 && (
                                                <div className="col-md-4 col-lg-3">
                                                    <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                        <i className="ti ti-map-pin text-primary me-1" /> Region
                                                    </label>
                                                    <CommonSelect3
                                                        className="select"
                                                        options={regionsList}
                                                        onChange={(option) => handleSelectRegion('regions', option)}
                                                        value={regionId ? regionsList.find(r => r.value === regionId) : regionsList[0]}
                                                    />
                                                </div>
                                            )}
                                            {(loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                                                <div className="col-md-4 col-lg-3">
                                                    <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                        <i className="ti ti-building text-primary me-1" /> Campus
                                                    </label>
                                                    <CommonSelect3
                                                        className="select"
                                                        options={campuses}
                                                        onChange={(option) => handleSelectCampus('campusId', option)}
                                                        value={searchInvoice?.campusId ? campuses.find(c => c.value === searchInvoice?.campusId) : campuses[0]}
                                                    />
                                                    {errors.campusId && <small className="text-danger d-block mt-1">{errors.campusId}</small>}
                                                </div>
                                            )}
                                            <div className="col-md-6 col-lg-6">
                                                <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                    <i className="ti ti-barcode text-primary me-1" /> Voucher / Invoice Number
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-light text-muted border-end-0">
                                                        <i className="ti ti-receipt text-primary fs-16" />
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className="form-control border-start-0 ps-1"
                                                        name="invoiceNumber"
                                                        placeholder="Enter Voucher Number (e.g. 100234)"
                                                        onChange={handleSearchInvoice}
                                                        value={searchInvoice.invoiceNumber || ''}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4 col-lg-3 d-flex align-items-end">
                                                <div className="d-flex gap-2 w-100">
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary d-inline-flex align-items-center justify-content-center flex-grow-1 shadow-sm"
                                                        style={{ height: "40px" }}
                                                        disabled={searching}
                                                    >
                                                        {searching ? (
                                                            <><span className="spinner-border spinner-border-sm me-2" /> Searching...</>
                                                        ) : (
                                                            <><i className="ti ti-search me-1 fs-15" /> Search Invoice</>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancel}
                                                        className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center px-3"
                                                        style={{ height: "40px" }}
                                                        title="Reset filters"
                                                    >
                                                        <i className="ti ti-rotate fs-15" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {formData?.id > 0 && (
                        <>
                            <div className="col-md-12">
                                <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                                    <div className="card-header bg-light-300 py-3 border-bottom d-flex align-items-center justify-content-between">
                                        <h5 className="card-title mb-0 d-flex align-items-center text-dark fw-bold">
                                            <i className="ti ti-id-badge-2 text-primary me-2 fs-18" /> Student & Invoice Summary
                                        </h5>
                                        <span className={`badge px-3 py-2 fs-12 ${formData?.status?.toLowerCase() === 'paid' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                                            <i className="ti ti-point-filled me-1" /> {formData?.status || 'Pending'}
                                        </span>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-3">
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-calendar-event me-1 text-primary" /> Session</small>
                                                    <strong className="text-dark fs-14">{formData?.session || 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-school me-1 text-primary" /> Grade / Class</small>
                                                    <strong className="text-dark fs-14">{formData?.grade || 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-hash me-1 text-primary" /> Registration No</small>
                                                    <strong className="text-dark fs-14">{formData?.studentNumber || 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-user me-1 text-primary" /> Student Name</small>
                                                    <strong className="text-dark fs-14">{`${formData?.firstName || ''} ${formData?.lastName || ''}`.trim() || 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-barcode me-1 text-primary" /> Voucher Number</small>
                                                    <strong className="text-primary fs-14">#{formData?.invoiceNumber || 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-calendar me-1 text-primary" /> Invoice Date</small>
                                                    <strong className="text-dark fs-14">{formData?.invoiceDate ? dayjs(formData?.invoiceDate).format("DD-MMM-YYYY") : 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-calendar-due me-1 text-danger" /> Due Date</small>
                                                    <strong className="text-danger fs-14">{formData?.dueDate ? dayjs(formData?.dueDate).format("DD-MMM-YYYY") : 'N/A'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6 col-lg-3">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-1"><i className="ti ti-cash me-1 text-success" /> Net Amount</small>
                                                    <strong className="text-success fs-15">Rs. {formData?.netAmount?.toLocaleString() || '0'}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card shadow-sm mb-4">
                                    <div className="card-body">
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-striped align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Fee Type</th>
                                                        <th>Invoice Amount</th>
                                                        <th>Discount</th>
                                                        <th>Balance</th>
                                                        <th style={{ width: '200px' }}>Receipt Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formData?.details?.map(item => {
                                                        // Find the corresponding state entry for this specific fee type AND month
                                                        const stateDetail = searchInvoice?.detail?.find(d => d.feeTypeId === item.feeTypeId && d.month === item.invoiceMonth);
                                                        return (
                                                            <tr key={item?.id}>
                                                                <td><strong>{item?.feeName}</strong> <small>({dayjs(item?.invoiceMonth).format("MMM-YYYY")})</small></td>
                                                                <td>{item?.invoiceAmount}</td>
                                                                <td>{item?.discountAmount}</td>
                                                                <td>{item?.remainingAmount}</td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm"
                                                                        // Show the value from searchInvoice state
                                                                        value={stateDetail?.amountReceived !== undefined && stateDetail?.amountReceived !== null ? stateDetail.amountReceived : ""}
                                                                        onChange={(e) => handleReceiptChange(e, item.feeTypeId, item.invoiceMonth, item.remainingAmount)}
                                                                        placeholder="RECEIPT AMOUNT"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        )
                                                    }
                                                    )}
                                                    {depositDetail && depositDetail.amount > 0 && (
                                                        <tr>
                                                            <td><strong>Security</strong></td>
                                                            <td>{depositDetail.amount}</td>
                                                            <td>0</td>
                                                            <td>{depositDetail.amount}</td>
                                                            <td>
                                                                <div className="form-check form-switch">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input"
                                                                        style={{ cursor: 'pointer' }}
                                                                        checked={securityAmountReceived === depositDetail.amount}
                                                                        onChange={(e) => {
                                                                            setSecurityAmountReceived(e.target.checked ? depositDetail.amount : 0);
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label">
                                                                        {securityAmountReceived === depositDetail.amount ? "Full Amount" : "Pay Full"}
                                                                    </label>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className="table-dark">
                                                    <tr>
                                                        <td colSpan={3} className="text-end"><strong>TOTAL AMOUNT</strong></td>
                                                        <td>{formData?.netAmount + (depositDetail?.amount || 0)}</td>
                                                        <td><strong>{totalReceived}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                                    <div className="card-header bg-white py-3 border-bottom d-flex align-items-center">
                                        <h5 className="card-title mb-0 fw-bold text-dark d-flex align-items-center">
                                            <i className="ti ti-wallet text-primary me-2 fs-18" /> Payment Details
                                        </h5>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                    <i className="ti ti-building-bank text-primary me-1" /> Deposit Account (Bank / Cash) <span className="text-danger">*</span>
                                                </label>
                                                <CommonSelect3
                                                    className="select"
                                                    options={combinedOptions}
                                                    onChange={(option) => handleSelectChanges('receiptAccount', option)}
                                                    value={
                                                        searchInvoice?.receiptAccount
                                                            ? combinedOptions.find(r => Number(r?.value) === Number(searchInvoice?.receiptAccount))
                                                            : combinedOptions[0]
                                                    }
                                                    placeholder="Select Deposit Bank or Cash Account"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold text-dark fs-13 mb-1">
                                                    <i className="ti ti-receipt-2 text-primary me-1" /> Transaction Reference No
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    onChange={e => handleChange('referenceNo', e.target.value)}
                                                    name="referenceNo"
                                                    placeholder="e.g. Bank slip # / Cheque # / Online Txn ID"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-12 text-end mt-4">
                                <button
                                    type="button"
                                    className="btn btn-light me-2"
                                    onClick={handleCancel}
                                    disabled={isActionLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleSaveReceipt}
                                    disabled={isActionLoading || totalReceived === 0}
                                >
                                    {isActionLoading ? (
                                        <><span className="spinner-border spinner-border-sm me-2" /> Saving...</>
                                    ) : (
                                        'Save Receipt'
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div >
        </div>
    );
};

export default FeeReceipt;