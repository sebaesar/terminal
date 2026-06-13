import { useEffect, useMemo, useRef, useState } from "react";
import { MarkdownBlock } from "@components/MarkdownBlock";
import { blogIndex, BlogPost } from "@data/blogIndex";
import { withBasePath } from "@utils/appRouting";
import { Clock } from "lucide-react";
import { BlogComments } from "./BlogComments";

type BlogPageProps = {
  slug?: string;
};

const BLOG_DESCRIPTION = "Notes by topic on systems, security, automation, and life.";
const BLOG_ENTRANCE_MS = 1500;
const BLOG_TAG_PARAM = "tag";

function normalizeTag(tag?: string | null) {
  return tag?.trim().toLowerCase() || "";
}

function formatTagLabel(tag: string) {
  return tag
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part.trim() || part === "-") return part;
      if (part === "&") return part;
      if (part === "ai") return "AI";
      return `${part[0].toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}

function tagHref(tag: string, activeTag?: string) {
  if (normalizeTag(tag) === activeTag) return withBasePath("/blog/");
  const params = new URLSearchParams({ [BLOG_TAG_PARAM]: normalizeTag(tag) });
  return `${withBasePath("/blog/")}?${params.toString()}`;
}

function BlogReadTime({ minutes }: { minutes: number }) {
  const label = `${minutes} ${minutes === 1 ? "minute" : "minutes"} read`;

  return (
    <span
      className="blog-readTime"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{minutes}'</span>
      <Clock className="blog-readTimeIcon" size={14} strokeWidth={2.2} />
    </span>
  );
}

type BlogTagListProps = {
  activeTag?: string;
  className: string;
  tags: string[];
};

function BlogTagList({ activeTag, className, tags }: BlogTagListProps) {
  const uniqueTags = Array.from(new Set(tags.map(normalizeTag))).filter(Boolean);
  if (!uniqueTags.length) return null;

  return (
    <div className={className} aria-label="Blog topics">
      {uniqueTags.map((tag, index) => {
        const label = formatTagLabel(tag);
        const isActive = tag === activeTag;

        return (
          <span key={tag} className="blog-topicTagItem">
            {index > 0 ? (
              <span className="blog-topicDot" aria-hidden="true">
                ·
              </span>
            ) : null}
            <a
              className={`blog-topicTag${isActive ? " is-active" : ""}`}
              href={tagHref(tag, activeTag)}
              aria-label={
                isActive
                  ? `Clear ${label} topic filter`
                  : `Filter blog posts tagged ${label}`
              }
            >
              {label}
            </a>
          </span>
        );
      })}
    </div>
  );
}

function getActiveTagFromLocation(knownTags: Set<string>) {
  if (typeof window === "undefined") return undefined;

  const tag = normalizeTag(
    new URLSearchParams(window.location.search).get(BLOG_TAG_PARAM),
  );

  return tag && knownTags.has(tag) ? tag : undefined;
}

function setMeta(name: string, content: string) {
  let node = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.name = name;
    document.head.appendChild(node);
  }
  node.content = content;
}

function postHref(post: BlogPost) {
  return withBasePath(`/blog/${encodeURIComponent(post.slug)}/`);
}

type BlogNavigationProps = {
  showBlogLink?: boolean;
};

function BlogNavigation({ showBlogLink = false }: BlogNavigationProps) {
  return (
    <header className="blog-siteHeader" aria-label="Primary">
      <nav className="blog-nav" aria-label="Blog navigation">
        <a className="blog-homeLink" href={withBasePath("/")}>
          Home
        </a>
        {showBlogLink ? (
          <a className="blog-backLink" href={withBasePath("/blog/")}>
            Blog
          </a>
        ) : null}
      </nav>
    </header>
  );
}

type BlogEntranceState = "entering" | "ready" | "idle";

function useBlogEntranceClass(slug?: string) {
  const [entranceState, setEntranceState] =
    useState<BlogEntranceState>("entering");
  const previousSlug = useRef(slug);

  useEffect(() => {
    if (previousSlug.current !== slug) {
      previousSlug.current = slug;
      setEntranceState("idle");
    }
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntranceState("idle");
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setEntranceState("ready");
      });
    });
    const idleTimer = window.setTimeout(() => {
      setEntranceState("idle");
    }, BLOG_ENTRANCE_MS);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(idleTimer);
    };
  }, []);

  return entranceState === "idle"
    ? "blog-page"
    : `blog-page is-${entranceState}`;
}

export default function BlogPage({ slug }: BlogPageProps) {
  const posts = useMemo(() => blogIndex.getAll(), []);
  const knownTags = useMemo(
    () => new Set(blogIndex.listTags().map(({ tag }) => tag)),
    [],
  );
  const activeTag = getActiveTagFromLocation(knownTags);
  const visiblePosts = useMemo(
    () => (activeTag ? blogIndex.filterByTag(activeTag) : posts),
    [activeTag, posts],
  );
  const post = useMemo(
    () => (slug ? blogIndex.findBySlugOrTitle(slug) : undefined),
    [slug],
  );
  const pageClassName = useBlogEntranceClass(slug);
  const title = "Blog | Milad";
  const description = post?.summary || BLOG_DESCRIPTION;

  useEffect(() => {
    document.title = title;
    setMeta("description", description);
  }, [description, title]);

  if (slug && !post) {
    return (
      <main className={pageClassName}>
        <BlogNavigation showBlogLink />
        <header className="blog-header">
          <h1>Post not found</h1>
          <p>
            The requested note is not available.{" "}
            <a className="blog-inlineLink" href={withBasePath("/blog/")}>
              Back to blog
            </a>
            .
          </p>
        </header>
      </main>
    );
  }

  if (post) {
    return (
      <main className={pageClassName}>
        <BlogNavigation showBlogLink />
        <article className="blog-article">
          <header className="blog-articleHeader">
            <h1>{post.title}</h1>
            <div className="blog-meta">
              <BlogTagList className="blog-metaTags" tags={post.tags} />
              <BlogReadTime minutes={post.readingMinutes} />
            </div>
            {post.summary ? <p>{post.summary}</p> : null}
          </header>
          <MarkdownBlock
            segment={{
              type: "markdown",
              markdown: post.body,
              variant: "blog",
            }}
          />
        </article>
        <BlogComments postSlug={post.slug} />
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <BlogNavigation />
      <header className="blog-header">
        <h1>Blog</h1>
        <p>{BLOG_DESCRIPTION}</p>
        {activeTag ? (
          <div className="blog-activeFilter" aria-live="polite">
            <span>Topic: {formatTagLabel(activeTag)}</span>
            <a href={withBasePath("/blog/")}>All topics</a>
          </div>
        ) : null}
      </header>
      <section
        className="blog-list"
        aria-label={
          activeTag
            ? `Blog posts tagged ${formatTagLabel(activeTag)}`
            : "Blog posts"
        }
      >
        {visiblePosts.map((item) => {
          return (
            <article key={item.slug} className="blog-listItem">
              <div className="blog-listItemContent">
                <a className="blog-listBody" href={postHref(item)}>
                  <h2>{item.title}</h2>
                  {item.summary ? <p>{item.summary}</p> : null}
                </a>
                <BlogReadTime minutes={item.readingMinutes} />
              </div>
              <BlogTagList
                activeTag={activeTag}
                className="blog-listTags"
                tags={item.tags}
              />
            </article>
          );
        })}
      </section>
    </main>
  );
}
