import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import toast from 'react-hot-toast'

const baseURL = process.env.REACT_APP_API_BASE_URL

// ================= TYPES ==================

export interface GetEligibleStudentsFilter {
  pageNo: number
  pageSize: number
  campusId?: number | null
  sessionId?: number | null
  gradeId?: number | null
  sectionId?: number | null
  search?: string
}

export interface EligibleStudent {
  admissionId: number
  admissionNumber: number
  studentNumber: string
  studentName: string
  fatherName: string
  campusId: number
  gradeId: number
  gradeName: string
  gradeSortOrder: number
  sectionId: number
  sectionName: string
  sessionId: number
  sessionName: string
  status: string
  imageUrl: string
}

export interface PromotePayload {
  admissionIds: number[]
  toGradeId: number
  toSessionId: number
  toSectionId: number
  remarks?: string
  userId?: number
  continueOnError?: boolean
}

export interface PromoteResultItem {
  admissionId: number
  studentNumber: string
  studentName: string
  isSuccess: boolean
  message: string
  fromGradeId: number
  fromGradeName: string
  fromSectionId: number
  fromSectionName: string
  fromSessionId: number
  fromSessionName: string
}

export interface PromoteData {
  totalRequested: number
  successCount: number
  failureCount: number
  isApplied: boolean
  message: string
  results: PromoteResultItem[]
}

export interface GetPromotionHistoryFilter {
  pageNo: number
  pageSize: number
  campusId?: number | null
  admissionId?: number | null
  sessionId?: number | null
  gradeId?: number | null
  promotionType?: number | null
  fromDate?: string | null
  toDate?: string | null
  search?: string
}

export interface PromotionHistoryItem {
  id: number
  admissionId: number
  studentNumber: string
  studentName: string
  fatherName: string
  campusId: number
  campusName: string
  promotionType: number
  promotionTypeName: string
  fromSessionId: number
  fromSessionName: string
  toSessionId: number
  toSessionName: string
  fromGradeId: number
  fromGradeName: string
  toGradeId: number
  toGradeName: string
  fromSectionId: number
  fromSectionName: string
  toSectionId: number
  toSectionName: string
  effectiveDate: string
  remarks: string
  createdAt: string
  createdBy: number
}

export interface StudentPromotionState {
  eligibleStudents: EligibleStudent[]
  eligibleTotalCount: number
  eligibleTotalPages: number
  eligibleCurrentPage: number
  eligibleLoading: boolean

  previewResponse: PromoteData | null
  previewLoading: boolean

  promoteResponse: PromoteData | null
  promoteLoading: boolean

  historyData: PromotionHistoryItem[]
  historyTotalCount: number
  historyTotalPages: number
  historyCurrentPage: number
  historyLoading: boolean

  message: string
  status: boolean
}

// ================= ASYNC THUNKS ==================

// Get Eligible Students (Try Promotion endpoint first, fallback to Admission/GetAll)
export const GetEligibleStudents = createAsyncThunk<any, GetEligibleStudentsFilter>(
  'studentPromotion/getEligibleStudents',
  async (filter, { rejectWithValue }) => {
    try {
      // 1. Try StudentPromotion/GetEligibleStudents endpoint
      try {
        const { data } = await axios.post(`${baseURL}/api/StudentPromotion/GetEligibleStudents`, filter)
        if (data.status && data.data && data.data.length > 0) {
          return data
        }
      } catch (err) {
        // Fallback to Admission/GetAll
      }

      // 2. Fetch from Admissions API (/api/Admission/GetAll) matching grade, session, section, campus
      const admissionFilter = {
        pageNo: filter.pageNo,
        pageSize: filter.pageSize,
        search: filter.search || '',
        gradeId: filter.gradeId || null,
        sectionId: filter.sectionId || null,
        sessionId: filter.sessionId || null,
        campusId: filter.campusId || null,
        isEnabled: true
      }

      const { data: admData } = await axios.post(`${baseURL}/api/Admission/GetAll`, admissionFilter)
      if (admData.status) {
        const rawList = admData.data || []
        const mappedList: EligibleStudent[] = rawList.map((item: any) => ({
          admissionId: item.id || item.admissionId,
          admissionNumber: item.admissionNumber || 0,
          studentNumber: item.studentNumber || item.admissionNumber?.toString() || item.id?.toString() || '',
          studentName: item.studentName || `${item.firstName || ''} ${item.middleName || ''} ${item.lastName || ''}`.trim(),
          fatherName: item.fatherName || '',
          campusId: item.campusId || 0,
          gradeId: item.gradeId || 0,
          gradeName: item.gradeName || item.grade || '',
          gradeSortOrder: item.gradeSortOrder || 0,
          sectionId: item.sectionId || 0,
          sectionName: item.sectionName || item.section || '',
          sessionId: item.sessionId || 0,
          sessionName: item.sessionName || item.session || '',
          status: item.status || (item.isEnabled ? 'Admission' : 'Inactive'),
          imageUrl: item.imageUrl || ''
        }))

        return {
          status: true,
          data: mappedList,
          totalCount: admData.totalCount || mappedList.length,
          totalPages: admData.totalPages || 1,
          currentPage: admData.currentPage || filter.pageNo
        }
      }

      toast.error(admData.message || 'Failed to fetch eligible students')
      return rejectWithValue(admData.message)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to fetch eligible students'
      toast.error(errorMsg)
      return rejectWithValue(errorMsg)
    }
  }
)

