type UserAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PIXELS: Record<UserAvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 210,
};

interface UserAvatarProps {
  avatar: string | null;
  fullName: string;
  size?: UserAvatarSize;
  className?: string;
}

const UserAvatar = ({ avatar, fullName, size = 'md', className = '' }: UserAvatarProps) => {
  const sizePixels = SIZE_PIXELS[size];

  const defaultAvatar = (
    <i
      className="bi bi-person-circle"
      aria-hidden="true"
      style={{ color: 'currentColor', fontSize: '100%', lineHeight: 1 }}
    />
  );

  return (
    <div
      className={`rounded-circle overflow-hidden d-flex align-items-center justify-content-center bg-light ${className}`}
      style={{
        width: sizePixels,
        height: sizePixels,
        fontSize: sizePixels,
      }}
      title={fullName}
    >
      {avatar ? (
        <img src={avatar} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        defaultAvatar
      )}
    </div>
  );
};

export default UserAvatar;
