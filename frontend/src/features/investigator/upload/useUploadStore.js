import { create } from 'zustand';

export const useUploadStore = create((set, get) => ({
    images: [],
    gcpData: [],
    flightLog: null,

    setImages: (newImages) => set({ images: newImages }),   // was "setimages"
    setGcpData: (data) => set({ gcpData: data }),
    setFlightLog: (log) => set({ flightLog: log }),         // was missing

    isValidGcpCount: () => get().gcpData.length >= 7,       // "get" was undefined
}));