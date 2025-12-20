import React from 'react';
import Link from '@docusaurus/Link';

interface CardProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ href, children, className = '' }: CardProps) {
  const content = (
    <div className={`rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow ${className}`}>
      {children}
    </div>
  );

  if (href) {
    return <Link to={href} className="no-underline">{content}</Link>;
  }

  return content;
}
