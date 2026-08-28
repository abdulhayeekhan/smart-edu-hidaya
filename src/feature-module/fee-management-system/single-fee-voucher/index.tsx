import React, { useEffect, useState, useRef, useMemo } from "react";
import dayjs from "dayjs";
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import axios from "axios";
import { QRCodeCanvas } from 'qrcode.react';
import { GetCampusBanksByCampus } from "../../../store/apps/campus-bank";
import { feeTermsConditions } from '../../../environment';
import html2pdf from 'html2pdf.js';

const baseURL = process.env.REACT_APP_API_BASE_URL;

interface VoucherDetail {
    feeName: string;
    remainingAmount: number;
    invoiceMonth?: string;
}

interface StudentItem {
    id: number;
    campusName: string;
    invoiceNumber: string | number;
    firstName: string;
    campusId?: number;
    admissionId?: number;
    lastName: string;
    imageUrl?: string;
    fatherName: string;
    studentNumber: string;
    grade: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    ntn?: string;
    invoiceDate: string | Date;
    dueDate: string | Date;
    totalDiscount: number;
    netAmount: number;
    totalPayable?: number;
    amountReceived?: number;
    lateFee?: number;
    isPayProEnabled?: boolean;
    isPayproEnabled?: boolean;
    details: VoucherDetail[];
}

interface Props {
    data: StudentItem;
    hideHeaderButtons?: boolean;
}

