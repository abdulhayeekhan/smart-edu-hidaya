import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { all_routes } from '../../../../feature-module/router/all_routes'
import CommonSelect2 from '../../../../core/common/commonSelect2'
import { Table, Pagination, Spin } from 'antd'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../../../store'
import {
  FetchMigrationList,
  RequestStudentMigration,
  ApproveStudentMigration,
  RejectStudentMigration,
  CancelStudentMigration,
  resetMigrationState,
  MigrationFilter
} from '../../../../store/apps/student-migration'

import { useCampusesList } from '../../../../core/common/selectoption/master/useCampusesList'
import { useAcademicGrades } from '../../../../core/common/selectoption/academic/useAcademicGrades'
import { useSectionList } from '../../../../core/common/selectoption/academic/useSections'
import { useAdmissions } from '../../../../core/common/selectoption/academic/useAdmissions'

import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const StudentMigration = () => {
  const routes = all_routes
  const dispatch = useDispatch<AppDispatch>()

  // Auth User Data
  const userInfoString = localStorage.getItem("userData")
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null
  const loginInfo = userInfo?.data
  const userId = loginInfo?.id || 0
  const userCampusId = loginInfo?.userLevel === 3 ? loginInfo?.userLevelId : null
  const roleId = loginInfo?.roleId || 0

  // Store
  const {
    migrationList,
    totalCount,
    loading,
    actionLoading
  } = useSelector((state: RootState) => state.studentMigration)

  // Options
  const campuses = useCampusesList(0)
  const grades = useAcademicGrades()

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [filterFromCampusId, setFilterFromCampusId] = useState<number | null>(null)
  const [filterToCampusId, setFilterToCampusId] = useState<number | null>(null)

  // NEW MIGRATION STATE
  const [reqFromCampusId, setReqFromCampusId] = useState<number | null>(userCampusId)
  const { studentOptions } = useAdmissions({ externalCampusId: reqFromCampusId })
  const datalist = useSelector((state: RootState) => state.admissions.data || [])
  
  const [reqAdmissionId, setReqAdmissionId] = useState<number | null>(null)
  const [reqToCampusId, setReqToCampusId] = useState<number | null>(null)
  const [reqToGradeId, setReqToGradeId] = useState<number | null>(null)
  const [reqToSectionId, setReqToSectionId] = useState<number | null>(null)
  const [reqReason, setReqReason] = useState('')
  
  const reqSections = useSectionList(reqToCampusId)

  // ACTION MODAL STATE (Approve/Reject/Cancel)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [selectedMigration, setSelectedMigration] = useState<any>(null)
  const [actionRemarks, setActionRemarks] = useState('')
  const [actionToGradeId, setActionToGradeId] = useState<number | null>(null)
  const [actionToSectionId, setActionToSectionId] = useState<number | null>(null)
  const actionSections = useSectionList(selectedMigration?.toCampusId || null)

  const fetchList = useCallback(() => {
    const filter: MigrationFilter = {
      fromCampusId: filterFromCampusId,
      toCampusId: filterToCampusId,
      status: activeTab === 'pending' ? 'pending' : '',
      admissionId: null,
      search,
      pageNo,
      pageSize
    }
    
    // Default filter for non-superadmin: they should see requests related to their campus
    // But since the API requires fromCampusId or toCampusId, we can just pass null to see all if allowed
    // For simplicity, we just pass what the user has. 
    // Usually the API handles user-level filtering based on token, but we can pass it if needed.
    
    dispatch(FetchMigrationList(filter))
  }, [dispatch, activeTab, search, pageNo, pageSize, filterFromCampusId, filterToCampusId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    return () => {
      dispatch(resetMigrationState())
    }
  }, [dispatch])

  const handleRequestSubmit = async () => {
    if (!reqAdmissionId || !reqToCampusId || !reqToGradeId || !reqToSectionId || !reqReason) {
      toast.error('Please fill all required fields')
      return
    }

    const payload = {
      admissionId: reqAdmissionId,
      toCampusId: reqToCampusId,
      toGradeId: reqToGradeId,
      toSectionId: reqToSectionId,
      reason: reqReason,
      userId
    }

    const res = await dispatch(RequestStudentMigration(payload))
    if (RequestStudentMigration.fulfilled.match(res)) {
      document.getElementById('close_new_migration')?.click()
      setReqAdmissionId(null)
      setReqFromCampusId(userCampusId)
      setReqToCampusId(null)
      setReqToGradeId(null)
      setReqToSectionId(null)
      setReqReason('')
      fetchList()
    }
  }

  const handleActionSubmit = async () => {
    if (!selectedMigration || !actionType) return

    const payload = {
      id: selectedMigration.id,
      userId,
      remarks: actionRemarks,
      toGradeId: actionType === 'approve' ? (actionToGradeId || selectedMigration.toGradeId) : 0,
      toSectionId: actionType === 'approve' ? (actionToSectionId || selectedMigration.toSectionId) : 0
    }

    let res
    if (actionType === 'approve') {
      if (!payload.toGradeId || !payload.toSectionId) {
        toast.error('Grade and Section are required for approval')
        return
      }
      res = await dispatch(ApproveStudentMigration(payload))
    } else if (actionType === 'reject') {
      res = await dispatch(RejectStudentMigration(payload))
    } else if (actionType === 'cancel') {
      res = await dispatch(CancelStudentMigration(payload))
    }

    if (res && res.meta.requestStatus === 'fulfilled') {
      document.getElementById('close_action_modal')?.click()
      fetchList()
    }
  }

  const openActionModal = (record: any, type: 'approve' | 'reject' | 'cancel') => {
    setSelectedMigration(record)
    setActionType(type)
    setActionRemarks('')
    if (type === 'approve') {
      setActionToGradeId(record.toGradeId)
      setActionToSectionId(record.toSectionId)
    } else {
      setActionToGradeId(null)
      setActionToSectionId(null)
    }
  }

  const columns = [
    { title: 'Student', render: (_: any, record: any) => (
      <div>
        <div className="fw-bold">{record.studentName}</div>
        <div className="small text-muted">{record.oldStudentNumber}</div>
      </div>
    )},
    { title: 'From Campus', dataIndex: 'fromCampusName' },
    { title: 'To Campus', dataIndex: 'toCampusName' },
    { title: 'Requested Target', render: (_: any, record: any) => (
      <div>
        {record.toGradeName} - {record.toSectionName}
      </div>
    )},
    { title: 'Reason', dataIndex: 'reason' },
    { title: 'Date', render: (_: any, record: any) => dayjs(record.requestedAt).format('YYYY-MM-DD HH:mm') },
    { title: 'Status', render: (_: any, record: any) => {
      let badgeClass = 'badge-soft-warning'
      if (record.status === 'approved') badgeClass = 'badge-soft-success'
      else if (record.status === 'rejected' || record.status === 'cancelled') badgeClass = 'badge-soft-danger'
      
      return <span className={`badge ${badgeClass} text-uppercase`}>{record.status}</span>
    }},
    { title: 'Action', render: (_: any, record: any) => {
      if (record.status !== 'pending') return null

      // Permissions Logic
      // cancel right for only sender campus (fromCampusId)
      // reject and approval right for campusto (toCampusId)
      // Assuming super admin (roleId=1 or userLevel=1) can do everything
      
      const canCancel = roleId === 1 || userCampusId === record.fromCampusId
      const canProcess = roleId === 1 || userCampusId === record.toCampusId

      return (
        <div className="d-flex gap-2">
          {canProcess && (
            <>
              <button className="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#action_modal" onClick={() => openActionModal(record, 'approve')}>
                <i className="ti ti-check" />
              </button>
              <button className="btn btn-sm btn-danger" data-bs-toggle="modal" data-bs-target="#action_modal" onClick={() => openActionModal(record, 'reject')}>
                <i className="ti ti-x" />
              </button>
            </>
          )}
          {canCancel && (
            <button className="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#action_modal" onClick={() => openActionModal(record, 'cancel')} title="Cancel Request">
              <i className="ti ti-ban" />
            </button>
          )}
        </div>
      )
    }}
  ]

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row">
          <div className="col-md-12">
            <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
              <div className="my-auto mb-2">
                <h3 className="page-title mb-1">Student Migration</h3>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item"><Link to={routes.adminDashboard}>Dashboard</Link></li>
                    <li className="breadcrumb-item"><Link to="#">Students</Link></li>
                    <li className="breadcrumb-item active">Student Migration</li>
                  </ol>
                </nav>
              </div>
            </div>

            <ul className="nav nav-tabs nav-tabs-bottom mb-4">
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => { setActiveTab('pending'); setPageNo(1); }}>
                  <i className="ti ti-clock me-1" /> Pending Requests
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { setActiveTab('history'); setPageNo(1); setFilterFromCampusId(null); setFilterToCampusId(null); }}>
                  <i className="ti ti-history me-1" /> Migration History
                </button>
              </li>
            </ul>

            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
                <h4 className="mb-0">{activeTab === 'pending' ? 'Pending Migrations' : 'Migration History'}</h4>
                <div className="d-flex gap-2 align-items-center mt-2 mt-md-0">
                  {activeTab === 'history' && (loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                    <>
                      <div style={{ width: 180 }}>
                        <CommonSelect2 
                          options={campuses}
                          value={campuses.find((c: any) => c.value == filterFromCampusId) || null}
                          onChange={(opt: any) => setFilterFromCampusId(opt?.value || null)}
                          placeholder="Filter From Campus"
                        />
                      </div>
                      <div style={{ width: 180 }}>
                        <CommonSelect2 
                          options={campuses}
                          value={campuses.find((c: any) => c.value == filterToCampusId) || null}
                          onChange={(opt: any) => setFilterToCampusId(opt?.value || null)}
                          placeholder="Filter To Campus"
                        />
                      </div>
                    </>
                  )}
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                  />
                  <button className="btn btn-primary text-nowrap" data-bs-toggle="modal" data-bs-target="#new_migration">
                    <i className="ti ti-plus me-1" /> Request Migration
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                <Spin spinning={loading}>
                  <Table 
                    columns={columns} 
                    dataSource={migrationList} 
                    pagination={false}
                    rowKey="id"
                  />
                  <div className="d-flex justify-content-end p-3">
                    <Pagination 
                      current={pageNo} 
                      pageSize={pageSize} 
                      total={totalCount} 
                      onChange={(p, ps) => { setPageNo(p); setPageSize(ps); }}
                    />
                  </div>
                </Spin>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* New Migration Modal */}
      <div className="modal fade" id="new_migration" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Request Student Migration</h5>
              <button type="button" className="btn-close" id="close_new_migration" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">From Campus <span className="text-danger">*</span></label>
                <CommonSelect2 
                  options={campuses}
                  value={campuses.find((c: any) => c.value == reqFromCampusId) || null}
                  onChange={(opt: any) => setReqFromCampusId(opt?.value || null)}
                  isDisabled={userCampusId !== null}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Student (Admission ID) <span className="text-danger">*</span></label>
                <CommonSelect2 
                  options={studentOptions}
                  onChange={(opt: any) => {
                    const val = opt?.value || null;
                    setReqAdmissionId(val);
                    if (val && opt.raw) {
                      const student = opt.raw;
                      console.log("Selected Student for Migration:", student);
                      if (student.gradeId) {
                        setReqToGradeId(student.gradeId);
                      }
                    }
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">To Campus <span className="text-danger">*</span></label>
                <CommonSelect2 
                  options={campuses}
                  onChange={(opt: any) => setReqToCampusId(opt?.value || null)}
                />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">To Grade <span className="text-danger">*</span></label>
                  <CommonSelect2 
                    options={grades}
                    value={grades.find((g: any) => g.value == reqToGradeId) || null}
                    onChange={(opt: any) => setReqToGradeId(opt?.value || null)}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">To Section <span className="text-danger">*</span></label>
                  <CommonSelect2 
                    key={`section-${reqToCampusId}`}
                    options={reqSections}
                    onChange={(opt: any) => setReqToSectionId(opt?.value || null)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Reason <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={3} value={reqReason} onChange={(e) => setReqReason(e.target.value)}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary" onClick={handleRequestSubmit} disabled={actionLoading}>
                {actionLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <div className="modal fade" id="action_modal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-capitalize">{actionType} Migration Request</h5>
              <button type="button" className="btn-close" id="close_action_modal" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {selectedMigration && (
                <div className="mb-3 p-2 bg-light rounded">
                  <strong>Student:</strong> {selectedMigration.studentName} ({selectedMigration.oldStudentNumber})<br/>
                  <strong>From:</strong> {selectedMigration.fromCampusName}<br/>
                  <strong>To:</strong> {selectedMigration.toCampusName}
                </div>
              )}
              
              {actionType === 'approve' && (
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Confirm Grade</label>
                    <CommonSelect2 
                      options={grades}
                      defaultValue={grades.find((g: any) => g.value === actionToGradeId)}
                      onChange={(opt: any) => setActionToGradeId(opt?.value || null)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Confirm Section</label>
                    <CommonSelect2 
                      options={actionSections}
                      defaultValue={actionSections.find((s: any) => s.value === actionToSectionId)}
                      onChange={(opt: any) => setActionToSectionId(opt?.value || null)}
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Remarks</label>
                <textarea className="form-control" rows={3} value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} placeholder="Enter remarks..."></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className={`btn btn-${actionType === 'approve' ? 'success' : actionType === 'cancel' ? 'warning' : 'danger'}`} onClick={handleActionSubmit} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentMigration
