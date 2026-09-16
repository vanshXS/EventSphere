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