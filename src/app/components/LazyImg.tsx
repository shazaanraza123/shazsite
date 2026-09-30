import { ImgHTMLAttributes, useState } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
};

export function LazyImg({ src, alt, className, ...rest }: Props) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) {
    return <div className={className} aria-hidden="true" />;
  }
  return (
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setOk(false)}
      {...rest}
    />
  );
}
