/**
 * Parses Axios / Backend errors into field-specific errors and human-readable general error messages.
 * 
 * @param {Error} error - Axios error object
 * @returns {{ fieldErrors: Record<string, string>, generalError: string }}
 */
export function parseAuthError(error) {
  // 1. Network / Server connection errors
  if (!error.response) {
    return {
      fieldErrors: {},
      generalError: "Unable to connect to the server. Please check your network and try again."
    };
  }

  const { status, data } = error.response;
  const fieldErrors = data?.validationErrors || {};
  let generalError = "";

  // 2. If backend provides specific non-generic message
  const rawMessage = typeof data?.message === "string" ? data.message : "";
  const isGenericValidationMsg = rawMessage.toLowerCase().includes("validation failed");

  if (rawMessage && !isGenericValidationMsg) {
    generalError = rawMessage;
  } else {
    // 3. Fallbacks based on HTTP status code
    switch (status) {
      case 400:
        generalError = Object.keys(fieldErrors).length > 0
          ? "Please correct the highlighted fields."
          : "Invalid request. Please check your input.";
        break;
      case 401:
        generalError = "Email or password is incorrect.";
        break;
      case 403:
        generalError = "Access denied. You do not have permission.";
        break;
      case 404:
        generalError = "Requested resource or college code was not found.";
        break;
      case 409:
        generalError = "This email is already registered.";
        break;
      case 500:
        generalError = "An unexpected server error occurred. Please try again later.";
        break;
      default:
        generalError = "An unexpected error occurred. Please try again.";
        break;
    }
  }

  return {
    fieldErrors,
    generalError
  };
}
