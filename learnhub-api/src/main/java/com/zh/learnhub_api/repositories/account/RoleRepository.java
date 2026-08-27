package com.zh.learnhub_api.repositories.account;

import com.zh.learnhub_api.pojo.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Short> {

    @Query("SELECT r.id FROM Role r WHERE r.name = :name")
    Optional<Short> findIdByName(@Param("name") String name);
}
