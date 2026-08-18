package com.zh.learnhub_api.exceptions;

public class AccountLockedException extends InvalidCredentialsException {
    public AccountLockedException(String message) {
        super(message);
    }
}
