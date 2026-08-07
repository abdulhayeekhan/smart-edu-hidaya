import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import toast from 'react-hot-toast'

const baseURL = process.env.REACT_APP_API_BASE_URL

export interface Region {
  id: number
  name: string
  directorId?: number | null
  directorName?: string | null
  createdAt?: string
  [key: string]: any
}

export interface RegionState {
  data: Region[]
  message: string
  status: boolean
  loading: boolean
}


export const GetAllRegions = createAsyncThunk<Region[]>(
  'region/getAll',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/api/Region/GetAll`,body)
      if (data.status) return data.data as Region[]
      toast.error(data.message || 'Failed to load regions')
      return rejectWithValue(data.message)
    } catch (error: any) {
      toast.error(error.message)
      return rejectWithValue(error.message)
    }
  }
)

const initialState: RegionState = {
  data: [],
  message: '',
  status: false,
  loading: false,
}

const RegionSlice = createSlice({
  name: 'region',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      // Get All Regions
      .addCase(GetAllRegions.pending, state => {
        state.loading = true
      })
      .addCase(GetAllRegions.fulfilled, (state, action: PayloadAction<Region[]>) => {
        state.loading = false
        state.data = action.payload
        state.status = true
      })
      .addCase(GetAllRegions.rejected, (state, action) => {
        state.loading = false
        state.status = false
        state.message = action.payload as string
      })
  },
})

export default RegionSlice.reducer
