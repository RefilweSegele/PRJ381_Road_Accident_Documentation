const SAMPLE_DAMAGE_BOXES = [
    {
        damageType: "Frontal Bumper Crumple",
        confidence: 0.9425,
        boudingBox: {
            unit: "meters",
            x_min: -1.24, x_max: -0.85,
            y_min: 0.45, y_max: 1.10,
            z_min: 0.12, z_max: 0.68,
        },
    },
    {
        damageType: "Windshield Structural Crack",
        confidence: 0.8810,
        boundingBox: {
            unit: "meters",
            x_min: -0.40, x_max: 0.35,
            y_min: 1.20, y_max: 1.75,
            z_min: 0.85, z_max: 1.30,
        },
    },
];

const MOCK_REVIEW_CASES = {
    1: {
        id: 1,
        caseReference: "2026-0001",
        incidentAddress: "Mock intersection, Johannesburg",
        latitude: -26.2041,
        longitude: 28.0473,
        incidentDate: "2026-08-14T14:30:00+02:00",
        status: "processed",
        assignedReviewer: "Mock Investigator",
        modelUrl: "/models/DamagedHelmet.glb",
        scaleFactor: null,
        damageBoxes: SAMPLE_DAMAGE_BOXES,
    },
    2: {
        id: 2,
        caseReference: "2026-0002",
        incidentAddress: "Mock address",
        latitude: null,
        longitude: null,
        incidentDate: "2026-08-20T09:15:00+02:00",
        status: "draft",
        assignedReviewer: "null",
        modelUrl: "null",
        scaleFactor: null,
        damageBoxes: [],
    },
};

//we mirror the backend: 404 for unknown IDs, 409 for cases not ready for review
export function getMockReviewCase(id) {
    const numericId = Number(id);
    const caseData = MOCK_REVIEW_CASES[numericId];

    if (!caseData) {
        throw withStatus(new Error("Case not found"), 404);
    }
    if (!["processed", "reviewed"].includes(caseData.status)) {
        throw withStatus(
            new Error(`Case is not ready for review (status: ${caseData.status})`), 409
        );
    }
    return caseData;
}

function withStatus(error, status) {
    error.status = status;
    return error;
}