import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

export function useToast() {
  const addToast = useContext(ToastContext);
  if (!addToast) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return addToast;
}
