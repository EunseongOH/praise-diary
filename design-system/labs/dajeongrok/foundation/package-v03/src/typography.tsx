import type { ReactNode, HTMLAttributes } from 'react';
export type TextRole = 'brand' | 'tagline' | 'artwork-title' | 'artwork-reveal' | 'artwork-tile' | 'page-title' | 'section-title' | 'entry-title' | 'body' | 'diary-write' | 'diary-read' | 'action-label' | 'toolbar-label' | 'supporting' | 'meta' | 'nav-label';
type Tag = 'span'|'p'|'div'|'h1'|'h2'|'h3'|'h4'|'time';
type Props = Omit<HTMLAttributes<HTMLElement>, 'children'|'className'|'style'> & {roleStyle:TextRole; as?:Tag; tone?:'strong'|'muted'|'quiet'; children:ReactNode; className?:string};
// The caller chooses semantic HTML independently of the visual style.
export function Text({roleStyle,as:Tag='span',tone,children,className='',...props}:Props){return <Tag {...props} data-tone={tone} className={`dj-type dj-type--${roleStyle} ${className}`.trim()}>{children}</Tag>}
export function DiaryContent({body,title}:{body:string;title?:string}) {return <article className="dj-diary-content">{title&&<Text as="h2" roleStyle="entry-title" className="dj-reading-title">{title}</Text>}<Text as="p" roleStyle="diary-read" className="dj-diary-content">{body}</Text></article>}
