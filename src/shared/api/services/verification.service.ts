import type { AxiosInstance } from "axios";

export const createVerificationService = (axiosInstance: AxiosInstance) => ({
  verification: {
    getSlots: async () => {
      const { data } = await axiosInstance.get("/verification/slots");
      return data;
    },
    getBookings: async () => {
      const { data } = await axiosInstance.get("/verification/bookings");
      return data;
    },
    createBooking: async (bookingData: any) => {
      const { data } = await axiosInstance.post("/verification/bookings", bookingData);
      return data;
    },
    completeBooking: async (id: string) => {
      const { data } = await axiosInstance.put(`/verification/bookings/${id}/complete`);
      return data;
    },
    cancelBooking: async (id: string) => {
      const { data } = await axiosInstance.delete(`/verification/bookings/${id}`);
      return data;
    }
  }
});