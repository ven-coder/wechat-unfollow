/**
 * 微信探针结果（红米 K50 / 2026-10-25 实测）。
 * 微信版本更新后若 UI 变化，先重跑探针再改这里，不要在 Step 里散落选择器。
 */

export const WECHAT_PACKAGE = 'com.tencent.mm'
export const WECHAT_APP_NAME = '微信'

/** 扫描/取关结束后跳回宿主 */
export const HOST_FALLBACK_PACKAGES = ['com.ven.assistsx.platform', 'com.ven.assistsx']

export const SELECTORS = {
  /** 底部 Tab 文案（四个 Tab 共用 id） */
  tabLabelViewId: 'com.tencent.mm:id/icon_tv',
  tabContactsText: '通讯录',
  /** 通讯录页公众号入口 */
  officialEntryText: '公众号、服务号和企业号',
  /** 公众号列表滚动容器 */
  listViewId: 'com.tencent.mm:id/i3y',
  /** 公众号名称（列表行标题） */
  accountNameViewId: 'com.tencent.mm:id/awx',
  /** 字母分组头 */
  sectionHeaderViewId: 'com.tencent.mm:id/bdd',
  /** 详情页标题（用于校验没点错账号） */
  profileNameViewId: 'com.tencent.mm:id/amj',
  /** 右上角更多 */
  moreInfoViewId: 'com.tencent.mm:id/fs',
  moreInfoDes: '更多信息',
  /** 菜单 / 弹窗文案 */
  unfollowText: '不再关注',
  keepFollowingText: '仍然关注',
} as const

/** 列表底部统计，如「17个公众号和服务号」 */
export const LIST_FOOTER_PATTERN = /^\d+个公众号和服务号$/

/** 兜底到底文案（当前版本未出现，保留） */
export const LIST_BOTTOM_PATTERN = /已显示全部|没有更多/
