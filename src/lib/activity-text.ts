type Entry = { action: string; metadata: Record<string, unknown> };

const str = (value: unknown) => (typeof value === "string" ? value : "");

/** Plain-language sentence for an activity log entry, without the actor ("created the page About"). */
export function describeActivity({ action, metadata: m }: Entry): string {
  switch (action) {
    case "site.created":
      return m.template
        ? `created the website “${str(m.name)}” from the ${str(m.template)} template`
        : `created the website “${str(m.name)}”`;
    case "site.updated": {
      const changed = Array.isArray(m.changed) ? (m.changed as string[]) : [];
      if (m.from && m.to) return `changed the web address from ${str(m.from)} to ${str(m.to)}`;
      return changed.length
        ? `updated the website's ${joinList(changed)}`
        : "updated the website settings";
    }
    case "site.published": {
      const titles = Array.isArray(m.pages) ? (m.pages as string[]) : [];
      const parts = [
        ...(titles.length
          ? [titles.length === 1 ? `“${titles[0]}”` : `${titles.length} pages`]
          : []),
        ...(m.design ? ["the site design"] : []),
      ];
      return `published ${joinList(parts)}`;
    }
    case "site.theme_changed":
      return "changed the colors and fonts";
    case "site.menu_changed":
      return "changed the menu or social links";
    case "page.unpublished":
      return `took “${str(m.title)}” off the live website`;
    case "site.design_edited":
      return "edited the header or footer";
    case "page.content_edited":
      return `edited the content of “${str(m.title)}”`;
    case "site.deleted":
      return "deleted the website";
    case "site.restored":
      return "restored the website";
    case "page.created":
      return `added the page “${str(m.title)}”`;
    case "page.updated":
      if (m.fromTitle && m.fromPath) {
        return `renamed “${str(m.fromTitle)}” to “${str(m.title)}” and moved it to ${str(m.toPath)}`;
      }
      if (m.fromTitle) return `renamed “${str(m.fromTitle)}” to “${str(m.title)}”`;
      if (m.fromPath) return `moved “${str(m.title)}” from ${str(m.fromPath)} to ${str(m.toPath)}`;
      return `updated the page “${str(m.title)}”`;
    case "page.duplicated":
      return `duplicated “${str(m.sourceTitle)}” as “${str(m.title)}”`;
    case "page.deleted":
      return `deleted the page “${str(m.title)}”`;
    case "page.restored":
      return `restored the page “${str(m.title)}”`;
    case "page.set_home":
      return m.previousHome
        ? `made “${str(m.title)}” the homepage (replacing “${str(m.previousHome)}”)`
        : `made “${str(m.title)}” the homepage`;
    case "page.nav_changed":
      return m.showInNav
        ? `added “${str(m.title)}” to the menu`
        : `hid “${str(m.title)}” from the menu`;
    case "pages.reordered":
      return "changed the order of pages";
    default:
      return "made a change";
  }
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
