// The layer behind a section's content: gradient, image or video plus its overlay. No hooks
// (the video part is a small client component), so it renders in the editor and on live sites.
import { type Backdrop, overlayColor } from "./backdrop";
import { BackgroundVideo } from "./backdrop-video";

export function BackdropLayer({ backdrop, eager }: { backdrop: Backdrop; eager: boolean }) {
  if (backdrop.kind === "gradient") {
    return <div aria-hidden className="sq-backdrop" data-gradient={backdrop.preset} />;
  }
  if (!backdrop.src) return null;
  const overlay = (
    <div className="sq-overlay" style={{ background: overlayColor(backdrop.overlay) }} />
  );

  if (backdrop.kind === "image") {
    return (
      <div aria-hidden className="sq-backdrop">
        <img
          src={backdrop.src}
          alt=""
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          decoding="async"
          style={{ objectPosition: `${backdrop.focal.x * 100}% ${backdrop.focal.y * 100}%` }}
        />
        {overlay}
      </div>
    );
  }

  return (
    <div aria-hidden className="sq-backdrop">
      {backdrop.poster && (
        <img src={backdrop.poster} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
      )}
      <BackgroundVideo src={backdrop.src} poster={backdrop.poster} />
      {overlay}
    </div>
  );
}
