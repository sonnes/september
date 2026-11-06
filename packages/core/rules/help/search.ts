/** Finding and grouping the guides of the Help catalog. */

import {
  HELP_CATEGORIES,
  HELP_GUIDES,
  type HelpCategory,
  type HelpGuide,
} from "./catalog.ts";

const GUIDE_BY_SLUG = new Map(HELP_GUIDES.map((guide) => [guide.slug, guide]));

/** Finds one guide for its stable route slug. */
export function helpGuide(slug: string): HelpGuide | undefined {
  return GUIDE_BY_SLUG.get(slug);
}

export interface HelpGuideGroup {
  category: HelpCategory;
  guides: HelpGuide[];
}

/** Groups guides in the order chosen for the Help home. */
export function groupHelpGuides(
  guides: HelpGuide[] = HELP_GUIDES,
): HelpGuideGroup[] {
  return HELP_CATEGORIES.map((category) => ({
    category,
    guides: guides.filter((guide) => guide.category === category.id),
  })).filter((group) => group.guides.length > 0);
}

function searchText(guide: HelpGuide): string {
  return [
    guide.title,
    guide.summary,
    ...guide.keywords,
    ...guide.steps,
    ...(guide.alternatives ?? []).flatMap((task) => [
      task.title,
      ...task.steps,
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

/** Finds guides containing every query word and preserves catalog order. */
export function searchHelpGuides(
  query: string,
  guides: HelpGuide[] = HELP_GUIDES,
): HelpGuide[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return guides;

  return guides.filter((guide) => {
    const searchable = searchText(guide);
    return words.every((word) => searchable.includes(word));
  });
}
