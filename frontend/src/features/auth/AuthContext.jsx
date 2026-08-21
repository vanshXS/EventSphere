import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    logout,
    refreshAccessToken
} from "./authApi";
import { Loader2 } from "lucide-react";

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loginUser = (userData) => {
        setUser(userData);
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

                setUser(userData);

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