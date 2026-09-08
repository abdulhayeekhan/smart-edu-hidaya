import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../../store";
import { all_routes } from "../../router/all_routes";
import { GetFeeInvoices, FeeInvoiceFilter, ProcessBulkReceipt } from "../../../store/apps/fee-invoice";
import { useAcademicGrades } from "../../../core/common/selectoption/academic/useAcademicGrades";
import { useCampusesList } from "../../../core/common/selectoption/master/useCampusesList";
import CommonSelect3 from "../../../core/common/commonSelect3";
import { Table, Spin } from "antd";
import dayjs from "dayjs";
import { GetCampusBanksByCampus } from "../../../store/apps/campus-bank";
import { useCampusFeeRecAccount } from '../../../core/common/selectoption/financial/useCampusFeeRecAccount';
import toast from "react-hot-toast";

const BulkFeeReceipt = () => {
    const routes = all_routes;
    const dispatch = useDispatch<AppDispatch>();

    // User Session
    const userInfoString = localStorage.getItem("userData");
    const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
    const loginInfo = userInfo?.data;

    // Redux State
    const { data: datalist, loading, isActionLoading } = useSelector((state: RootState) => state.feeInvoice);
    const { data: bankDetails } = useSelector((state: RootState) => state.campusBank);

    // Form / Filter State
    const [campusId, setCampusId] = useState<number>(loginInfo?.userLevel === 3 ? loginInfo?.userLevelId : 0);
    const [gradeId, setGradeId] = useState<number | null>(null);
    const [bankId, setBankId] = useState<number | null>(null);
    
    // Selection State
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // Dropdown Data
    const campuses = useCampusesList(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : null);
    const grades = useAcademicGrades();

    // Banks and Cash Accounts
    useEffect(() => {
        if (campusId) {
            dispatch(GetCampusBanksByCampus(campusId));
        }
    }, [campusId, dispatch]);

    const bankOptions = bankDetails?.map((bank: any) => ({
        value: bank.accountId,
        label: `${bank.tblAccountBank?.name} (${bank.iban})`
    }));
    const feeRecAccountOptions = useCampusFeeRecAccount();
    const combinedOptions = [
        ...feeRecAccountOptions,
        ...(bankOptions || [])
    ];

    // Fetch Invoices on Filter Change
    useEffect(() => {
        if (campusId) {
            const filter: any = {
                pageNo: 1,
                pageSize: 1000, // Fetch all for bulk selection
                campusId: campusId,
                status: "pending", // Only pending or partial
            };
            if (gradeId) filter.gradeId = gradeId;
            dispatch(GetFeeInvoices(filter as FeeInvoiceFilter));
            // Reset selection when filters change
            setSelectedRowKeys([]);
        }
    }, [campusId, gradeId, dispatch]);

    // Handle Selection
    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    // Columns
    const columns = [
        {
            title: "Student Reg #",
            dataIndex: "studentNumber",
        },
        {
            title: "Name",
            dataIndex: "firstName",
            render: (text: string, record: any) => `${record.firstName} ${record.lastName}`
        },
        {
            title: "Grade",
            dataIndex: "grade",
        },
        {
            title: "Invoice Number",
            dataIndex: "invoiceNumber",
        },
        {
            title: "Month",
            render: (record: any) => {
                const start = dayjs(record.monthFrom).format("MMM YYYY");
                const end = dayjs(record.monthTo).format("MMM YYYY");
                return start === end ? start : `${start} to ${end}`;
            }
        },
        {
            title: "Due Date",
            dataIndex: "dueDate",
            render: (text: string) => dayjs(text).format("DD-MMM-YYYY"),
        },
        {
            title: "Total Amount",
            dataIndex: "netAmount",
        },
        {
            title: "Balance",
            render: (record: any) => (record.netAmount - record.amountReceived),
        }
    ];

    // Handle Submit
    const handleSubmit = async () => {
        if (!campusId) return toast.error("Please select a Campus.");
        if (!bankId) return toast.error("Please select a Bank / Cash Account.");
        if (selectedRowKeys.length === 0) return toast.error("Please select at least one invoice.");

        const payload = {
            campusId: campusId,
            gradeId: gradeId || 0,
            bankID: bankId,
            invoiceIds: selectedRowKeys as number[],
        };

        const resultAction = await dispatch(ProcessBulkReceipt(payload));
        if (ProcessBulkReceipt.fulfilled.match(resultAction)) {
            // Refresh list
            const filter: any = {
                pageNo: 1,
                pageSize: 1000,
                campusId: campusId,
                status: "pending",
            };
            if (gradeId) filter.gradeId = gradeId;
            dispatch(GetFeeInvoices(filter as FeeInvoiceFilter));
            setSelectedRowKeys([]);
        }
    };

    return (
        <div className="page-wrapper">
            <div className="content">
                <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
                    <div className="my-auto mb-2">
                        <h3 className="page-title mb-1">Bulk Fee Receipt</h3>
                        <nav>
                            <ol className="breadcrumb mb-0">
                                <li className="breadcrumb-item">
                                    <Link to={routes.adminDashboard}>Dashboard</Link>
                                </li>
                                <li className="breadcrumb-item active" aria-current="page">
                                    Bulk Fee Receipt
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row">
                            {(loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                                <div className="col-md-3">
                                    <div className="mb-3">
                                        <label className="form-label">Campus</label>
                                        <CommonSelect3
                                            className="select"
                                            options={campuses}
                                            onChange={(selected) => setCampusId(selected?.value ? Number(selected.value) : 0)}
                                            value={campusId ? campuses.find(c => c.value === campusId) : campuses[0]}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="col-md-3">
                                <div className="mb-3">
                                    <label className="form-label">Grade</label>
                                    <CommonSelect3
                                        className="select"
                                        options={grades}
                                        onChange={(selected) => setGradeId(selected?.value ? Number(selected.value) : null)}
                                        value={gradeId ? grades.find(r => r.value === gradeId) : grades[0]}
                                    />
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="mb-3">
                                    <label className="form-label">Bank / Cash Account</label>
                                    <CommonSelect3
                                        className="select"
                                        options={combinedOptions}
                                        onChange={(selected) => setBankId(selected?.value ? Number(selected.value) : null)}
                                        value={bankId ? combinedOptions.find(b => b.value === bankId) : undefined}
                                    />
                                </div>
                            </div>
                            <div className="col-md-2 d-flex align-items-end mb-3">
                                <button
                                    type="button"
                                    className="btn btn-primary w-100"
                                    onClick={handleSubmit}
                                    disabled={selectedRowKeys.length === 0 || isActionLoading || loading}
                                >
                                    {isActionLoading ? <Spin size="small" /> : 'Process Receipts'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header border-bottom">
                        <h4 className="card-title">Pending Invoices</h4>
                    </div>
                    <div className="card-body p-0">
                        <Table
                            rowKey="id"
                            rowSelection={rowSelection}
                            columns={columns}
                            dataSource={datalist}
                            loading={loading}
                            pagination={false}
                            className="table datanew dataTable no-footer"
                            scroll={{ y: 500 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkFeeReceipt;
