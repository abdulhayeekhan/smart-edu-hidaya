import React from 'react';
import { img_path } from '../../../environment';

interface Image {
  className?: string;
  src: string;
  alt?: string;
  height?: number;
  width?: number;
  id?: string;
  style?: React.CSSProperties;
}

const ImageWithBasePath = (props: Image) => {
  // 1. Check if the src is already a full URL (starts with http or https)
  const isFullUrl = props.src.startsWith('http://') || props.src.startsWith('https://');

  // Combine img_path and the provided src to create a clean image source URL
  let fullSrc = props.src;
  if (!isFullUrl) {
    const basePath = img_path || '/';
    const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const cleanSrc = props.src.startsWith('/') ? props.src.slice(1) : props.src;
    fullSrc = `${prefix}${cleanSrc}`;
  }

  return (
    <img
      className={props.className}
      src={fullSrc}
      height={props.height}
      alt={props.alt || ''}
      width={props.width}
      id={props.id}
      style={props.style}
    />
  );
};

export default ImageWithBasePath;
