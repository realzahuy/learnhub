
export interface EmailVerificationStatus {

  email: string;

  expiresInSeconds: number;

  resendAfterSeconds: number;
}
