import { ReactNode, useState } from 'react';

interface CourseThumbnailProps {
  src?: string | null;
  alt: string;
  placeholder: ReactNode;
}

const CourseThumbnail = ({ src, alt, placeholder }: CourseThumbnailProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return placeholder;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
};

export default CourseThumbnail;
