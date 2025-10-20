import React, { useState, useRef, useEffect } from 'react';
import { ImageSkeleton } from './SkeletonComponents';

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  aspectRatio = 'aspect-square',
  onError,
  onLoad,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  return (
    <div ref={imgRef} className={`relative ${aspectRatio} ${className}`}>
      {/* Skeleton while loading */}
      {!isLoaded && !hasError && (
        <ImageSkeleton 
          aspectRatio={aspectRatio}
          className="absolute inset-0"
          showBlur={true}
        />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${aspectRatio}`}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <img 
            src="/favicon.png" 
            alt="Fallback" 
            className="w-8 h-8 opacity-50"
          />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
