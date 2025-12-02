"use client";

import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/lib/store';
import { setCredentials, logout as logoutAction } from '../features/auth/authSlice';
import { Mutex } from 'async-mutex';
import { clearAuthCookies, setAuthCookies, getCookie } from '@/lib/utils/cookies';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create a mutex to prevent multiple simultaneous refresh token calls
const mutex = new Mutex();

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}/api/v1`,
  prepareHeaders: (headers, { getState }) => {
    // Get token from auth state first
    let token = (getState() as RootState).auth.token;
    
    // If no token in Redux state, try to get from cookies
    if (!token && typeof document !== 'undefined') {
      token = getCookie('token');
    }
    
    // Debug logging
    console.log('🔐 API Request Auth:', {
      hasTokenInRedux: !!(getState() as RootState).auth.token,
      hasTokenInCookies: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    });
    
    // If we have a token, include it in the headers
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
  credentials: 'include', // Include cookies in requests
});

// Enhanced base query with automatic token refresh on 401 errors
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Debug logging for API calls
  const endpoint = typeof args === 'string' ? args : args.url;
  console.log('🌐 API Call:', {
    endpoint,
    method: typeof args === 'string' ? 'GET' : args.method || 'GET',
    baseUrl: `${BASE_URL}/api/v1`
  });
  
  // Wait until the mutex is available without locking it
  await mutex.waitForUnlock();
  
  let result = await baseQuery(args, api, extraOptions);
  
  // Log result
  console.log('📦 API Response:', {
    endpoint,
    status: result.error ? `Error ${result.error.status}` : 'Success',
    hasData: !!result.data,
    data: result.data
  });
  
  // If we get a 401 Unauthorized error, try to refresh the token
  if (result.error && result.error.status === 401) {
    // Check if another request is already refreshing the token
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      
      try {
        const state = api.getState() as RootState;
        const refreshToken = state.auth.refreshToken;
        
        if (!refreshToken) {
          // No refresh token available, logout user
          api.dispatch(logoutAction());
          
          // Clear cookies
          if (typeof document !== 'undefined') {
            clearAuthCookies();
          }
          
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          
          return result;
        }
        
        // Attempt to refresh the access token
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh-tokens',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );
        
        if (refreshResult.data) {
          const data = refreshResult.data as {
            access: { token: string; expires: string };
            refresh: { token: string; expires: string };
          };
          
          const state = api.getState() as RootState;
          const user = state.auth.user;
          
          if (user) {
            // Update tokens in Redux store
            api.dispatch(
              setCredentials({
                user,
                tokens: {
                  access: data.access,
                  refresh: data.refresh,
                },
              })
            );
            
            // Update cookies with new tokens
            if (typeof document !== 'undefined') {
              setAuthCookies({ access: data.access, refresh: data.refresh }, user.role);
            }
            
            // Retry the original request with the new access token
            result = await baseQuery(args, api, extraOptions);
          }
        } else {
          // Refresh token is invalid or expired, logout user
          api.dispatch(logoutAction());
          
          // Clear cookies
          if (typeof document !== 'undefined') {
            clearAuthCookies();
          }
          
          // Redirect to login with session expired message
          if (typeof window !== 'undefined') {
            window.location.href = '/login?session_expired=true';
          }
        }
      } finally {
        // Release the mutex
        release();
      }
    } else {
      // Wait for the ongoing refresh to complete
      await mutex.waitForUnlock();
      // Retry the original request (token should be refreshed now)
      result = await baseQuery(args, api, extraOptions);
    }
  }
  
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'User', 'Bus', 'Route', 'Trip', 'Booking', 'Operator'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials: { email: string; password: string }) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    register: builder.mutation({
      query: (userData: { name: string; email: string; password: string; phone?: string }) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation({
      query: (refreshToken: string) => ({
        url: '/auth/logout',
        method: 'POST',
        body: { refreshToken },
      }),
      invalidatesTags: ['Auth'],
    }),
    refreshTokens: builder.mutation({
      query: (refreshToken: string) => ({
        url: '/auth/refresh-tokens',
        method: 'POST',
        body: { refreshToken },
      }),
    }),
    forgotPassword: builder.mutation({
      query: (email: string) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation({
      query: (data: { token: string; password: string }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),

    // User endpoints
    getUser: builder.query({
      query: (userId: string) => `/users/${userId}`,
      providesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/users/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Trip endpoints
    searchTrips: builder.query({
      query: (params: {
        origin?: string;
        destination?: string;
        date?: string;
        page?: number;
        limit?: number;
      }) => ({
        url: '/trips',
        params,
      }),
      transformResponse: (response: any) => {
        // Return full paginated response
        if (response.docs) {
          return {
            results: response.docs,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            totalResults: response.totalDocs,
          };
        }
        if (response.results) {
          return response;
        }
        // Handle plain array response
        return {
          results: Array.isArray(response) ? response : [],
          page: 1,
          limit: response.length || 0,
          totalPages: 1,
          totalResults: response.length || 0,
        };
      },
      providesTags: ['Trip'],
    }),
    getTrip: builder.query({
      query: (tripId: string) => `/trips/${tripId}`,
      providesTags: ['Trip'],
    }),
    createTrip: builder.mutation({
      query: (tripData) => ({
        url: '/trips',
        method: 'POST',
        body: tripData,
      }),
      invalidatesTags: ['Trip'],
    }),
    deleteTrip: builder.mutation({
      query: (tripId: string) => ({
        url: `/trips/${tripId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trip'],
    }),
    updateTripSeatPricing: builder.mutation({
      query: ({ tripId, seatPricing }) => ({
        url: `/trips/${tripId}/seatpricing`,
        method: 'PATCH',
        body: { seatPricing },
      }),
      invalidatesTags: ['Trip'],
    }),

    // Booking endpoints
    createBooking: builder.mutation({
      query: (bookingData) => ({
        url: '/bookings',
        method: 'POST',
        body: bookingData,
      }),
      invalidatesTags: ['Booking', 'Trip'],
    }),
    getBookings: builder.query({
      query: (params?: { page?: number; limit?: number }) => ({
        url: '/bookings',
        params,
      }),
      providesTags: ['Booking'],
    }),
    getBooking: builder.query({
      query: (bookingId: string) => `/bookings/${bookingId}`,
      providesTags: ['Booking'],
    }),
    updateBooking: builder.mutation({
      query: ({ bookingId, ...data }) => ({
        url: `/bookings/${bookingId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Booking'],
    }),
    cancelBooking: builder.mutation({
      query: (bookingId: string) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Booking', 'Trip'],
    }),

    // Bus endpoints (Admin)
    getBuses: builder.query({
      query: (params?: { page?: number; limit?: number }) => ({
        url: '/buses',
        params,
      }),
      transformResponse: (response: any) => {
        // Convert mongoose-paginate format to frontend format
        return {
          results: response.docs || response.results || [],
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
          totalResults: response.totalDocs || response.totalResults,
        };
      },
      providesTags: ['Bus'],
    }),
    getBus: builder.query({
      query: (busId: string) => `/buses/${busId}`,
      providesTags: ['Bus'],
    }),
    createBus: builder.mutation({
      query: (busData) => ({
        url: '/buses',
        method: 'POST',
        body: busData,
      }),
      invalidatesTags: ['Bus'],
    }),
    updateBus: builder.mutation({
      query: ({ busId, ...data }) => ({
        url: `/buses/${busId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Bus'],
    }),
    deleteBus: builder.mutation({
      query: (busId: string) => ({
        url: `/buses/${busId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Bus'],
    }),
    updateBusSeatMap: builder.mutation({
      query: ({ busId, seatMapData }) => ({
        url: `/buses/${busId}/seatmap`,
        method: 'PATCH',
        body: seatMapData,
      }),
      invalidatesTags: ['Bus'],
    }),

    // Route endpoints (Admin)
    getRoutes: builder.query({
      query: (params?: { page?: number; limit?: number }) => ({
        url: '/routes',
        params,
      }),
      transformResponse: (response: any) => {
        // Convert mongoose-paginate format to frontend format
        return {
          results: response.docs || response.results || [],
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
          totalResults: response.totalDocs || response.totalResults,
        };
      },
      providesTags: ['Route'],
    }),
    getRoute: builder.query({
      query: (routeId: string) => `/routes/${routeId}`,
      providesTags: ['Route'],
    }),
    createRoute: builder.mutation({
      query: (routeData) => ({
        url: '/routes',
        method: 'POST',
        body: routeData,
      }),
      invalidatesTags: ['Route'],
    }),
    updateRoute: builder.mutation({
      query: ({ routeId, ...data }) => ({
        url: `/routes/${routeId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Route'],
    }),
    deleteRoute: builder.mutation({
      query: (routeId: string) => ({
        url: `/routes/${routeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Route'],
    }),

    // Operator endpoints (Admin)
    getOperators: builder.query({
      query: (params?: { page?: number; limit?: number }) => ({
        url: '/operators',
        params,
      }),
      transformResponse: (response: any) => {
        // Handle both paginated response and direct array
        if (Array.isArray(response)) {
          return {
            results: response,
            page: 1,
            limit: response.length,
            totalPages: 1,
            totalResults: response.length,
          };
        }
        return {
          results: response.docs || response.results || [],
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
          totalResults: response.totalDocs || response.totalResults,
        };
      },
      providesTags: ['Operator'],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokensMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetUserQuery,
  useUpdateUserMutation,
  useSearchTripsQuery,
  useGetTripQuery,
  useCreateTripMutation,
  useDeleteTripMutation,
  useUpdateTripSeatPricingMutation,
  useCreateBookingMutation,
  useGetBookingsQuery,
  useGetBookingQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  useGetBusesQuery,
  useGetBusQuery,
  useCreateBusMutation,
  useUpdateBusMutation,
  useDeleteBusMutation,
  useUpdateBusSeatMapMutation,
  useGetRoutesQuery,
  useGetRouteQuery,
  useCreateRouteMutation,
  useUpdateRouteMutation,
  useDeleteRouteMutation,
  useGetOperatorsQuery,
} = api;
