package com.zh.learnhub_api.exceptions;

import lombok.Getter;
import java.util.List;

@Getter
public class SlugAlreadyExistsException extends RuntimeException {
    private final List<String> suggestions;

    public SlugAlreadyExistsException(String message, List<String> suggestions) {
        super(message);
        this.suggestions = suggestions;
    }
}
