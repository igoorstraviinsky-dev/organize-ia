import React from 'react'

interface BrandLogoProps {
  variant?: 'full' | 'mark'
  className?: string
  alt?: string
}

export default function BrandLogo({
  variant = 'full',
  className,
  alt = 'TaskWise AI',
}: BrandLogoProps) {
  const src = variant === 'mark' ? '/taskwise-logo-mark.svg' : '/taskwise-logo-full.svg'

  return <img src={src} alt={alt} className={className} />
}
