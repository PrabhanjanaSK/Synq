// 2xx success responses
export const sendSuccess = (res, statusCode, data = {}) => {
  return res.status(statusCode).json({
    status: "success",
    ...data,
  });
};

// 4xx fail responses (client errors)
export const sendFail = (res, statusCode, message) => {
  return res.status(statusCode).json({
    status: "fail",
    message,
  });
};

// 5xx error responses (server errors) – used from global handler or custom spots
export const sendErrorResponse = (
  res,
  statusCode = 500,
  message = "Internal Server Error",
  error
) => {
  return res.status(statusCode).json({
    status: "error",
    message,
    error,
  });
};