const SingleFeeVoucher: React.FC<Props> = ({ data, hideHeaderButtons = false }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const dispatch = useDispatch<AppDispatch>();
    const { data: bankDetails } = useSelector((state: RootState) => state.campusBank);
    const [campusApiInfo, setCampusApiInfo] = useState<any>(null);

    useEffect(() => {
        const campusId = data?.campusId;
        if (campusId) {
            dispatch(GetCampusBanksByCampus(campusId));
            axios.get(`${baseURL}/api/campus/getcampusbyid?id=${campusId}`)
                .then(res => {
                    if (res.data?.data) {
                        setCampusApiInfo(res.data.data);
                    }
                })
                .catch(err => {
                    console.error("Error fetching campus info from API:", err);
                });
        }
    }, [data?.campusId, dispatch]);

    const [deposit, setDeposit] = useState<any>(null);
    useEffect(() => {
        const fetchDeposit = async () => {
            if (data?.admissionId) {
                try {
                    const res = await axios.get(`${baseURL}/api/SecurityDeposit/GetDepositDetail/${data.admissionId}`);
                    if (res.data.status && res.data.data) {
                        setDeposit(res.data.data);
                    }
                } catch (error) {
                    console.error("Error fetching deposit:", error);
                }
            }
        };
        fetchDeposit();
    }, [data?.admissionId]);

    const voucher = useMemo(() => {
        if (!data) return null;
        const details = data.details ? [...data.details] : [];

        let netAmount = data.totalPayable || data.netAmount || 0;
        if (deposit && deposit.amount > 0) {
            const index = details.findIndex((d) => d.feeName?.toLowerCase().includes("security deposit"));
            if (index !== -1) {
                details[index] = {
                    ...details[index],
                    remainingAmount: deposit.amount
                };
            } else {
                details.push({
                    feeName: "Security Deposit",
                    remainingAmount: deposit.amount
                });
                netAmount += deposit.amount;
            }
        }

        const invoiceNumber = data.invoiceNumber !== undefined && data.invoiceNumber !== null ? data.invoiceNumber.toString() : ((data as any).voucherNo?.toString() || data.id?.toString() || "");
        const payproId = (data as any).payproId || (data as any).payProId || (data as any).orderNumber || invoiceNumber;
        const click2Pay = (data as any).click2Pay || (data as any).paymentUrl || "";
        const serialNo = invoiceNumber;
        const voucherNo = invoiceNumber;
        const oneBillId = payproId;
        const issueDate = data.invoiceDate ? dayjs(data.invoiceDate).format("MMM DD, YYYY") : "";
        const dueDate = data.dueDate ? dayjs(data.dueDate).format("MMM DD, YYYY") : "";
        const validityDate = data.dueDate ? dayjs(data.dueDate).add(5, 'day').format("MMM DD, YYYY") : "";

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

        const isPayProEnabled = campusApiInfo?.isPayProEnabled !== undefined
            ? Boolean(campusApiInfo.isPayProEnabled)
            : data.isPayProEnabled !== undefined
                ? Boolean(data.isPayProEnabled)
                : (data as any).isPayproEnabled !== undefined
                    ? Boolean((data as any).isPayproEnabled)
                    : true;

        const bankQrValue = bankAccounts && bankAccounts.length > 0
            ? bankAccounts.map((b: any) => `${b.label} ${b.value}`).join('\n')
            : [
                ubl ? `UBL Account: ${ubl}` : '',
                abl ? `ABL Account: ${abl}` : '',
                mcb ? `MCB Account: ${mcb}` : '',
              ].filter(Boolean).join('\n') || `Campus: ${(campusApiInfo?.name || data.campusName)?.toUpperCase() || ''}\nVoucher: ${serialNo}`;

        const campusAddress = campusApiInfo?.address || (data as any).campusAddress || (data as any).tblCampus?.address || (data as any).campusDetails?.address || "";
        const campusContact = campusApiInfo?.contactNumber || campusApiInfo?.contactNo || (data as any).campusContactNumber || (data as any).campusContact || (data as any).campusPhone || (data as any).tblCampus?.contactNumber || "";
        const campusEmail = campusApiInfo?.email || (data as any).campusEmail || (data as any).tblCampus?.email || "";
        const ntn = campusApiInfo?.ntn || data.ntn || (data as any).campusNTN || "";

        const rawStudentImage = (data as any).imageUrl || (data as any).image || (data as any).photo || (data as any).studentImage || (data as any).profileImage || (data as any).studentPhoto || "";
        const normalizedStudentImage = rawStudentImage ? rawStudentImage.replace(/\\/g, '/') : "";
        const studentImage = normalizedStudentImage ? (normalizedStudentImage.startsWith('http') ? normalizedStudentImage : `${baseURL}/${normalizedStudentImage}`) : "/assets/img/students/student-01.jpg";

        return {
            id: data.id,
            campus: (campusApiInfo?.name || data.campusName)?.toUpperCase() || "",
            ntn: ntn,
            campusAddress: campusAddress,
            campusContact: campusContact,
            campusEmail: campusEmail,
            studentImage: studentImage,
            studentName: `${data.firstName || ''} ${data.lastName || ''}`.trim().toUpperCase(),
            regNo: data.studentNumber || (data.id ? String(data.id) : ""),
            grade: data.grade || "",
            fatherName: data.fatherName?.toUpperCase() || "",
            address: data.address || "",
            contact: data.contactNumber || (data as any).phone || (data as any).mobileNumber || "",
            email: data.email || "",
            serialNo: serialNo,
            voucherNo: voucherNo,
            oneBillId: oneBillId,
            payproId: payproId,
            click2Pay: click2Pay,
            issueDate: issueDate,
            dueDate: dueDate,
            validityDate: validityDate,
            feePeriod: data.invoiceDate ? `${dayjs(data.invoiceDate).format("MMM YYYY")} - ${dayjs(data.invoiceDate).format("MMM YYYY")}` : "",
            totalPayable: netAmount - (data.amountReceived || 0),
            payableByDueDate: netAmount - (data.amountReceived || 0),
            payableAfterDueDate: (netAmount - (data.amountReceived || 0)) + (data.lateFee || 0),
            ublAccount: ubl,
            ablAccount: abl,
            mcbAccount: mcb,
            bankAccounts: bankAccounts,
            bankQrValue: bankQrValue,
            details: details,
            isPayProEnabled: isPayProEnabled
        };
    }, [data, deposit, bankDetails]);

    if (!data || !voucher) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#000' }}>
                <h5>No voucher data available to display.</h5>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        if (!invoiceRef.current) return;
        const opt = {
            margin: [4, 4, 4, 4] as [number, number, number, number],
            filename: `Fee-Invoice-${voucher.serialNo || voucher.regNo || 'Voucher'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        html2pdf().set(opt).from(invoiceRef.current).save();
    };

    const voucherContent = (
        <div key={voucher.id} ref={invoiceRef} className="invoice-page-container" style={hideHeaderButtons ? { margin: '0 auto', boxShadow: 'none', background: '#fff', padding: '6mm 10mm', width: '202mm', boxSizing: 'border-box' } : {}}>
                    
                    {/* TOP SECTION: PARENT COPY */}
                    <div style={{ borderBottom: '2px dashed #444', paddingBottom: '16px', marginBottom: '16px' }}>
                        {/* Header: Campus & NTN & Contact Info */}
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
                            {/* Left Box (Student Info, Challan Info, Charges Table) */}
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

                                {/* Challan Information Table */}
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

                                {/* Fee Charges Breakdown Table */}
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

                            {/* Right Box (Mobile Application QR & Notes) */}
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
                        {/* Header */}
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
                            {/* Left Box (Student & Challan Info) */}
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

                            {/* Right Box (Payment Details & Bank Accounts) */}
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

                        {/* Footer */}
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
    );

    if (hideHeaderButtons) {
        return voucherContent;
    }

    return (
        <div className="print-container" style={{ padding: '20px', backgroundColor: '#525659', minHeight: '100vh' }}>
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
            background: white !important;
          }
          
          .print-container {
            padding: 0 !important;
            background: white !important;
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

          .no-print {
            display: none !important;
          }
        }
      `}</style>

            <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                    onClick={handlePrint}
                    style={{ padding: '12px 24px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    <i className="ti ti-printer me-2" />
                    Print Voucher
                </button>
                <button
                    onClick={handleDownloadPDF}
                    style={{ padding: '12px 24px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    <i className="ti ti-file-download me-2" />
                    Download PDF
                </button>
            </div>

            <div id="print-area">
                {voucherContent}
            </div>
        </div>
    );
};

export default SingleFeeVoucher;
