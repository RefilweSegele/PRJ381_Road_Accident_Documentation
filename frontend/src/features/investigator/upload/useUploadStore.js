import {create} from 'zustand';

export const useUploadStore = create((set) => ({
    images: [],
    gcpData: [],

    setimages: (newImages) => set({images: newImages}),
    setGcpData: (data) => set({gcpData: data}),

    // Validation: Flags if there are fewer that 7 GCPs
    isValidGcpCount: () => {
        return get().gcpData.length >= 7;
    }
}));