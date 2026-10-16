import { useQuery } from "@tanstack/react-query";
import apiClient from "./client";
import { getMockReviewCase } from "./mocks/reviewerMockData";

//same toggle as api/cases.js. Mock data is on unless VITE_USE_MOCK_API=false.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

//fetches one case for the 3D viewer. Error carry a numeric `status`
export async function fetchReviewCase(id) {
    if (USE_MOCK_API) {
        return getMockReviewCase(id);
    }

    try {
        const { data } = await apiClient.get(`/review/cases/${id}`);
        return data;
    }
    catch (err) {
        const error = new Error(
            err.response?.data?.error ?? "Could not load the case"
        );
        error.status = err.response?.status;
        throw error;
    }
}

export function useReviewCase(id){
    return useQuery({
        queryKey: ["reviewCase", id],
        queryFn: () => fetchReviewCase(id),
        enabled: Boolean(id),
        //404 and 409 won't change on retry, so fail fast on them
        retry: (failureCount, error) =>
            ![404, 409].includes(error?.status) && failureCount < 2,
    });
}