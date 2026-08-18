package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.repositories.account.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoleLookupService {

    private final RoleRepository roleRepository;

    @Cacheable(cacheNames = CacheNames.ROLE_IDS, key = "#name", sync = true)
    public Short getRoleId(String name) {
        return roleRepository.findIdByName(name)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lỗi: Không tìm thấy vai trò " + name));
    }
}