// Preview Students Promotion
export const PreviewStudents = createAsyncThunk<any, PromotePayload>(
  'studentPromotion/preview',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/api/StudentPromotion/Preview`, payload)
      if (data.status) {
        return data
      }
      toast.error(data.message || 'Failed to preview promotion')
      return rejectWithValue(data.message)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to preview promotion'
      toast.error(errorMsg)
      return rejectWithValue(errorMsg)
    }
  }
)

// Promote Students
export const PromoteStudents = createAsyncThunk<any, PromotePayload>(
  'studentPromotion/promote',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/api/StudentPromotion/Promote`, payload)
      if (data.status) {
        toast.success(data.message || 'Promotion completed successfully')
        return data
      }
      toast.error(data.message || 'Failed to promote students')
      return rejectWithValue(data.message)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to promote students'
      toast.error(errorMsg)
      return rejectWithValue(errorMsg)
    }
  }
)

// Get Promotion History
export const GetPromotionHistory = createAsyncThunk<any, GetPromotionHistoryFilter>(
  'studentPromotion/getHistory',
  async (filter, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/api/StudentPromotion/GetHistory`, filter)
      if (data.status) {
        return data
      }
      toast.error(data.message || 'Failed to fetch promotion history')
      return rejectWithValue(data.message)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to fetch promotion history'
      toast.error(errorMsg)
      return rejectWithValue(errorMsg)
    }
  }
)

// ================= INITIAL STATE ==================
const initialState: StudentPromotionState = {
  eligibleStudents: [],
  eligibleTotalCount: 0,
  eligibleTotalPages: 0,
  eligibleCurrentPage: 1,
  eligibleLoading: false,

  previewResponse: null,
  previewLoading: false,

  promoteResponse: null,
  promoteLoading: false,

  historyData: [],
  historyTotalCount: 0,
  historyTotalPages: 0,
  historyCurrentPage: 1,
  historyLoading: false,

  message: '',
  status: false,
}

// ================= SLICE ==================
const StudentPromotionSlice = createSlice({
  name: 'studentPromotion',
  initialState,
  reducers: {
    resetStudentPromotionState: (state) => {
      state.eligibleStudents = []
      state.eligibleTotalCount = 0
      state.previewResponse = null
      state.promoteResponse = null
      state.historyData = []
      state.historyTotalCount = 0
      state.message = ''
      state.status = false
    }
  },
  extraReducers: (builder) => {
    builder
      // Get Eligible Students
      .addCase(GetEligibleStudents.pending, (state) => {
        state.eligibleLoading = true
      })
      .addCase(GetEligibleStudents.fulfilled, (state, action) => {
        state.eligibleLoading = false
        state.eligibleStudents = action.payload?.data || []
        state.eligibleTotalCount = action.payload?.totalCount || 0
        state.eligibleTotalPages = action.payload?.totalPages || 0
        state.eligibleCurrentPage = action.payload?.currentPage || 1
      })
      .addCase(GetEligibleStudents.rejected, (state, action) => {
        state.eligibleLoading = false
        state.message = action.payload as string
      })

      // Preview
      .addCase(PreviewStudents.pending, (state) => {
        state.previewLoading = true
      })
      .addCase(PreviewStudents.fulfilled, (state, action) => {
        state.previewLoading = false
        state.previewResponse = action.payload?.data || null
      })
      .addCase(PreviewStudents.rejected, (state, action) => {
        state.previewLoading = false
        state.message = action.payload as string
      })

      // Promote
      .addCase(PromoteStudents.pending, (state) => {
        state.promoteLoading = true
      })
      .addCase(PromoteStudents.fulfilled, (state, action) => {
        state.promoteLoading = false
        state.promoteResponse = action.payload?.data || null
      })
      .addCase(PromoteStudents.rejected, (state, action) => {
        state.promoteLoading = false
        state.message = action.payload as string
      })

      // Get History
      .addCase(GetPromotionHistory.pending, (state) => {
        state.historyLoading = true
      })
      .addCase(GetPromotionHistory.fulfilled, (state, action) => {
        state.historyLoading = false
        state.historyData = action.payload?.data || []
        state.historyTotalCount = action.payload?.totalCount || 0
        state.historyTotalPages = action.payload?.totalPages || 0
        state.historyCurrentPage = action.payload?.currentPage || 1
      })
      .addCase(GetPromotionHistory.rejected, (state, action) => {
        state.historyLoading = false
        state.message = action.payload as string
      })
  }
})

export const { resetStudentPromotionState } = StudentPromotionSlice.actions
export default StudentPromotionSlice.reducer
