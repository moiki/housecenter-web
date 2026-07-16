import { domainEn, domainEs } from 'core/i18n/domain'
import { enumsEn, enumsEs } from 'core/i18n/enums'
import { rolesEn, rolesEs } from 'core/i18n/roles'
import { commonEn, commonEs } from 'core/i18n/common'

export { translateErrorCode, errorCodesEn, errorCodesEs } from 'core/i18n/errors'

// Shared i18next resource namespaces, consumed by BOTH apps' own i18next instances —
// there's no single i18next instance across two JS runtimes, only shared resource
// *data*. Each app merges these into its own `resources` tree alongside its
// app-specific namespaces (nav, patients, workRoutes, ...). `errors` (above) is
// deliberately excluded — it's a plain lookup helper, not part of the resource tree,
// since its keys contain literal dots that would collide with i18next's key-separator.
export const coreResources = {
  en: { domain: domainEn, enums: enumsEn, roles: rolesEn, common: commonEn },
  es: { domain: domainEs, enums: enumsEs, roles: rolesEs, common: commonEs },
}
