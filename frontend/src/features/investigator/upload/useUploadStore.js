import { create } from 'zustand';

export const useUploadStore = create((set, get) => ({
    images: [],
    gcpData: [],
    flightLog: null, // set when the Flight Log form is submitted

    setImages: (newImages) => set({ images: newImages }),
    setGcpData: (data) => set({ gcpData: data }),
    setFlightLog: (data) => set({ flightLog: data }),

    // Validation: flags if there are fewer than 7 GCPs
    isValidGcpCount: () => get().gcpData.length >= 7,
}));
