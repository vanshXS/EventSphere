import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    logout,
    refreshAccessToken,
    getCollegeById
} from "./authApi";
import { Loader2 } from "lucide-react";

const AuthContext = createContext(null);

const enrichUserData = async (userData) => {
    if (!userData || !userData.collegeId) {
        return userData;
    }
    try {
        const college = await getCollegeById(userData.collegeId);
        if (college) {
            return {
                ...userData,
                collegeName: college.name,
                collegeCode: college.code,
                collegeVerificationMode: college.verificationMode,
                collegeVerificationStatus: college.verificationStatus,
                verifiedDomains: college.verifiedDomains || []
            };
        }
    } catch (e) {
        console.warn("Could not load college details:", e);
    }
    return userData;
};

export default function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loginUser = async (userData) => {
        const enriched = await enrichUserData(userData);
        setUser(enriched);
    };

    const updateUser = (fields) => {
        setUser((prev) => (prev ? { ...prev, ...fields } : prev));
    };

    const refreshUser = async () => {
        try {
            const userData = await refreshAccessToken();
            const enriched = await enrichUserData(userData);
            setUser(enriched);
            return enriched;
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    const logoutUser = async () => {

        try {
            await logout();

        } catch (error) {
            console.error("Logout failed:", error);

        } finally {
            setUser(null);
        }
    };

    useEffect(() => {

        const restoreSession = async () => {

            try {

                const userData =
                    await refreshAccessToken();

                const enriched = await enrichUserData(userData);
                setUser(enriched);

            } catch (error) {

                console.log("No active session");

                setUser(null);

            } finally {

                setIsLoading(false);
            }
        };

        restoreSession();

    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="flex items-center space-x-3 text-slate-700 font-medium bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-sm">Restoring session...</span>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loginUser,
                updateUser,
                refreshUser,
                logoutUser,
                isLoading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}