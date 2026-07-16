// `SessionsBarChart.tsx`'s own internal text — kept out of `dashboard.ts` and
// `reports.ts` on purpose because the component is shared by both `DashboardPage.tsx`
// and `ReportsPage.tsx`. Neither caller's namespace should own copy that renders inside
// a component it doesn't fully control, so this gets a small dedicated namespace
// instead (the "extra prop per caller" alternative was more invasive for two call
// sites that already just pass `weeks`). `legend` deliberately abbreviates
// "EducationalReinforcement" to "Educational"/"Educativas" — same shortening the
// component already did before translation (`TYPE_LABELS`) — matched against the raw
// attentionType string with the untranslated type as the i18next `defaultValue`
// fallback, mirroring the original `TYPE_LABELS[t] ?? t`.
export const sessionsChartEn = {
  empty: 'No data for this period.',
  ariaLabel: 'Weekly sessions chart',
  legend: {
    Medical: 'Medical',
    EducationalReinforcement: 'Educational',
  },
}

export const sessionsChartEs = {
  empty: 'No hay datos para este período.',
  ariaLabel: 'Gráfico semanal de sesiones',
  legend: {
    Medical: 'Médicas',
    EducationalReinforcement: 'Educativas',
  },
}
