import React from 'react';
import type { ReactNode } from 'react';
import { Github, ExternalLink, ChevronRight, ChevronLeft, ArrowUpRight } from 'lucide-react';
import type {
  VoidConfig,
  NavigationItem,
  NavigationPage,
  HeaderLink,
  CoverpageConfig,
  FooterConfig,
  LogoConfig
} from '../config/schema.ts';

function flattenNavPages(items: NavigationItem[]): NavigationPage[] {
  const pages: NavigationPage[] = [];
  for (const item of items) {
    if (item.type === 'page') {
      pages.push(item);
    } else {
      pages.push(...flattenNavPages(item.items));
    }
  }
  return pages;
}

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

function renderLogo(logo: LogoConfig | undefined, title: string): ReactNode {
  if (!logo) {
    return <span>{title}</span>;
  }

  if (typeof logo === 'string') {
    return (
      <>
        <img
          src={logo}
          alt={title}
          className="void-header__logo-img"
          height={28}
        />
        <span className="void-header__logo-text">{title}</span>
      </>
    );
  }

  const h = logo.height ?? 28;
  return (
    <>
      <img
        src={logo.light}
        alt={title}
        className="void-header__logo-img void-header__logo-img--light"
        height={h}
      />
      <img
        src={logo.dark}
        alt={title}
        className="void-header__logo-img void-header__logo-img--dark"
        height={h}
      />
      <span className="void-header__logo-text">{title}</span>
    </>
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

export function Coverpage({ config }: { config: CoverpageConfig }) {
  return (
    <section className={`void-coverpage void-coverpage--${config.background}`}>
      <div className="void-coverpage__content">
        <h1 className="void-coverpage__title">{config.title}</h1>
        {config.tagline && (
          <p className="void-coverpage__tagline">{config.tagline}</p>
        )}
        {config.description && (
          <p className="void-coverpage__description">{config.description}</p>
        )}
        {config.actions.length > 0 && (
          <div className="void-coverpage__actions">
            {config.actions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className={`void-coverpage__action${action.primary ? ' void-coverpage__action--primary' : ''}`}
              >
                {action.label}
                {action.primary && <ChevronRight size={16} />}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PrevNextNav({
  pages,
  currentPath
}: {
  pages: NavigationPage[];
  currentPath: string;
}) {
  const idx = pages.findIndex((p) => p.path === currentPath);
  if (idx === -1) return null;

  const prev = idx > 0 ? pages[idx - 1] : null;
  const next = idx < pages.length - 1 ? pages[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav className="void-prevnext">
      {prev ? (
        <a href={prev.path} className="void-prevnext__link void-prevnext__link--prev">
          <span className="void-prevnext__label">
            <ChevronLeft size={14} /> Previous
          </span>
          <span className="void-prevnext__title">{prev.title}</span>
        </a>
      ) : (
        <div />
      )}
      {next ? (
        <a href={next.path} className="void-prevnext__link void-prevnext__link--next">
          <span className="void-prevnext__label">
            Next <ChevronRight size={14} />
          </span>
          <span className="void-prevnext__title">{next.title}</span>
        </a>
      ) : (
        <div />
      )}
    </nav>
  );
}

function Footer({
  config,
  siteTitle
}: {
  config: FooterConfig;
  siteTitle: string;
}) {
  const hasColumns = config.columns.length > 0;
  const hasSocials = config.socials.length > 0;

  return (
    <footer className="void-footer">
      {hasColumns && (
        <div className="void-footer__columns">
          {config.columns.map((col) => (
            <div key={col.title} className="void-footer__column">
              <div className="void-footer__column-title">{col.title}</div>
              <ul className="void-footer__column-links">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="void-footer__link"
                      {...(link.href.startsWith('http')
                        ? { target: '_blank', rel: 'noreferrer' }
                        : {})}
                    >
                      {link.label}
                      {link.href.startsWith('http') && (
                        <ArrowUpRight size={12} />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="void-footer__bottom">
        <div className="void-footer__copyright">
          {config.copyright ?? `\u00A9 ${new Date().getFullYear()} ${siteTitle}`}
        </div>
        {hasSocials && (
          <div className="void-footer__socials">
            {config.socials.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="void-footer__social"
                aria-label={social.label ?? social.icon}
              >
                {social.icon === 'github' && <Github size={16} />}
                {social.icon === 'twitter' && <span className="void-footer__social-text">𝕏</span>}
                {social.icon === 'discord' && <span className="void-footer__social-text">Discord</span>}
                {social.icon === 'external' && <ExternalLink size={16} />}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}

export function DocLayout({
  config,
  currentPath,
  tocHtml,
  coverpage,
  children
}: {
  config: VoidConfig;
  currentPath: string;
  tocHtml: string;
  coverpage?: CoverpageConfig;
  children: ReactNode;
}) {
  const pages = flattenNavPages(config.navigation);

  return (
    <>
      {coverpage && currentPath === '/' && <Coverpage config={coverpage} />}
      <div className="void-layout">
        <header className="void-header">
          <a href="/" className="void-header__logo">
            {renderLogo(config.logo, config.title)}
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
          <PrevNextNav pages={pages} currentPath={currentPath} />
        </main>
        <nav
          className="void-toc"
          dangerouslySetInnerHTML={{ __html: tocHtml }}
        />
      </div>
      {config.footer && (
        <Footer config={config.footer} siteTitle={config.title} />
      )}
    </>
  );
}
