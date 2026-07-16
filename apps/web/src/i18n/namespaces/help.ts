// Help module (Phase 2, final batch). Covers ONLY the two pages' own static chrome —
// heading, search, category-filter chip, empty/no-results states, and the topic-detail
// back button + not-found fallback. The actual help-topic article content
// (`topic.title` / `topic.body`) is long-form Spanish copy seeded in the backend
// (`HouseCenter.Api`'s `DatabaseSeeder.cs`, 17 articles) and rendered verbatim from the
// API response — that's data, not UI chrome, and is out of scope here (a separate
// future content-authoring effort covers per-locale articles). Both pages are
// read-only (no mutations), matching the `reports.ts` precedent of not needing a
// caught-API-error display wired up.
export const helpEn = {
  index: {
    title: 'Guides for using HouseCenter',
    subtitle: 'Find out how to do anything on the platform.',
    searchPlaceholder: 'Search the guides…',
    allCategoriesChip: 'All',
    clearFiltersButton: 'Clear filters',
    noResults: 'No guides found for your search or category.',
    empty: 'No help topics available yet.',
  },
  topic: {
    backButton: 'Back to Help',
    notFound: {
      title: 'Topic not found',
      description: "This help article doesn't exist or isn't available for your role.",
    },
  },
  tooltip: {
    ariaLabel: 'Help',
    readMore: 'Read more ›',
  },
}

export const helpEs = {
  index: {
    title: 'Guías para usar HouseCenter',
    subtitle: 'Encontrá cómo hacer cualquier cosa en la plataforma.',
    searchPlaceholder: 'Buscar en las guías…',
    allCategoriesChip: 'Todos',
    clearFiltersButton: 'Limpiar filtros',
    noResults: 'No se encontraron guías para tu búsqueda o categoría.',
    empty: 'Todavía no hay guías de ayuda disponibles.',
  },
  topic: {
    backButton: 'Volver a Ayuda',
    notFound: {
      title: 'Tema no encontrado',
      description: 'Este artículo de ayuda no existe o no está disponible para tu rol.',
    },
  },
  tooltip: {
    ariaLabel: 'Ayuda',
    readMore: 'Leer más ›',
  },
}
