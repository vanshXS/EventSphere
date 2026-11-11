import api from "../../lib/api";

export const login = async (data) => {

    const response = await api.post(
        "/api/auth/login",
        data
    );

    return response.data;
};

export const logout = async () => {

    await api.post("/api/auth/logout");
};

export const registerOrganization = async (data) => {

    const response = await api.post(
        "/api/auth/register/organizer",
        data
    );

    return response.data;
};

export const registerParticipant = async (data) => {

    const response = await api.post(
        "/api/auth/register/participant",
        data
    );

    return response.data;
};

export const verifyRegistrationEmail = async (data) => {
    const response = await api.post(
        "/api/auth/register/verify-email",
        data
    );
    return response.data;
};

export const resendRegistrationOTP = async (data) => {
    const response = await api.post(
        "/api/auth/register/resend-otp",
        data
    );
    return response.data;
};

export const refreshAccessToken = async () => {

    const response = await api.post(
        "/api/auth/refresh"
    );

    return response.data;
};

export const searchColleges = async (query) => {

    const response = await api.get("/api/colleges/search", {
        params: { name: query }
    });
    return response.data;
};

export const createCollege = async (data) => {

    const response = await api.post('/api/colleges', data);
    return response.data;

};

export const getCollegeById = async (id) => {
    const response = await api.get(`/api/colleges/${id}`);
    return response.data;
};

// College Application & Verification APIs
export const submitCollegeApplication = async (data) => {
    const response = await api.post('/api/colleges/applications', data);
    return response.data;
};

export const sendCollegeDomainOTP = async (applicationId, data) => {
    const response = await api.post(`/api/colleges/applications/${applicationId}/domain-otp`, data);
    return response.data;
};

export const verifyCollegeDomainOTP = async (applicationId, otp, email) => {
    const response = await api.post(`/api/colleges/applications/${applicationId}/domain-otp/verify`, { otp, email });
    return response.data;
};

// Super Admin APIs
export const getPendingCollegeApplications = async (page = 0, size = 20) => {
    const response = await api.get('/api/colleges/super-admin/applications/pending', {
        params: { page, size }
    });
    return response.data;
};

export const getApprovedCollegeApplications = async (page = 0, size = 20) => {
    const response = await api.get('/api/colleges/super-admin/applications/approved', { params: { page, size } });
    return response.data;
};
export const resendCollegeAdminInvitation = async (applicationId) => {
    await api.post(`/api/colleges/super-admin/applications/${applicationId}/resend-admin-invitation`);
};

export const getCollegeApplicationDetails = async (applicationId) => {
    const response = await api.get(`/api/colleges/super-admin/applications/${applicationId}`);
    return response.data;
};

export const approveCollegeApplication = async (applicationId) => {
    const response = await api.post(`/api/colleges/super-admin/applications/${applicationId}/approve`);
    return response.data;
};

export const rejectCollegeApplication = async (applicationId, reason) => {
    const response = await api.post(`/api/colleges/super-admin/applications/${applicationId}/reject`, null, {
        params: { reason }
    });
    return response.data;
};

export const assignCollegeAdmin = async (collegeId, data) => {
    const response = await api.post(`/api/colleges/super-admin/colleges/${collegeId}/admin`, data);
    return response.data;
};

// College Admin APIs
export const getAffiliationRequests = async (collegeId) => {
    const response = await api.get('/api/colleges/college-admin/affiliation-requests', {
        params: { collegeId }
    });
    return response.data;
};

export const approveAffiliationRequest = async (requestId) => {
    const response = await api.post(`/api/colleges/college-admin/affiliation-requests/${requestId}/approve`);
    return response.data;
};

export const rejectAffiliationRequest = async (requestId, reason) => {
    const response = await api.post(`/api/colleges/college-admin/affiliation-requests/${requestId}/reject`, null, {
        params: { reason }
    });
    return response.data;
};

