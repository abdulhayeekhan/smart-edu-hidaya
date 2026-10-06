import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import toast from 'react-hot-toast'

const baseURL = process.env.REACT_APP_API_BASE_URL || ''

export interface MigrationFilter {
  fromCampusId: number | null
  toCampusId: number | null
  status: string
  admissionId: number | null
  search: string
  pageNo: number
  pageSize: number
}

export interface MigrationRequestPayload {
  admissionId: number
  toCampusId: number
  toGradeId: number
  toSectionId: number
  reason: string
  userId: number
}

export interface MigrationActionPayload {
  id: number
  userId: number
  remarks: string
  toGradeId: number
  toSectionId: number
}

export interface StudentMigrationState {
  migrationList: any[]
  totalCount: number
  totalPages: number
  currentPage: number
  loading: boolean
  actionLoading: boolean
  singleMigrationDetail: any | null
}

const initialState: StudentMigrationState = {
  migrationList: [],
  totalCount: 0,
  totalPages: 1,
  currentPage: 1,
  loading: false,
  actionLoading: false,
  singleMigrationDetail: null
}

export const FetchMigrationList = createAsyncThunk(
  'studentMigration/fetchList',
  async (filter: MigrationFilter, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseURL}/api/StudentMigration/List`, filter)
      if (response.data.status) {
        return response.data
      } else {
        toast.error(response.data.message || 'Error fetching migration list')
        return rejectWithValue(response.data.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Server Error')
      return rejectWithValue(error.message)
    }
  }
)

export const GetMigrationById = createAsyncThunk(
  'studentMigration/getById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${baseURL}/api/StudentMigration/GetById/${id}`)
      if (response.data.status) {
        return response.data.data
      } else {
        toast.error(response.data.message || 'Error fetching detail')
        return rejectWithValue(response.data.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Server Error')
      return rejectWithValue(error.message)
    }
  }
)

export const RequestStudentMigration = createAsyncThunk(
  'studentMigration/request',
  async (payload: MigrationRequestPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseURL}/api/StudentMigration/Request`, payload)
      if (response.data.status) {
        toast.success(response.data.message || 'Migration request generated successfully.')
        return response.data
      } else {
        toast.error(response.data.message || 'Failed to request migration')
        return rejectWithValue(response.data.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Server Error')
      return rejectWithValue(error.message)
    }
  }
)

export const ApproveStudentMigration = createAsyncThunk(
  'studentMigration/approve',
  async (payload: MigrationActionPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseURL}/api/StudentMigration/Approve`, payload)
      if (response.data.status) {
        toast.success(response.data.message || 'Migration approved successfully.')
        return response.data
      } else {
        toast.error(response.data.message || 'Failed to approve migration')
        return rejectWithValue(response.data.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Server Error')
      return rejectWithValue(error.message)
    }
  }
)

export const RejectStudentMigration = createAsyncThunk(
  'studentMigration/reject',
  async (payload: MigrationActionPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseURL}/api/StudentMigration/Reject`, payload)
      if (response.data.status) {
        toast.success(response.data.message || 'Migration rejected successfully.')
        return response.data
      } else {
        toast.error(response.data.message || 'Failed to reject migration')
        return rejectWithValue(response.data.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Server Error')
      return rejectWithValue(error.message)
    }
  }
)

export const CancelStudentMigration = createAsyncThunk(
  'studentMigration/cancel',
  async (payload: MigrationActionPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseURL}/api/StudentMigration/Cancel`, payload)
      if (response.data.status) {
        toast.success(response.data.message || 'Migration cancelled successfully.')
        return response.data
      } else {
        toast.error(response.data.message || 'Failed to cancel migration')
        return rejectWithValue(response.data.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Server Error')
      return rejectWithValue(error.message)
    }
  }
)

export const studentMigrationSlice = createSlice({
  name: 'studentMigration',
  initialState,
  reducers: {
    resetMigrationState: (state) => {
      state.migrationList = []
      state.totalCount = 0
      state.singleMigrationDetail = null
    }
  },
  extraReducers: builder => {
    builder
      .addCase(FetchMigrationList.pending, state => {
        state.loading = true
      })
      .addCase(FetchMigrationList.fulfilled, (state, action) => {
        state.loading = false
        state.migrationList = action.payload.data || []
        state.totalCount = action.payload.totalCount || 0
        state.totalPages = action.payload.totalPages || 1
        state.currentPage = action.payload.currentPage || 1
      })
      .addCase(FetchMigrationList.rejected, state => {
        state.loading = false
      })
      .addCase(GetMigrationById.fulfilled, (state, action) => {
        state.singleMigrationDetail = action.payload
      })
      .addCase(RequestStudentMigration.pending, state => {
        state.actionLoading = true
      })
      .addCase(RequestStudentMigration.fulfilled, state => {
        state.actionLoading = false
      })
      .addCase(RequestStudentMigration.rejected, state => {
        state.actionLoading = false
      })
      .addCase(ApproveStudentMigration.pending, state => {
        state.actionLoading = true
      })
      .addCase(ApproveStudentMigration.fulfilled, state => {
        state.actionLoading = false
      })
      .addCase(ApproveStudentMigration.rejected, state => {
        state.actionLoading = false
      })
      .addCase(RejectStudentMigration.pending, state => {
        state.actionLoading = true
      })
      .addCase(RejectStudentMigration.fulfilled, state => {
        state.actionLoading = false
      })
      .addCase(RejectStudentMigration.rejected, state => {
        state.actionLoading = false
      })
      .addCase(CancelStudentMigration.pending, state => {
        state.actionLoading = true
      })
      .addCase(CancelStudentMigration.fulfilled, state => {
        state.actionLoading = false
      })
      .addCase(CancelStudentMigration.rejected, state => {
        state.actionLoading = false
      })
  }
})

export const { resetMigrationState } = studentMigrationSlice.actions
export default studentMigrationSlice.reducer
