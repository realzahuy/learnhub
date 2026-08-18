package com.zh.learnhub_api.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ProblemDetail> handleDuplicate(
            DuplicateResourceException ex, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler({EmailNotVerifiedException.class, ForbiddenException.class})
    public ResponseEntity<ProblemDetail> handleForbidden(
            RuntimeException ex, HttpServletRequest request) {
        return response(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ProblemDetail> handleSecurityException(
            SecurityException ex, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ProblemDetail> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {
        return response(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage(), request);
    }

    @ExceptionHandler(SlugAlreadyExistsException.class)
    public ResponseEntity<ProblemDetail> handleSlugAlreadyExists(
            SlugAlreadyExistsException ex, HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, ex.getMessage(), request.getRequestURI());
        problem.setProperty("suggestions", ex.getSuggestions());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, dataIntegrityMessage(ex), request);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ProblemDetail> handleInvalidCredentials(
            InvalidCredentialsException ex, HttpServletRequest request) {
        return response(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ProblemDetail> handleAccountLocked(
            AccountLockedException ex, HttpServletRequest request) {
        ProblemDetail problem = problem(
                HttpStatus.UNAUTHORIZED, ex.getMessage(), request.getRequestURI());
        problem.setProperty("code", "ACCOUNT_LOCKED");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return validationResponse(ex, ex.getBindingResult(), headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (ParameterValidationResult result : ex.getParameterValidationResults()) {
            String parameter = result.getMethodParameter().getParameterName();
            String key = parameter == null ? "parameter" : parameter;
            result.getResolvableErrors().forEach(error ->
                    errors.putIfAbsent(key, defaultMessage(error.getDefaultMessage())));
        }
        ex.getCrossParameterValidationResults().forEach(error ->
                errors.putIfAbsent("global", defaultMessage(error.getDefaultMessage())));
        return validationResponse(ex, errors, headers, status, request);
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<Object> handleBindException(BindException ex, WebRequest request) {
        return validationResponse(
                ex, ex.getBindingResult(), new HttpHeaders(), HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return response(
                HttpStatus.FORBIDDEN,
                "Bạn không có quyền truy cập tài nguyên này",
                request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return mvcResponse(ex, "Dữ liệu JSON không hợp lệ", headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return mvcResponse(
                ex,
                "Thiếu tham số bắt buộc: " + ex.getParameterName(),
                headers,
                status,
                request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(
            HttpRequestMethodNotSupportedException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return mvcResponse(ex, "Phương thức HTTP không được hỗ trợ", headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return mvcResponse(ex, "Định dạng nội dung không được hỗ trợ", headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return mvcResponse(
                ex,
                "File tải lên vượt quá dung lượng cho phép",
                headers,
                status,
                request);
    }

    @ExceptionHandler({
            ImageUploadException.class,
            VideoProcessingException.class,
            EmailSendException.class,
            PaymentGatewayException.class
    })
    public ResponseEntity<ProblemDetail> handleExternalServiceFailure(
            RuntimeException ex, HttpServletRequest request) {
        return response(HttpStatus.BAD_GATEWAY, ex.getMessage(), request);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ProblemDetail> handleTooManyRequests(
            TooManyRequestsException ex, HttpServletRequest request) {
        return response(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(
            Exception ex, HttpServletRequest request) {
        logger.error("Unhandled exception for " + request.getRequestURI(), ex);
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Đã xảy ra lỗi hệ thống",
                request);
    }

    @Override
    protected ResponseEntity<Object> createResponseEntity(
            Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request) {
        ProblemDetail problem = body instanceof ProblemDetail detail
                ? detail
                : problem(statusCode, defaultTitle(statusCode), requestUri(request));
        if (problem.getInstance() == null) {
            problem.setInstance(java.net.URI.create(requestUri(request)));
        }
        return super.createResponseEntity(problem, headers, statusCode, request);
    }

    private ResponseEntity<Object> validationResponse(
            Exception ex,
            BindingResult bindingResult,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        bindingResult.getAllErrors().forEach(error -> {
            String key = error instanceof FieldError fieldError ? fieldError.getField() : "global";
            errors.putIfAbsent(key, defaultMessage(error.getDefaultMessage()));
        });
        return validationResponse(ex, errors, headers, status, request);
    }

    private ResponseEntity<Object> validationResponse(
            Exception ex,
            Map<String, String> errors,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        ProblemDetail problem = problem(status, "Dữ liệu không hợp lệ", requestUri(request));
        problem.setProperty("errors", errors);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    private ResponseEntity<Object> mvcResponse(
            Exception ex,
            String detail,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        return handleExceptionInternal(
                ex,
                problem(status, detail, requestUri(request)),
                headers,
                status,
                request);
    }

    private ResponseEntity<ProblemDetail> response(
            HttpStatus status, String detail, HttpServletRequest request) {
        return ResponseEntity.status(status)
                .body(problem(status, defaultMessage(detail), request.getRequestURI()));
    }

    private ProblemDetail problem(HttpStatusCode status, String detail, String requestUri) {
        return ProblemDetailFactory.create(status, detail, requestUri);
    }

    private String requestUri(WebRequest request) {
        if (request instanceof ServletWebRequest servletWebRequest) {
            return servletWebRequest.getRequest().getRequestURI();
        }
        return "/";
    }

    private String dataIntegrityMessage(DataIntegrityViolationException ex) {
        String message = ex.getMessage();
        if (message == null) {
            return "Vi phạm ràng buộc dữ liệu";
        }
        if (message.contains("user.username") || message.contains("'username'")) {
            return "Tên đăng nhập không được sử dụng";
        }
        if (message.contains("user.email") || message.contains("'email'")) {
            return "Email không được sử dụng";
        }
        if (message.contains("uk_course_slug") || message.contains("slug")) {
            return "Slug đã tồn tại. Vui lòng thử lại với slug khác.";
        }
        if (message.contains("uk_course_position")
                || (message.contains("position") && message.contains("course"))) {
            return "Vị trí bài học đã tồn tại trong khóa học này. Vui lòng chọn vị trí khác.";
        }
        return "Vi phạm ràng buộc dữ liệu";
    }

    private String defaultTitle(HttpStatusCode status) {
        return status instanceof HttpStatus httpStatus
                ? httpStatus.getReasonPhrase()
                : "HTTP " + status.value();
    }

    private String defaultMessage(String message) {
        return message == null || message.isBlank() ? "Dữ liệu không hợp lệ" : message;
    }
}
