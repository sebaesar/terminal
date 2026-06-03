import { useEffect, useMemo, useRef, useState } from "react";
import { MarkdownBlock } from "@components/MarkdownBlock";
import { blogIndex, BlogPost } from "@data/blogIndex";
import { withBasePath } from "@utils/appRouting";

type BlogPageProps = {
  slug?: string;
};

const BLOG_DESCRIPTION =
  "FailureSmith notes on reliability, automation risk, execution ownership, and production systems.";
const BLOG_ENTRANCE_MS = 1500;

function formatDate(date?: string) {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
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
  const post = useMemo(
    () => (slug ? blogIndex.findBySlugOrTitle(slug) : undefined),
    [slug],
  );
  const pageClassName = useBlogEntranceClass(slug);
  const title = "Blog | FS.dev";
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
    const writtenAt = formatDate(post.date);

    return (
      <main className={pageClassName}>
        <BlogNavigation showBlogLink />
        <article className="blog-article">
          <header className="blog-articleHeader">
            <h1>{post.title}</h1>
            <div className="blog-meta">
              {writtenAt ? <time dateTime={post.date}>{writtenAt}</time> : null}
              <span>{post.readingMinutes} min read</span>
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
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <BlogNavigation />
      <header className="blog-header">
        <h1>Blog</h1>
        <p>{BLOG_DESCRIPTION}</p>
      </header>
      <section className="blog-list" aria-label="Blog posts">
        {posts.map((item) => {
          const writtenAt = formatDate(item.date);

          return (
            <article key={item.slug} className="blog-listItem">
              <a href={postHref(item)}>
                <h2>{item.title}</h2>
              </a>
              <div className="blog-meta">
                {writtenAt ? <time dateTime={item.date}>{writtenAt}</time> : null}
                <span>{item.readingMinutes} min read</span>
              </div>
              {item.summary ? <p>{item.summary}</p> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
