package com.zh.learnhub_api.pojo;

import com.zh.learnhub_api.enums.AccountStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(
        name = "user",
        indexes = {@Index(name = "idx_user_created", columnList = "created_at, id")})
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@org.hibernate.annotations.DynamicUpdate
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @Size(min = 1, max = 50)
    @Column(name = "username")
    private String username;

    @NotNull
    @Size(min = 1, max = 100)
    @Column(name = "email")
    private String email;

    @NotNull
    @Size(min = 1, max = 255)
    @Column(name = "password")
    private String password;

    @NotNull
    @Size(min = 1, max = 100)
    @Column(name = "full_name")
    private String fullName;

    @Size(max = 500)
    @Column(name = "avatar")
    private String avatar;

    @Lob
    @Size(max = 65535)
    @Column(name = "bio")
    private String bio;

    @Column(name = "email_verified")
    private boolean emailVerified;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 20)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_role",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roleSet;
}
