package com.zh.learnhub_api.pojo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "payment", indexes = {
    @Index(name = "idx_payment_user_status_created",
           columnList = "user_id, status, created_at"),
    @Index(name = "idx_payment_status_created", columnList = "status, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Payment implements Serializable {

    private static final long serialVersionUID = 1L;
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @Column(name = "total_price")
    private BigDecimal totalPrice;

    @NotNull
    @Size(min = 1, max = 50)
    @Column(name = "method")
    private String method;

    @Size(max = 255)
    @Column(name = "transaction_id")
    @ToString.Include
    private String transactionId;

    @NotNull
    @Size(min = 1, max = 20)
    @Column(name = "status", length = 20)
    private String status;

    @NotNull
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @NotNull
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "paymentId", fetch = FetchType.LAZY)
    private Set<PaymentItem> paymentItemSet;
    
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private User userId;
}
