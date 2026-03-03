import type { ReactNode } from 'react';
import React from 'react';
import { Info, AlertTriangle, AlertCircle, Lightbulb } from 'lucide-react';

type CalloutVariant = 'info' | 'warning' | 'error' | 'tip';

const calloutIcons: Record<CalloutVariant, ReactNode> = {
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />,
  tip: <Lightbulb size={18} />
};

export function Callout({
  variant = 'info',
  children
}: {
  variant?: CalloutVariant;
  children: ReactNode;
}) {
  return (
    <div className={`void-callout void-callout--${variant}`}>
      <span className="void-callout__icon">{calloutIcons[variant]}</span>
      <div className="void-callout__content">{children}</div>
    </div>
  );
}

export function Card({
  title,
  icon,
  href,
  children
}: {
  title: string;
  icon?: ReactNode;
  href?: string;
  children: ReactNode;
}) {
  const inner = (
    <>
      {icon && <div className="void-card__icon">{icon}</div>}
      <div className="void-card__title">{title}</div>
      <div className="void-card__description">{children}</div>
    </>
  );

  if (href?.startsWith('/')) {
    return (
      <a href={href} className="void-card">
        {inner}
      </a>
    );
  }

  if (href) {
    return (
      <a href={href} className="void-card" target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }

  return <div className="void-card">{inner}</div>;
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="void-card-grid">{children}</div>;
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="void-steps">{children}</ol>;
}

export function Step({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="void-step">
      <div className="void-step__title">{title}</div>
      <div>{children}</div>
    </li>
  );
}
