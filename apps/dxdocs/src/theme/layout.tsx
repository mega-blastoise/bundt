import React from 'react';
import type { ReactNode } from 'react';
import { Github, ExternalLink } from 'lucide-react';
import type { VoidConfig, NavigationItem, HeaderLink } from '../config/schema.ts';

function renderNavItem(item: NavigationItem, currentPath: string): ReactNode {
  if (item.type === 'page') {
    const isActive = currentPath === item.path;
    return (
      <a
        key={item.path}
        href={item.path}
        className={`void-sidebar__link${isActive ? ' void-sidebar__link--active' : ''}`}
      >
        {item.title}
      </a>
    );
  }

  return (
    <div key={item.title} className="void-sidebar__group">
      <div className="void-sidebar__group-title">{item.title}</div>
      {item.items.map((child) => renderNavItem(child, currentPath))}
    </div>
  );
}

function renderHeaderLink(link: HeaderLink): ReactNode {
  const iconEl =
    link.icon === 'github' ? (
      <Github size={18} />
    ) : link.icon === 'external' ? (
      <>
        {link.label} <ExternalLink size={12} />
      </>
    ) : null;

  return (
    <a
      key={link.href}
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="void-header__link"
    >
      {iconEl ?? link.label}
    </a>
  );
}

export function DocLayout({
  config,
  currentPath,
  tocHtml,
  children
}: {
  config: VoidConfig;
  currentPath: string;
  tocHtml: string;
  children: ReactNode;
}) {
  return (
    <div className="void-layout">
      <header className="void-header">
        <a href="/" className="void-header__logo">
          <span>{config.title}</span>
        </a>
        {config.headerLinks.length > 0 && (
          <div className="void-header__links">
            {config.headerLinks.map(renderHeaderLink)}
          </div>
        )}
      </header>
      <aside className="void-sidebar">
        {config.navigation.map((item) => renderNavItem(item, currentPath))}
      </aside>
      <main className="void-main">
        <article className="void-article">{children}</article>
      </main>
      <nav
        className="void-toc"
        dangerouslySetInnerHTML={{ __html: tocHtml }}
      />
    </div>
  );
}