// Participant Affiliation APIs
export const sendStudentAffiliationOTP = async () => {
    const response = await api.post('/api/colleges/participant/college-affiliation/domain-otp');
    return response.data;
};

export const verifyStudentAffiliationOTP = async (otp) => {
    const response = await api.post('/api/colleges/participant/college-affiliation/domain-otp/verify', null, {
        params: { otp }
    });
    return response.data;
};

export const submitManualAffiliationRequest = async (data) => {
    if (!data.document) {
        throw new Error("Supporting document is required.");
    }
    const formData = new FormData();
    formData.append('studentIdentifier', data.studentIdentifier);
    if (data.course) formData.append('course', data.course);
    if (data.department) formData.append('department', data.department);
    formData.append('document', data.document);
    const response = await api.post('/api/colleges/participant/college-affiliation/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const downloadAffiliationDocument = async (requestId) => {
    const response = await api.get(`/api/colleges/college-admin/affiliation-requests/${requestId}/documents`, {
        responseType: 'blob'
    });
    return response;
};

export const getMyAffiliationStatus = async () => {
    const response = await api.get('/api/colleges/participant/college-affiliation/me');
    return response.data;
};

export const acceptCollegeAdminInvitation = async (data) => {
    const response = await api.post('/api/auth/college-admin/accept-invitation', data);
    return response.data;
};

export const submitInitialAdminNomination = async (applicationId, data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('contactNumber', data.contactNumber);
    formData.append('designation', data.designation);
    formData.append('authorizationDocument', data.authorizationDocument);
    const response = await api.post(`/api/colleges/applications/${applicationId}/nominee`, formData);
    return response.data;
};

export const submitOrganizerAffiliationRequest = async (data) => {
    const formData = new FormData();
    formData.append('staffIdentifier', data.staffIdentifier);
    if (data.department) formData.append('department', data.department);
    if (data.designation) formData.append('designation', data.designation);
    formData.append('document', data.document);
    const response = await api.post('/api/colleges/organizer/college-affiliation/requests', formData);
    return response.data;
};

export const getMyOrganizerAffiliation = async () => {
    const response = await api.get('/api/colleges/organizer/college-affiliation/me');
    return response.data;
};

export const downloadOrganizerAffiliationDocument = async (requestId) => {
    return api.get(`/api/colleges/college-admin/organizer-affiliation-requests/${requestId}/documents`, { responseType: 'blob' });
};

export const downloadInstitutionDocument = async (applicationId, documentId) => {
    return api.get(`/api/colleges/super-admin/applications/${applicationId}/documents/${encodeURIComponent(documentId)}`, { responseType: 'blob' });
};

export const downloadNomineeDocument = async (applicationId) => {
    return api.get(`/api/colleges/super-admin/applications/${applicationId}/nominee-document`, { responseType: 'blob' });
};

export const getOrganizerAffiliationRequests = async (collegeId) => {
    const response = await api.get('/api/colleges/college-admin/organizer-affiliation-requests', { params: { collegeId } });
    return response.data;
};

export const reviewOrganizerAffiliationRequest = async (requestId, approved, reason) => {
    const action = approved ? 'approve' : 'reject';
    const response = await api.post(`/api/colleges/college-admin/organizer-affiliation-requests/${requestId}/${action}`, null,
        approved ? undefined : { params: { reason } });
    return response.data;
};

export const submitManualCollegeApplication = async (data) => {
    const formData = new FormData();
    ["name", "code", "officialWebsite", "address", "initialAdminEmail"].forEach((key) => {
        if (data[key]) formData.append(key, data[key]);
    });
    data.documents.forEach((file) => formData.append("documents", file));
    ["nomineeName", "nomineeEmail", "nomineeContactNumber", "nomineeDesignation", "nomineeAuthorizationDocument"].forEach((key) => formData.append(key, data[key]));
    const response = await api.post('/api/colleges/applications/manual', formData);
    return response.data;
};
