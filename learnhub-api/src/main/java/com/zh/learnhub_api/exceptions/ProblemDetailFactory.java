package com.zh.learnhub_api.exceptions;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

import java.net.URI;

public final class ProblemDetailFactory {

    private ProblemDetailFactory() {
    }

    public static ProblemDetail create(HttpStatusCode status, String detail, String requestUri) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        if (requestUri != null && !requestUri.isBlank()) {
            problem.setInstance(URI.create(requestUri));
        }
        return problem;
    }
}
