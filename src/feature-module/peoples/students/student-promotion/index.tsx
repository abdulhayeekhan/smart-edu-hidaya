import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ImageWithBasePath from "../../../../core/common/imageWithBasePath"
import { all_routes } from "../../../router/all_routes"
import CommonSelect2 from '../../../../core/common/commonSelect2'
import TooltipOption from '../../../../core/common/tooltipOption'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../../../store'
import {
  GetEligibleStudents,
  PreviewStudents,
  PromoteStudents,
  GetPromotionHistory,
  resetStudentPromotionState,
  EligibleStudent,
  PromotionHistoryItem,
  PromotePayload
} from '../../../../store/apps/student-promotion'
import { useCampusesList } from '../../../../core/common/selectoption/master/useCampusesList'
import { useAcademicSessions } from '../../../../core/common/selectoption/academic/useAcademicSessions'
import { useAcademicGrades } from '../../../../core/common/selectoption/academic/useAcademicGrades'
import { useSectionList } from '../../../../core/common/selectoption/academic/useSections'
import useRegionsList from '../../../../core/common/selectoption/master/useRegions'
import { Table, Pagination, Spin, DatePicker } from 'antd'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const baseURL = process.env.REACT_APP_API_BASE_URL

const StudentPromotion = () => {
  const routes = all_routes
  const dispatch = useDispatch<AppDispatch>()

  // Auth User Data
  const userInfoString = localStorage.getItem("userData")
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null
  const loginInfo = userInfo?.data
  const userId = loginInfo?.id || null

  // Regions & Campus state
  const [regionId, setRegionId] = useState<number>(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : 0)
  const [campusId, setCampusId] = useState<number | null>(
    loginInfo?.userLevel === 3 ? loginInfo?.userLevelId : null
  )

  // Master Data Options
  const regionsList = useRegionsList()
  const campuses = useCampusesList(loginInfo?.userLevel === 2 ? loginInfo?.userLevelId : regionId)
  const sessions = useAcademicSessions()
  const grades = useAcademicGrades()
  const sections = useSectionList(campusId)

  // Active Tab: 'promotion' | 'history'
  const [activeTab, setActiveTab] = useState<'promotion' | 'history'>('promotion')

  // Redux Store State
  const {
    eligibleStudents,
    eligibleTotalCount,
    eligibleLoading,
    previewResponse,
    previewLoading,
    promoteLoading,
    historyData,
    historyTotalCount,
    historyLoading
  } = useSelector((state: RootState) => state.studentPromotion)

  // ================= PROMOTION TAB FORM STATE =================
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [gradeId, setGradeId] = useState<number | null>(null)
  const [sectionId, setSectionId] = useState<number | null>(null)

  const [toSessionId, setToSessionId] = useState<number | null>(null)
  const [toGradeId, setToGradeId] = useState<number | null>(null)
  const [toSectionId, setToSectionId] = useState<number | null>(null)

  const [promotionType, setPromotionType] = useState<number>(1) // 1: Promote, 2: Demote
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString())
  const [remarks, setRemarks] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [pageNo, setPageNo] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<number[]>([])
  const [isPromotionView, setIsPromotionView] = useState<boolean>(false)

  // Check if all criteria on BOTH sides (From Class & To Class) are selected
  const isSelectionComplete = Boolean(
    (loginInfo?.userLevel > 2 || campusId) &&
    sessionId &&
    gradeId &&
    sectionId &&
    toSessionId &&
    toGradeId &&
    toSectionId
  )

  // ================= HISTORY TAB FILTER STATE =================
  const [hCampusId, setHCampusId] = useState<number | null>(campusId)
  const [hSessionId, setHSessionId] = useState<number | null>(null)
  const [hGradeId, setHGradeId] = useState<number | null>(null)
  const [hPromotionType, setHPromotionType] = useState<number | null>(null)
  const [hFromDate, setHFromDate] = useState<string | null>(null)
  const [hToDate, setHToDate] = useState<string | null>(null)
  const [hSearch, setHSearch] = useState<string>('')
  const [hPageNo, setHPageNo] = useState<number>(1)
  const [hPageSize, setHPageSize] = useState<number>(10)

  // Options for Promotion Type
  const promotionTypeOptions = [
    { value: 1, label: 'Promote' },
    { value: 2, label: 'Demote' }
  ]

  const historyPromotionTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 1, label: 'Promote' },
    { value: 2, label: 'Demote' }
  ]

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(resetStudentPromotionState())
    }
  }, [dispatch])

  // Fetch Eligible Students List
  const fetchEligibleStudentsList = useCallback((targetPage: number = 1) => {
    if (!isSelectionComplete) {
      return
    }
    const filter = {
      pageNo: targetPage,
      pageSize,
      campusId: campusId || loginInfo?.userLevelId || null,
      sessionId,
      gradeId,
      sectionId,
      search
    }
    dispatch(GetEligibleStudents(filter))
  }, [dispatch, isSelectionComplete, pageSize, campusId, loginInfo?.userLevelId, sessionId, gradeId, sectionId, search])

  // Fetch History List
  const fetchPromotionHistoryList = useCallback((targetPage: number = 1) => {
    const filter = {
      pageNo: targetPage,
      pageSize: hPageSize,
      campusId: hCampusId || loginInfo?.userLevelId || null,
      admissionId: null,
      sessionId: hSessionId,
      gradeId: hGradeId,
      promotionType: hPromotionType,
      fromDate: hFromDate,
      toDate: hToDate,
      search: hSearch
    }
    dispatch(GetPromotionHistory(filter))
  }, [dispatch, hPageSize, hCampusId, loginInfo?.userLevelId, hSessionId, hGradeId, hPromotionType, hFromDate, hToDate, hSearch])

  // Fetch eligible students on pagination / search change if promotion view is active
  useEffect(() => {
    if (isPromotionView && isSelectionComplete) {
      fetchEligibleStudentsList(pageNo)
    }
  }, [pageNo, pageSize, search, isPromotionView, isSelectionComplete, fetchEligibleStudentsList])

  // Fetch history on history tab active or history filters change
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPromotionHistoryList(hPageNo)
    }
  }, [activeTab, hPageNo, hPageSize, hCampusId, hSessionId, hGradeId, hPromotionType, hFromDate, hToDate, hSearch, fetchPromotionHistoryList])

  const handleManagePromotion = () => {
    if ((loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && !campusId) {
      toast.error('Please select Campus')
      return
    }
    if (!sessionId) {
      toast.error('Please select Current Session (From Class)')
      return
    }
    if (!gradeId) {
      toast.error('Please select From Grade')
      return
    }
    if (!sectionId) {
      toast.error('Please select From Section')
      return
    }
    if (!toSessionId) {
      toast.error('Please select Promote To Session (To Class)')
      return
    }
    if (!toGradeId) {
      toast.error('Please select Promote To Grade')
      return
    }
    if (!toSectionId) {
      toast.error('Please select Promote To Section')
      return
    }

    setIsPromotionView(true)
    setPageNo(1)
    setSelectedAdmissionIds([])
    fetchEligibleStudentsList(1)
  }

  const handleResetPromotion = () => {
    setIsPromotionView(false)
    setSelectedAdmissionIds([])
    setSessionId(null)
    setGradeId(null)
    setSectionId(null)
    setToSessionId(null)
    setToGradeId(null)
    setToSectionId(null)
    setRemarks('')
    dispatch(resetStudentPromotionState())
  }

  // Handle Preview Action
  const handlePreviewStudents = async () => {
    if (!isSelectionComplete) {
      toast.error('Please select Session, Grade, and Section for both From Class and To Class')
      return
    }
    if (selectedAdmissionIds.length === 0) {
      toast.error('Please select at least one student')
      return
    }

    const payload: PromotePayload = {
      admissionIds: selectedAdmissionIds,
      toGradeId: toGradeId!,
      toSessionId: toSessionId!,
      toSectionId: toSectionId!,
      remarks: remarks || '',
      userId: userId || 0,
      continueOnError: true
    }

    dispatch(PreviewStudents(payload))
  }

  // Handle Promote Action
  const handlePromoteStudents = async () => {
    if (!isSelectionComplete) {
      toast.error('Please select Session, Grade, and Section for both From Class and To Class')
      return
    }
    if (selectedAdmissionIds.length === 0) {
      toast.error('Please select at least one student to promote/demote')
      return
    }

    const payload: PromotePayload = {
      admissionIds: selectedAdmissionIds,
      toGradeId: toGradeId!,
      toSessionId: toSessionId!,
      toSectionId: toSectionId!,
      remarks: remarks || '',
      userId: userId || 0,
      continueOnError: true
    }

    const res = await dispatch(PromoteStudents(payload))
    if (PromoteStudents.fulfilled.match(res)) {
      setSelectedAdmissionIds([])
      fetchEligibleStudentsList(pageNo)
    }
  }

  // Table Row Selection for Eligible Students
  const rowSelection = {
    selectedRowKeys: selectedAdmissionIds,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedAdmissionIds(selectedKeys as number[])
    }
  }

  // Eligible Students Table Columns
  const eligibleColumns = [
    {
      title: 'Roll / Student No',
      dataIndex: 'studentNumber',
      key: 'studentNumber',
      render: (text: string, record: EligibleStudent) => (
        <span className="fw-semibold text-primary">{text || record.admissionId}</span>
      )
    },
    {
      title: 'Student Name',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (text: string, record: EligibleStudent) => (
        <div className="d-flex align-items-center">
          <ImageWithBasePath
            src={record.imageUrl ? `${baseURL}/${record.imageUrl}` : 'assets/img/students/student-01.jpg'}
            className="rounded-circle me-2"
            width={35}
            height={35}
            alt="img"
          />
          <div>
            <h6 className="mb-0 text-dark">{text}</h6>
            <small className="text-muted">Father: {record.fatherName}</small>
          </div>
        </div>
      )
    },
    {
      title: 'Current Grade',
      dataIndex: 'gradeName',
      key: 'gradeName'
    },
    {
      title: 'Current Section',
      dataIndex: 'sectionName',
      key: 'sectionName'
    },
    {
      title: 'Current Session',
      dataIndex: 'sessionName',
      key: 'sessionName'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <span className="badge badge-soft-success text-capitalize">{text || 'Admission'}</span>
      )
    }
  ]

  // Promotion History Table Columns
  const historyColumns = [
    {
      title: 'S.No',
      key: 'sno',
      render: (_: any, __: any, index: number) => (hPageNo - 1) * hPageSize + (index + 1)
    },
    {
      title: 'Student No',
      dataIndex: 'studentNumber',
      key: 'studentNumber',
      render: (text: string) => <span className="fw-semibold text-primary">{text}</span>
    },
    {
      title: 'Student Name',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (text: string, record: PromotionHistoryItem) => (
        <div>
          <div className="fw-medium text-dark">{text}</div>
          <small className="text-muted">Father: {record.fatherName}</small>
        </div>
      )
    },
    {
      title: 'Campus',
      dataIndex: 'campusName',
      key: 'campusName'
    },
    {
      title: 'Type',
      dataIndex: 'promotionTypeName',
      key: 'promotionTypeName',
      render: (text: string) => {
        const isDemote = text?.toLowerCase().includes('demote')
        return (
          <span className={`badge ${isDemote ? 'badge-soft-danger' : 'badge-soft-success'}`}>
            {text}
          </span>
        )
      }
    },
    {
      title: 'From (Session / Grade / Sec)',
      key: 'fromDetail',
      render: (_: any, record: PromotionHistoryItem) => (
        <span>
          {record.fromSessionName} | {record.fromGradeName} - {record.fromSectionName}
        </span>
      )
    },
    {
      title: 'To (Session / Grade / Sec)',
      key: 'toDetail',
      render: (_: any, record: PromotionHistoryItem) => (
        <span>
          {record.toSessionName} | {record.toGradeName} - {record.toSectionName}
        </span>
      )
    },
    {
      title: 'Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD') : '-')
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (text: string) => text || '-'
    }
  ]

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="col-md-12">

              {/* Page Header */}
              <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
                <div className="my-auto mb-2">
                  <h3 className="page-title mb-1">Student Promotion</h3>
                  <nav>
                    <ol className="breadcrumb mb-0">
                      <li className="breadcrumb-item">
                        <Link to={routes.adminDashboard}>Dashboard</Link>
                      </li>
                      <li className="breadcrumb-item">
                        <Link to="#">Students</Link>
                      </li>
                      <li className="breadcrumb-item active" aria-current="page">
                        Student Promotion
                      </li>
                    </ol>
                  </nav>
                </div>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
                  <TooltipOption />
                </div>
              </div>

              {/* Tabs Navigation */}
              <ul className="nav nav-tabs nav-tabs-bottom mb-4">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'promotion' ? 'active' : ''}`}
                    onClick={() => setActiveTab('promotion')}
                  >
                    <i className="ti ti-user-up me-1" />
                    Promotion & Demotion
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    <i className="ti ti-history me-1" />
                    Promotion History
                  </button>
                </li>
              </ul>

              {/* TAB 1: PROMOTION & DEMOTION */}
              {activeTab === 'promotion' && (
                <>
                  <div className="alert alert-outline-primary bg-primary-transparent p-2 d-flex align-items-center flex-wrap row-gap-2 mb-4">
                    <i className="ti ti-info-circle me-1 fs-18" />
                    <strong>Note :</strong> Promoting Student from the Present class to the Next Class will Create an enrollment of the student to the next Session.
                  </div>

                  {/* Filter / Promotion Setup Card */}
                  <div className="card mb-4">
                    <div className="card-header border-0 pb-0">
                      <div className="bg-light-gray p-3 rounded d-flex justify-content-between align-items-center flex-wrap">
                        <div>
                          <h4 className="mb-1">Promotion Criteria</h4>
                          <p className="mb-0">Select session, grade, and section for <strong>both</strong> From Class and To Class to enable data fetching.</p>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      {/* Region & Campus selection for admin */}
                      {(loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                        <div className="row mb-3">
                          {loginInfo?.userLevel === 1 && (
                            <div className="col-md-6 mb-2">
                              <label className="form-label">Region</label>
                              <CommonSelect2
                                className="select"
                                options={regionsList}
                                defaultValue={regionsList.find((r: any) => r.value === regionId)}
                                onChange={(opt: any) => {
                                  setRegionId(opt?.value || 0)
                                  setCampusId(null)
                                }}
                              />
                            </div>
                          )}
                          <div className="col-md-6 mb-2">
                            <label className="form-label">Campus <span className="text-danger">*</span></label>
                            <CommonSelect2
                              className="select"
                              options={campuses}
                              defaultValue={campuses.find((c: any) => c.value === campusId)}
                              onChange={(opt: any) => setCampusId(opt?.value || null)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="d-md-flex align-items-center justify-content-between gap-3">
                        {/* FROM CLASS SECTION */}
                        <div className="card flex-fill w-100 mb-md-0 mb-3 border">
                          <div className="card-header bg-light p-2 fw-bold text-dark">
                            <i className="ti ti-logout me-1" /> From Class (Current)
                          </div>
                          <div className="card-body">
                            <div className="mb-3">
                              <label className="form-label">
                                Current Session <span className="text-danger">*</span>
                              </label>
                              <CommonSelect2
                                className="select"
                                options={sessions}
                                defaultValue={sessions.find((s: any) => s.value === sessionId)}
                                onChange={(opt: any) => setSessionId(opt?.value || null)}
                              />
                            </div>
                            <div>
                              <div className="row">
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">From Grade <span className="text-danger">*</span></label>
                                  <CommonSelect2
                                    className="select"
                                    options={grades}
                                    defaultValue={grades.find((g: any) => g.value === gradeId)}
                                    onChange={(opt: any) => setGradeId(opt?.value || null)}
                                  />
                                </div>
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">From Section <span className="text-danger">*</span></label>
                                  <CommonSelect2
                                    className="select"
                                    options={sections}
                                    defaultValue={sections.find((sec: any) => sec.value === sectionId)}
                                    onChange={(opt: any) => setSectionId(opt?.value || null)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* EXCHANGE ICON */}
                        <div className="badge bg-primary badge-xl exchange-link text-white d-flex align-items-center justify-content-center mx-md-2 mx-auto my-md-0 my-3 flex-shrink-0 rounded-circle" style={{ width: '45px', height: '45px' }}>
                          <i className="ti ti-arrows-exchange fs-20" />
                        </div>

                        {/* TO CLASS SECTION */}
                        <div className="card flex-fill w-100 mb-md-0 mb-3 border">
                          <div className="card-header bg-light p-2 fw-bold text-dark">
                            <i className="ti ti-login me-1" /> Promote To Class (Next)
                          </div>
                          <div className="card-body">
                            <div className="mb-3">
                              <label className="form-label">
                                Promote To Session <span className="text-danger">*</span>
                              </label>
                              <CommonSelect2
                                className="select"
                                options={sessions}
                                defaultValue={sessions.find((s: any) => s.value === toSessionId)}
                                onChange={(opt: any) => setToSessionId(opt?.value || null)}
                              />
                            </div>
                            <div>
                              <div className="row">
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">To Grade <span className="text-danger">*</span></label>
                                  <CommonSelect2
                                    className="select"
                                    options={grades}
                                    defaultValue={grades.find((g: any) => g.value === toGradeId)}
                                    onChange={(opt: any) => setToGradeId(opt?.value || null)}
                                  />
                                </div>
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">To Section <span className="text-danger">*</span></label>
                                  <CommonSelect2
                                    className="select"
                                    options={sections}
                                    defaultValue={sections.find((sec: any) => sec.value === toSectionId)}
                                    onChange={(opt: any) => setToSectionId(opt?.value || null)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Settings */}
                      <div className="row mt-3">
                        <div className="col-md-4 mb-3">
                          <label className="form-label">Action / Promotion Type <span className="text-danger">*</span></label>
                          <CommonSelect2
                            className="select"
                            options={promotionTypeOptions}
                            defaultValue={promotionTypeOptions.find((p) => p.value === promotionType)}
                            onChange={(opt: any) => setPromotionType(opt?.value || 1)}
                          />
                        </div>
                        <div className="col-md-4 mb-3">
                          <label className="form-label">Effective Date</label>
                          <DatePicker
                            className="form-control"
                            value={effectiveDate ? dayjs(effectiveDate) : null}
                            onChange={(date) => setEffectiveDate(date ? date.toISOString() : new Date().toISOString())}
                            format="YYYY-MM-DD"
                          />
                        </div>
                        <div className="col-md-4 mb-3">
                          <label className="form-label">Remarks</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Optional remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="col-md-12 mt-2">
                        {!isSelectionComplete && (
                          <div className="text-danger text-center small mb-2">
                            * Please select Session, Grade, and Section for <strong>both</strong> From Class and To Class to enable fetching students.
                          </div>
                        )}
                        <div className="manage-promote-btn d-flex justify-content-center flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-light reset-promote"
                            onClick={handleResetPromotion}
                          >
                            Reset Criteria
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary promote-students-btn d-flex align-items-center"
                            onClick={handleManagePromotion}
                            disabled={!isSelectionComplete}
                          >
                            <i className="ti ti-users me-1" />
                            Fetch Eligible Students
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ELIGIBLE STUDENTS TABLE */}
                  {isPromotionView && (
                    <div className="card">
                      <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
                        <h4 className="mb-3">Eligible Students List ({eligibleTotalCount})</h4>
                        <div className="d-flex align-items-center flex-wrap mb-3">
                          <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Search Student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '220px' }}
                          />
                        </div>
                      </div>

                      <div className="card-body p-0 py-3">
                        <Spin spinning={eligibleLoading}>
                          <Table
                            rowSelection={rowSelection}
                            columns={eligibleColumns}
                            dataSource={eligibleStudents.map((item) => ({ ...item, key: item.admissionId }))}
                            pagination={false}
                            rowKey="admissionId"
                          />
                        </Spin>

                        {/* Pagination & Summary */}
                        <div className="d-flex align-items-center justify-content-between px-3 mt-3 flex-wrap row-gap-2">
                          <div className="text-muted">
                            Selected: <strong>{selectedAdmissionIds.length}</strong> of <strong>{eligibleTotalCount}</strong> student(s)
                          </div>
                          <Pagination
                            current={pageNo}
                            pageSize={pageSize}
                            total={eligibleTotalCount}
                            onChange={(p, ps) => {
                              setPageNo(p)
                              setPageSize(ps)
                            }}
                            showSizeChanger
                          />
                        </div>
                      </div>

                      {/* Action Buttons: Preview & Promote */}
                      <div className="promoted-year text-center p-4 border-top">
                        <p className="text-muted mb-2">
                          Selected {selectedAdmissionIds.length} student(s) will be {promotionType === 1 ? 'promoted' : 'demoted'} to the target class and session.
                        </p>
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-lg"
                            data-bs-toggle="modal"
                            data-bs-target="#student_promote"
                            onClick={handlePreviewStudents}
                            disabled={selectedAdmissionIds.length === 0 || previewLoading}
                          >
                            {previewLoading ? 'Loading Preview...' : 'Preview Promotion'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-lg"
                            data-bs-toggle="modal"
                            data-bs-target="#student_promote"
                            onClick={handlePreviewStudents}
                            disabled={selectedAdmissionIds.length === 0 || promoteLoading}
                          >
                            {promoteLoading ? 'Processing...' : `Confirm & ${promotionType === 1 ? 'Promote' : 'Demote'} Students`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: PROMOTION HISTORY */}
              {activeTab === 'history' && (
                <div className="card">
                  <div className="card-header border-0 pb-0">
                    <h4 className="mb-3">Promotion & Demotion History</h4>
                    <div className="row g-2 mb-3">
                      {(loginInfo?.userLevel === 1 || loginInfo?.userLevel === 2) && (
                        <div className="col-md-2">
                          <label className="form-label small">Campus</label>
                          <CommonSelect2
                            className="select"
                            options={campuses}
                            defaultValue={campuses.find((c: any) => c.value === hCampusId)}
                            onChange={(opt: any) => setHCampusId(opt?.value || null)}
                          />
                        </div>
                      )}
                      <div className="col-md-2">
                        <label className="form-label small">Session</label>
                        <CommonSelect2
                          className="select"
                          options={sessions}
                          defaultValue={sessions.find((s: any) => s.value === hSessionId)}
                          onChange={(opt: any) => setHSessionId(opt?.value || null)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Grade</label>
                        <CommonSelect2
                          className="select"
                          options={grades}
                          defaultValue={grades.find((g: any) => g.value === hGradeId)}
                          onChange={(opt: any) => setHGradeId(opt?.value || null)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Type</label>
                        <CommonSelect2
                          className="select"
                          options={historyPromotionTypeOptions}
                          defaultValue={historyPromotionTypeOptions.find((p: any) => p.value === hPromotionType)}
                          onChange={(opt: any) => setHPromotionType(opt?.value !== '' ? opt?.value : null)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">From Date</label>
                        <DatePicker
                          className="form-control"
                          value={hFromDate ? dayjs(hFromDate) : null}
                          onChange={(date) => setHFromDate(date ? date.toISOString() : null)}
                          format="YYYY-MM-DD"
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">To Date</label>
                        <DatePicker
                          className="form-control"
                          value={hToDate ? dayjs(hToDate) : null}
                          onChange={(date) => setHToDate(date ? date.toISOString() : null)}
                          format="YYYY-MM-DD"
                        />
                      </div>
                      <div className="col-md-3 mt-2">
                        <label className="form-label small">Search</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search student/father..."
                          value={hSearch}
                          onChange={(e) => setHSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="card-body p-0 py-3">
                    <Spin spinning={historyLoading}>
                      <Table
                        columns={historyColumns}
                        dataSource={historyData.map((item) => ({ ...item, key: item.id }))}
                        pagination={false}
                        rowKey="id"
                      />
                    </Spin>

                    <div className="d-flex align-items-center justify-content-between px-3 mt-3 flex-wrap row-gap-2">
                      <div className="text-muted">
                        Total History Records: <strong>{historyTotalCount}</strong>
                      </div>
                      <Pagination
                        current={hPageNo}
                        pageSize={hPageSize}
                        total={historyTotalCount}
                        onChange={(p, ps) => {
                          setHPageNo(p)
                          setHPageSize(ps)
                        }}
                        showSizeChanger
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM PROMOTION / PREVIEW MODAL */}
      <div className="modal fade" id="student_promote" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm {promotionType === 1 ? 'Promotion' : 'Demotion'}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body text-center p-4">
              <div className="mb-3">
                <i className="ti ti-alert-circle text-warning display-4" />
              </div>
              <p className="text-muted mb-3">
                Are you sure you want to {promotionType === 1 ? 'promote' : 'demote'} all <strong>{selectedAdmissionIds.length}</strong> selected student(s) to the chosen target session and grade?
              </p>

              {/* Preview Details If Available */}
              {previewLoading && <Spin className="my-3" tip="Loading preview..." />}
              {previewResponse && (
                <div className="alert alert-info text-start small mb-3">
                  <h6>Promotion Preview Summary:</h6>
                  <div>Total Requested: {previewResponse.totalRequested}</div>
                  <div>Success Count: {previewResponse.successCount}</div>
                  {previewResponse.failureCount > 0 && <div className="text-danger">Failure Count: {previewResponse.failureCount}</div>}
                  {previewResponse.message && <div className="fw-semibold mt-1">{previewResponse.message}</div>}
                </div>
              )}

              <div className="d-flex justify-content-center gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-light px-4"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  data-bs-dismiss="modal"
                  onClick={handlePromoteStudents}
                  disabled={promoteLoading}
                >
                  {promoteLoading ? 'Processing...' : `Confirm & ${promotionType === 1 ? 'Promote' : 'Demote'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default StudentPromotion