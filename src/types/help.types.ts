export type HelpAudience = 'All' | 'Staff' | 'MemberOrAbove' | 'AdministratorOrAbove'

export interface HelpTopicSummary {
  topicKey: string
  title: string
  summary: string
  category: string
  displayOrder: number
}

export interface HelpTopic extends HelpTopicSummary {
  body: string
  audience: HelpAudience
  updatedDate: string
}
