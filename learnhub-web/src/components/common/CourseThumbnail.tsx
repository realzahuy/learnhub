import { ReactEventHandler, ReactNode, useState } from 'react';

interface CourseThumbnailProps {
  src?: string | null;
  alt: string;
  placeholder: ReactNode;
  onError?: ReactEventHandler<HTMLImageElement>;
}

const CourseThumbnail = ({
  src,
  alt,
  placeholder,
  onError,
}: CourseThumbnailProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <>{placeholder}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
};

export default CourseThumbnail;
