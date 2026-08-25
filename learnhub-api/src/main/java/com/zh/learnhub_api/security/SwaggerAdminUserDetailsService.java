package com.zh.learnhub_api.security;

import com.zh.learnhub_api.enums.AccountStatus;
import com.zh.learnhub_api.repositories.account.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service("swaggerAdminUserDetailsService")
@RequiredArgsConstructor
public class SwaggerAdminUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        var user = userRepository.findAuthInfoByLogin(login)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Sai tài khoản hoặc mật khẩu"));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .accountLocked(user.getAccountStatus() == AccountStatus.LOCKED)
                .authorities(user.getRoles().toArray(String[]::new))
                .build();
    }
}
