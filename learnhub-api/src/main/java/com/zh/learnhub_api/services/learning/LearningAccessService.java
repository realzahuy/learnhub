package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.exceptions.ForbiddenException;
import org.springframework.stereotype.Service;

@Service
public class LearningAccessService {

    public void requireEnrollment(Long enrolled) {
        requireEnrollment(Long.valueOf(1L).equals(enrolled));
    }

    public void requireEnrollment(boolean enrolled) {
        if (!enrolled) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
    }
}
