package com.zh.learnhub_api.pojo;

import com.zh.learnhub_api.enums.AccountStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "user", indexes = {
    @Index(name = "idx_user_created", columnList = "created_at, id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@org.hibernate.annotations.DynamicUpdate
public class User implements Serializable {

    private static final long serialVersionUID = 1L;
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @Size(min = 1, max = 50)
    @Column(name = "username")
    @ToString.Include
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

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_role",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roleSet;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "userId", fetch = FetchType.LAZY)
    private Set<LessonProgress> lessonProgressSet;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "instructorId", fetch = FetchType.LAZY)
    private Set<Course> courseSet;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "userId", fetch = FetchType.LAZY)
    private Set<Payment> paymentSet;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "userId", fetch = FetchType.LAZY)
    private Set<Enrollment> enrollmentSet;
}
