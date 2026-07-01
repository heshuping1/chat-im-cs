// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get commonConfirm => '确定';

  @override
  String get commonCancel => '取消';

  @override
  String get commonSave => '保存';

  @override
  String get commonEdit => '编辑';

  @override
  String get commonDelete => '删除';

  @override
  String get commonSearch => '搜索';

  @override
  String get commonLoading => '加载中，请稍候';

  @override
  String get commonLoadFailed => '加载失败';

  @override
  String get commonRetry => '重试';

  @override
  String get commonEmpty => '暂无数据';

  @override
  String get commonCopy => '复制';

  @override
  String get commonForward => '转发';

  @override
  String get commonFavorite => '收藏';

  @override
  String get commonClose => '关闭';

  @override
  String get commonSend => '发送';

  @override
  String get commonDone => '完成';

  @override
  String get commonMore => '更多';

  @override
  String get commonSettings => '设置';

  @override
  String get commonCopied => '已复制';

  @override
  String get commonUnknown => '未知';

  @override
  String get commonNotSet => '未设置';

  @override
  String get commonUnbound => '未绑定';

  @override
  String get commonViewAll => '查看全部';

  @override
  String get commonSubmit => '提交';

  @override
  String get commonAdd => '添加';

  @override
  String get commonRemove => '移除';

  @override
  String get commonCreate => '创建';

  @override
  String get commonUpdate => '更新';

  @override
  String get commonUpload => '上传';

  @override
  String get commonShare => '分享';

  @override
  String get commonBlock => '拉黑';

  @override
  String get commonUnblock => '取消拉黑';

  @override
  String get commonMute => '免打扰';

  @override
  String get commonUnmute => '取消免打扰';

  @override
  String get commonPin => '置顶';

  @override
  String get commonUnpin => '取消置顶';

  @override
  String get commonMarkRead => '标为已读';

  @override
  String get commonMarkUnread => '标为未读';

  @override
  String get commonOnline => '在线';

  @override
  String get commonOffline => '离线';

  @override
  String get commonOperationFailed => '操作失败，请重试';

  @override
  String get commonNetworkError => '网络错误，请检查网络连接';

  @override
  String get navMessages => '消息';

  @override
  String get navContacts => '通讯录';

  @override
  String get navMe => '我';

  @override
  String get authLoginTitle => '登录微界';

  @override
  String get authTabMobile => '手机号';

  @override
  String get authTabEmail => '邮箱';

  @override
  String get authTabLoginName => '微界号';

  @override
  String get authHintMobile => '请输入手机号';

  @override
  String get authHintEmail => '请输入邮箱';

  @override
  String get authHintPassword => '请输入密码';

  @override
  String get authHintCode => '请输入验证码';

  @override
  String get authHintLoginName => '请输入微界号（lpp_xxxxxxxx）';

  @override
  String get authLoginButton => '登录 / 注册';

  @override
  String get authGetCode => '获取验证码';

  @override
  String authResendCode(int seconds) {
    return '${seconds}s 后重发';
  }

  @override
  String get authUsePassword => '使用密码登录';

  @override
  String get authUseCode => '使用验证码登录';

  @override
  String get authAgreementPrefix => '我已阅读并同意';

  @override
  String get authAgreementAnd => '和';

  @override
  String get authTermsLink => '《用户协议》';

  @override
  String get authPrivacyLink => '《隐私政策》';

  @override
  String get authCaptchaTitle => '安全验证';

  @override
  String get authCaptchaHint => '请输入答案';

  @override
  String get authCaptchaFailed => '获取验证码失败，请重试';

  @override
  String get authErrorEmptyCode => '请输入验证码';

  @override
  String get authErrorEmptyPassword => '请输入密码';

  @override
  String get authErrorEmptyLoginName => '请输入微界号';

  @override
  String get authErrorWrongCredentials => '账号或密码错误';

  @override
  String get authDeactivatingTitle => '账号注销中';

  @override
  String get authDeactivatingContent =>
      '您的账号正处于注销冷静期（7天内）。\n\n如需撤销注销，请点击「撤销注销」；否则点击「继续使用」进入应用。';

  @override
  String get authContinueUse => '继续使用';

  @override
  String get authCancelDeactivation => '撤销注销';

  @override
  String get authDeactivationCancelled => '注销已撤销，账号恢复正常';

  @override
  String get authDeactivationCancelFailed => '撤销失败，请重试';

  @override
  String get authLogout => '退出登录';

  @override
  String get authLogoutConfirm => '确定要退出登录吗？';

  @override
  String get authSendingCode => '发送中...';

  @override
  String get authCodeSent => '验证码已发送';

  @override
  String get authLoginFailed => '登录失败，请重试';

  @override
  String get authRegisterFailed => '注册失败，请重试';

  @override
  String get authEnterpriseCode => '企业码';

  @override
  String get authEnterpriseCodeHint => '请输入企业码';

  @override
  String get authPendingApproval => '注册成功，加入企业申请已提交，等待审批';

  @override
  String get homeTitle => '消息';

  @override
  String get homeGatewayConnectingTitle => '连接中';

  @override
  String get homePersonalSpace => '个人空间';

  @override
  String get homeOfficialService => '官方服务空间';

  @override
  String get homeSwitchSpace => '切换空间';

  @override
  String get homeSpaceSubtitle => '个人空间 · 企业空间';

  @override
  String get homeJoinEnterprise => '加入企业';

  @override
  String get homeCreateGroup => '发起群聊';

  @override
  String get homeAddFriend => '添加朋友';

  @override
  String get homeScan => '扫一扫';

  @override
  String get homeJoinNewSpace => '加入新空间';

  @override
  String get homeSearchConversation => '搜索对话';

  @override
  String get homeNoMessages => '暂无消息';

  @override
  String get homeDeleteConversation => '删除会话';

  @override
  String get homeDeleteConversationConfirm => '确定要删除该会话吗？聊天记录将被清空。';

  @override
  String get homePersonalNote => '我（个人笔记）';

  @override
  String get homeWorkNote => '我（工作笔记）';

  @override
  String homeConversationCount(int count) {
    return '$count 条会话';
  }

  @override
  String homeUnreadCount(int count) {
    return '$count 条未读';
  }

  @override
  String get chatInputHint => '输入消息...';

  @override
  String get chatVoiceHint => '按住说话';

  @override
  String get chatVoiceRelease => '松开发送';

  @override
  String get chatVoiceCancel => '上滑取消';

  @override
  String get chatMenuCopy => '复制';

  @override
  String get chatMenuForward => '转发';

  @override
  String get chatMenuRecall => '撤回';

  @override
  String get chatMenuDelete => '删除';

  @override
  String get chatMenuFavorite => '收藏';

  @override
  String get chatMenuReply => '引用';

  @override
  String get chatMenuMultiSelect => '多选';

  @override
  String get chatMenuTranslate => '翻译';

  @override
  String get chatMenuVoiceToText => '转文字';

  @override
  String get chatStatusRecalled => '消息已撤回';

  @override
  String get chatRecallSuccess => '已撤回';

  @override
  String get chatRecallFailed => '撤回失败';

  @override
  String get chatRecallTimeout => '超过2分钟的消息无法撤回';

  @override
  String get chatTranslateFailed => '翻译失败，请重试';

  @override
  String get chatTranslateNotConfigured => '翻译服务暂未开放';

  @override
  String get chatVoiceToTextFailed => '转文字失败，请重试';

  @override
  String get chatForwardSuccess => '已转发';

  @override
  String get chatForwardFailed => '转发失败，请重试';

  @override
  String get chatNoConversations => '没有可转发的会话';

  @override
  String get chatSendFailed => '发送失败';

  @override
  String get chatResend => '重新发送';

  @override
  String get chatNotFriend => '对方不是你的好友';

  @override
  String get chatNotFriendHint => '你还不是对方的好友，暂时无法发送消息';

  @override
  String get chatMutedHint => '全员禁言中';

  @override
  String get chatFileUploadFailed => '文件上传失败，请重试';

  @override
  String get chatFileStatusNotDownloaded => '未下载';

  @override
  String get chatFileStatusDownloaded => '已下载';

  @override
  String get chatFileStatusUploading => '上传中';

  @override
  String get chatFileStatusUploadFailed => '上传失败';

  @override
  String get chatCardSendFailed => '名片发送失败';

  @override
  String get chatFavoriteSuccess => '已收藏';

  @override
  String get chatFavoriteFailed => '收藏失败';

  @override
  String get chatLoadFailed => '加载失败';

  @override
  String get chatImageMessage => '[图片]';

  @override
  String get chatVoiceMessage => '[语音]';

  @override
  String get chatVideoMessage => '[视频]';

  @override
  String get chatFileMessage => '[文件]';

  @override
  String get chatLocationMessage => '[位置]';

  @override
  String get chatContactCardMessage => '[名片]';

  @override
  String get chatCallLogMessage => '[通话记录]';

  @override
  String chatGroupMemberCount(int count) {
    return '($count)';
  }

  @override
  String chatReadCount(int count) {
    return '已读 $count 人';
  }

  @override
  String get chatUnread => '未读';

  @override
  String get chatRecalledSelf => '你撤回了一条消息';

  @override
  String chatRecalledPeer(String sender) {
    return '$sender撤回了一条消息';
  }

  @override
  String chatTranslationPrefix(String translation) {
    return '翻译：$translation';
  }

  @override
  String get chatMessageDeleted => '消息已被删除';

  @override
  String get chatPeer => '对方';

  @override
  String get chatSelf => '我';

  @override
  String get chatGenericMessage => '[消息]';

  @override
  String get chatVoiceHideText => '隐藏文字';

  @override
  String get chatVoiceShowText => '转文字';

  @override
  String get chatFileDefaultName => '文件';

  @override
  String get chatContactDefaultName => '联系人';

  @override
  String get chatContactCardTitle => '个人名片';

  @override
  String get chatCallMissed => '未接听';

  @override
  String get chatCallCancelled => '已取消';

  @override
  String get chatCallRejected => '已拒接';

  @override
  String get chatCallDisconnected => '连接中断';

  @override
  String get chatCallEnded => '通话已结束';

  @override
  String get chatCallFailed => '通话失败';

  @override
  String chatCallDuration(String duration) {
    return '通话时长 $duration';
  }

  @override
  String get chatVideoCallTitle => '视频通话';

  @override
  String get chatVoiceCallTitle => '语音通话';

  @override
  String get chatToolPhotos => '照片';

  @override
  String get chatToolCamera => '拍摄';

  @override
  String get chatToolFile => '文件';

  @override
  String get chatToolLocation => '位置';

  @override
  String get chatToolContactCard => '名片';

  @override
  String get chatToolVoiceCall => '语音通话';

  @override
  String get chatToolVideoCall => '视频通话';

  @override
  String get chatToolFavorites => '收藏';

  @override
  String get chatFileTooLarge => '文件大小超过限制（100 MB）';

  @override
  String get chatInputMutedAdminOnly => '已开启仅群主或特定成员可发言';

  @override
  String get chatImageUploadUnsupported => '图片上传失败，服务端暂不支持，请联系管理员';

  @override
  String get chatFavoriteLongPressHint => '请长按消息进行收藏';

  @override
  String chatSelectedCount(int count) {
    return '已选择 $count 条';
  }

  @override
  String get chatLocationSheetTitle => '发送位置';

  @override
  String get chatLocationNameLabel => '地点名称';

  @override
  String get chatLocationNameHint => '例如：公司、客户地址';

  @override
  String get chatLocationAddressLabel => '详细地址';

  @override
  String get chatLocationOptionalHint => '选填';

  @override
  String get chatLocationLatitudeLabel => '纬度';

  @override
  String get chatLocationLatitudeHint => '-90 到 90';

  @override
  String get chatLocationLongitudeLabel => '经度';

  @override
  String get chatLocationLongitudeHint => '-180 到 180';

  @override
  String chatLocationValidationRequired(String label) {
    return '请输入$label';
  }

  @override
  String chatLocationValidationRange(String label) {
    return '$label范围不正确';
  }

  @override
  String get chatLocationDefaultTitle => '位置';

  @override
  String get chatMutedFullNotice => '该群已开启已开启仅群主或特定成员可发言';

  @override
  String get chatNotFriendSendBlocked => '你已不是对方好友，无法发送消息';

  @override
  String get chatPersonalNotesTitle => '个人笔记';

  @override
  String get chatWorkNotesTitle => '工作笔记';

  @override
  String get chatPersonalNotesDescription => '在这里记录个人想法、保存重要信息\n跨设备同步，随时随地访问';

  @override
  String get chatWorkNotesDescription => '在这里记录工作事项、保存工作资料\n团队空间独立，信息安全隔离';

  @override
  String get chatNoMessages => '暂无消息';

  @override
  String chatReplyTo(String sender) {
    return '回复 $sender';
  }

  @override
  String chatFeatureComingSoon(String feature) {
    return '$feature 功能即将上线';
  }

  @override
  String get chatForwardSelectTitle => '选择聊天';

  @override
  String get chatContactSelectTitle => '选择联系人';

  @override
  String get chatNoContacts => '暂无联系人';

  @override
  String get contactsTitle => '通讯录';

  @override
  String get contactsSearch => '搜索联系人';

  @override
  String get contactsNewFriends => '新的朋友';

  @override
  String get contactsGroups => '群聊';

  @override
  String get contactsFavorites => '收藏';

  @override
  String get contactsRecent => '最近联系';

  @override
  String get contactsOrganization => '组织架构';

  @override
  String get contactsAnnouncement => '企业公告';

  @override
  String get contactsNewApplications => '新的申请';

  @override
  String get contactsCustomerGroups => '客户群组';

  @override
  String get contactsAllCustomers => '所有客户';

  @override
  String get contactsMyCustomers => '我的客户';

  @override
  String get contactsViewAll => '查看全部';

  @override
  String get contactsMyContacts => '我的联系人';

  @override
  String get contactsMyAdvisor => '我的专属顾问';

  @override
  String get contactsNoAdvisor => '暂未分配专属顾问';

  @override
  String get contactsAdvisorLoading => '加载中，请稍候';

  @override
  String get contactsNavigateFailed => '跳转失败，请重试';

  @override
  String get contactsEmpty => '暂无联系人';

  @override
  String get contactsNoAnnouncement => '暂无公告';

  @override
  String get contactsOfficialBadge => '官方';

  @override
  String get contactsCustomerBadge => '客户';

  @override
  String get contactsEmptyCustomers => '暂无客户';

  @override
  String get myTitle => '我';

  @override
  String get myEnterpriseInfo => '企业信息';

  @override
  String get myEnterpriseManage => '企业管理';

  @override
  String get myQrCode => '二维码名片';

  @override
  String get myFavorites => '收藏';

  @override
  String get myLanguage => '系统语言';

  @override
  String get myTimezone => '时区';

  @override
  String get myAutoTranslate => '自动翻译';

  @override
  String get myNetworkSwitch => '线路切换';

  @override
  String get mySettings => '设置';

  @override
  String get myLogout => '退出登录';

  @override
  String get myLogoutConfirm => '确定要退出登录吗？';

  @override
  String get myLeaveEnterprise => '退出企业';

  @override
  String get myLeaveEnterpriseConfirm => '确定要退出该企业吗？退出后将无法访问企业数据。';

  @override
  String get myLeaveEnterpriseSuccess => '已退出企业';

  @override
  String get myLeaveEnterpriseFailed => '退出失败，请重试';

  @override
  String get myLppIdCopied => '微界号已复制';

  @override
  String myLppIdLabel(String lppId) {
    return '微界号：$lppId';
  }

  @override
  String myFriendCount(int count) {
    return '$count 个朋友';
  }

  @override
  String get myAutoSelect => '自动选择';

  @override
  String get myPresenceStatus => '在线状态';

  @override
  String get myPresenceStatusTitle => '设置在线状态';

  @override
  String get myPresenceOnline => '在线';

  @override
  String get myPresenceBusy => '忙碌';

  @override
  String get myPresenceAway => '离开';

  @override
  String get myPresenceInvisible => '隐身';

  @override
  String get profileTitle => '个人资料';

  @override
  String get profileName => '名字';

  @override
  String get profileGender => '性别';

  @override
  String get profileBirthday => '生日';

  @override
  String get profileRegion => '地区';

  @override
  String get profileSignature => '签名';

  @override
  String get profileSignatureHint => '介绍一下自己';

  @override
  String get profileTapTapText => '拍一拍';

  @override
  String get profileTapTapHint => '拍一拍时显示的文案（最多20字）';

  @override
  String get profileAccountSection => '账号';

  @override
  String get profileBasicSection => '基本信息';

  @override
  String get profileLppId => '微界号';

  @override
  String get profileLppIdNotSet => '未设置';

  @override
  String get profileMobile => '手机号';

  @override
  String get profileMobileUnbound => '未绑定';

  @override
  String get profileEmail => '邮箱';

  @override
  String get profileEmailUnbound => '未绑定';

  @override
  String get profileQrCode => '我的二维码';

  @override
  String get profileChangePassword => '修改密码';

  @override
  String get profileGenderMale => '男';

  @override
  String get profileGenderFemale => '女';

  @override
  String get profileGenderOther => '其他';

  @override
  String get profileGenderUnset => '未设置';

  @override
  String get profileSaveFailed => '保存失败，请重试';

  @override
  String get profileLppIdTitle => '微界号';

  @override
  String get profileLppIdSetOnce => '微界号设置后只能修改一次，请谨慎填写';

  @override
  String get profileLppIdChangeFailed => '修改失败（微界号只能修改一次）';

  @override
  String get profileChangePasswordOld => '旧密码';

  @override
  String get profileChangePasswordNew => '新密码';

  @override
  String get profileChangePasswordConfirm => '确认新密码';

  @override
  String get profileChangePasswordMismatch => '两次密码不一致';

  @override
  String get profileChangePasswordSuccess => '密码修改成功，请重新登录';

  @override
  String get profileChangePasswordFailed => '密码修改失败，请重试';

  @override
  String get settingsTitle => '设置';

  @override
  String get settingsSectionEnterprise => '企业';

  @override
  String get settingsSectionAccount => '账号';

  @override
  String get settingsSectionGeneral => '通用';

  @override
  String get settingsSectionFeatures => '功能';

  @override
  String get settingsSectionAbout => '关于';

  @override
  String get settingsEnterpriseInfo => '企业信息';

  @override
  String get settingsProfile => '个人资料';

  @override
  String get settingsAccountSecurity => '账号安全';

  @override
  String get settingsNotification => '通知';

  @override
  String get settingsDisplay => '界面与显示';

  @override
  String get settingsFriendPrivacy => '朋友权限';

  @override
  String get settingsChat => '聊天';

  @override
  String get settingsChatHistory => '聊天记录管理';

  @override
  String get settingsAbout => '关于微界';

  @override
  String get settingsLanguage => '系统语言';

  @override
  String get settingsTimezone => '时区';

  @override
  String get settingsAutoTranslate => '自动翻译';

  @override
  String get settingsNetworkSwitch => '线路切换';

  @override
  String get enterpriseInfoTitle => '企业信息';

  @override
  String get enterpriseName => '企业名称';

  @override
  String get enterpriseDescription => '企业简介';

  @override
  String get enterpriseUpdateSuccess => '更新成功';

  @override
  String get enterpriseUpdateFailed => '更新失败，请重试';

  @override
  String get enterpriseLeave => '退出企业';

  @override
  String get enterpriseLeaveConfirm => '确定要退出该企业吗？';

  @override
  String get enterpriseLeaveSuccess => '已退出企业';

  @override
  String get enterpriseLeaveFailed => '退出失败，请重试';

  @override
  String get enterpriseLeaveOwnerError => '所有者不能直接退出，请先转让所有者权限';

  @override
  String get enterpriseMemberCount => '成员数';

  @override
  String get enterpriseCreatedAt => '创建时间';

  @override
  String get enterpriseCode => '企业码';

  @override
  String get enterpriseInviteMembers => '邀请成员';

  @override
  String get enterpriseCopyInviteCode => '复制邀请码';

  @override
  String get enterpriseInviteCodeCopied => '邀请码已复制';

  @override
  String get groupCreateTitle => '发起群聊';

  @override
  String get groupNameHint => '请输入群名称';

  @override
  String get groupCreateSuccess => '群聊创建成功';

  @override
  String get groupCreateFailed => '群聊创建失败';

  @override
  String get groupSettings => '群聊设置';

  @override
  String get groupName => '群名称';

  @override
  String get groupAvatar => '群头像';

  @override
  String get groupAnnouncement => '群公告';

  @override
  String get groupMembers => '群成员';

  @override
  String get groupAddMember => '添加成员';

  @override
  String get groupRemoveMember => '移除成员';

  @override
  String get groupRemoveMemberConfirm => '确定要移除该成员吗？';

  @override
  String get groupSetAdmin => '设为管理员';

  @override
  String get groupRemoveAdmin => '取消管理员';

  @override
  String get groupTransferOwner => '转让群主';

  @override
  String get groupTransferOwnerConfirm => '确定要将群主转让给该成员吗？';

  @override
  String get groupTransferOwnerSuccess => '群主已转让';

  @override
  String get groupTransferOwnerFailed => '转让失败，请重试';

  @override
  String get groupLeave => '退出群聊';

  @override
  String get groupLeaveConfirm => '确定要退出该群聊吗？';

  @override
  String get groupLeaveSuccess => '已退出群聊';

  @override
  String get groupLeaveFailed => '退出失败，请重试';

  @override
  String get groupDissolve => '解散群聊';

  @override
  String get groupDissolveConfirm => '确定要解散该群聊吗？解散后所有成员将被移除。';

  @override
  String get groupDissolveSuccess => '群聊已解散';

  @override
  String get groupDissolveFailed => '解散失败，请重试';

  @override
  String get groupQrCode => '群二维码';

  @override
  String get groupMuteAll => '全员禁言';

  @override
  String get groupMuteAllOn => '开启全员禁言';

  @override
  String get groupMuteAllOff => '关闭全员禁言';

  @override
  String get groupAllowMemberInvite => '允许成员邀请';

  @override
  String get groupAllowMemberModifyTitle => '允许成员修改群名';

  @override
  String get groupAllowMemberAtAll => '允许成员@所有人';

  @override
  String get groupAllowMemberViewMemberList => '允许成员查看成员列表';

  @override
  String get groupAllowQrCodeJoin => '允许二维码加入';

  @override
  String get groupRequireApproval => '加群需要审批';

  @override
  String get groupAllowMemberAddFriend => '允许群成员互加好友';

  @override
  String get groupRoleOwner => '群主';

  @override
  String get groupRoleAdmin => '管理员';

  @override
  String get groupRoleMember => '成员';

  @override
  String get groupNoMembers => '暂无成员';

  @override
  String get groupNoAnnouncements => '暂无公告';

  @override
  String get groupCreateAnnouncement => '发布公告';

  @override
  String get groupEditAnnouncement => '编辑公告';

  @override
  String get groupDeleteAnnouncement => '删除公告';

  @override
  String get groupDeleteAnnouncementConfirm => '确定要删除该公告吗？';

  @override
  String get groupAnnouncementTitle => '公告标题';

  @override
  String get groupAnnouncementContent => '公告内容';

  @override
  String get groupAnnouncementPin => '置顶公告';

  @override
  String groupMemberCount(int count) {
    return '$count 人';
  }

  @override
  String groupSelectedCount(int count) {
    return '已选 $count 人';
  }

  @override
  String get groupJoinRequestApprove => '同意';

  @override
  String get groupJoinRequestReject => '拒绝';

  @override
  String get groupJoinRequests => '入群申请';

  @override
  String get groupNoJoinRequests => '暂无入群申请';

  @override
  String get groupReadReceipts => '消息已读回执';

  @override
  String groupReadCount(int count) {
    return '$count 人已读';
  }

  @override
  String groupUnreadCount(int count) {
    return '$count 人未读';
  }

  @override
  String get friendAddTitle => '添加朋友';

  @override
  String get friendSearchHint => '手机号 / 邮箱 / 微界号';

  @override
  String get friendRequestSent => '已发送好友申请';

  @override
  String get friendRequestFailed => '发送失败，请重试';

  @override
  String get friendAlreadyFriend => '你们已经是好友了';

  @override
  String get friendNewFriendsTitle => '新的朋友';

  @override
  String get friendNoRequests => '暂无好友申请';

  @override
  String get friendAccept => '接受';

  @override
  String get friendReject => '拒绝';

  @override
  String get friendAccepted => '已接受';

  @override
  String get friendRejected => '已拒绝';

  @override
  String get friendDeleteConfirm => '确定要删除该好友吗？';

  @override
  String get friendDeleteSuccess => '已删除好友';

  @override
  String get friendDeleteFailed => '删除失败，请重试';

  @override
  String get friendRemarkName => '备注名';

  @override
  String get friendGroupName => '分组';

  @override
  String get friendSendMessage => '发消息';

  @override
  String get friendMatchTypeLppId => '微界号匹配';

  @override
  String get friendMatchTypeMobile => '手机号匹配';

  @override
  String get friendMatchTypeEmail => '邮箱匹配';

  @override
  String get friendSearchEmpty => '未找到相关用户';

  @override
  String get friendAddMessage => '请求添加你为好友';

  @override
  String get friendBlockConfirm => '确定要拉黑该用户吗？';

  @override
  String get friendUnblockConfirm => '确定要取消拉黑吗？';

  @override
  String get friendBlockSuccess => '已拉黑';

  @override
  String get friendUnblockSuccess => '已取消拉黑';

  @override
  String get profilePageTitle => '个人信息';

  @override
  String get profilePageSendMessage => '发消息';

  @override
  String get profilePageAddFriend => '加好友';

  @override
  String get profilePageAlreadyFriend => '已是好友';

  @override
  String get profilePageBlocked => '已拉黑';

  @override
  String get profilePageBlock => '拉黑';

  @override
  String get profilePageUnblock => '取消拉黑';

  @override
  String get profilePageHidden => '该用户已设置不对外展示资料';

  @override
  String get profilePageFriendsOnly => '该用户仅对好友展示资料';

  @override
  String get profilePageLppId => '微界号';

  @override
  String get profilePageRemarkName => '备注';

  @override
  String get profilePageEditRemark => '修改备注';

  @override
  String get profilePageSaveRemarkSuccess => '备注已保存';

  @override
  String get profilePageSaveRemarkFailed => '保存失败，请重试';

  @override
  String get searchTitle => '搜索';

  @override
  String get searchHint => '输入完整手机号、邮箱或微界号搜索';

  @override
  String get searchNoResults => '未找到相关结果';

  @override
  String get searchMessages => '消息';

  @override
  String get searchUsers => '用户';

  @override
  String get searchFailed => '搜索失败，请重试';

  @override
  String get scanTitle => '扫一扫';

  @override
  String get scanFailed => '识别失败，请重试';

  @override
  String get scanInvalidQrCode => '无效的二维码';

  @override
  String get scanFlashOn => '打开手电筒';

  @override
  String get scanFlashOff => '关闭手电筒';

  @override
  String get scanAlbum => '从相册选择';

  @override
  String get favoritesTitle => '收藏';

  @override
  String get favoritesEmpty => '暂无收藏';

  @override
  String get favoritesAll => '全部';

  @override
  String get favoritesText => '文字';

  @override
  String get favoritesImage => '图片';

  @override
  String get favoritesVideo => '视频';

  @override
  String get favoritesVoice => '语音';

  @override
  String get favoritesFile => '文件';

  @override
  String get favoritesOther => '其他';

  @override
  String get favoritesDeleteConfirm => '确定要取消收藏吗？';

  @override
  String get favoritesDeleteSuccess => '已取消收藏';

  @override
  String get favoritesDeleteFailed => '取消收藏失败';

  @override
  String get favoritesOriginalRecalled => '消息已撤回';

  @override
  String get favoritesViewOriginal => '查看原消息';

  @override
  String get favoritesSearchHint => '搜索收藏内容';

  @override
  String get favoritesNoResults => '没有找到相关收藏';

  @override
  String get noticeTitle => '企业公告';

  @override
  String get noticeEmpty => '暂无公告';

  @override
  String get noticeDetail => '公告详情';

  @override
  String get noticePublishedAt => '发布时间';

  @override
  String get noticePriorityNormal => '普通';

  @override
  String get noticePriorityImportant => '重要';

  @override
  String get noticePriorityUrgent => '紧急';

  @override
  String get organizationTitle => '组织架构';

  @override
  String get organizationEmpty => '暂无部门信息';

  @override
  String get organizationMembers => '成员';

  @override
  String get organizationDepartment => '部门';

  @override
  String get organizationPosition => '职位';

  @override
  String get organizationLeader => '负责人';

  @override
  String get qrCodeTitle => '我的二维码';

  @override
  String get qrCodeSave => '保存到相册';

  @override
  String get qrCodeShare => '分享';

  @override
  String get qrCodeSaveSuccess => '已保存到相册';

  @override
  String get qrCodeSaveFailed => '保存失败，请重试';

  @override
  String get qrCodeRefresh => '刷新二维码';

  @override
  String get qrCodeExpired => '二维码已过期，请刷新';

  @override
  String get qrCodeScanToAdd => '扫一扫上面的二维码，添加我为好友';

  @override
  String get spacePersonal => '个人空间';

  @override
  String get spaceEnterprise => '企业空间';

  @override
  String get spaceJoinByCode => '通过企业码加入';

  @override
  String get spaceJoinByInvite => '通过邀请码加入';

  @override
  String get spaceEnterCode => '请输入企业码';

  @override
  String get spaceEnterInviteCode => '请输入邀请码';

  @override
  String get spaceSearchEnterprise => '搜索企业';

  @override
  String get spaceJoinRequestSent => '申请已提交，等待审批';

  @override
  String get spaceJoinRequestPending => '申请审批中';

  @override
  String get spaceJoinRequestApproved => '申请已通过';

  @override
  String get spaceJoinRequestRejected => '申请已拒绝';

  @override
  String get spaceAlreadyMember => '你已经是该企业成员';

  @override
  String get spaceAutoApproved => '已自动通过，欢迎加入';

  @override
  String get spacePendingApprovalHint => '注册成功，加入企业申请已提交，等待审批';

  @override
  String get spaceNoSpaces => '暂无空间';

  @override
  String get spaceInviteExpired => '邀请码已过期';

  @override
  String get spaceInviteTargetMismatch => '该邀请码不适用于你的账号';

  @override
  String get spaceAcceptInviteSuccess => '已成功加入企业';

  @override
  String get spaceAcceptInviteFailed => '加入失败，请重试';

  @override
  String get spaceTenantSelectTitle => '选择空间';

  @override
  String get spaceTenantSelectHint => '请选择要进入的空间';

  @override
  String get spaceEnterPersonal => '进入个人空间';

  @override
  String get spaceEnterEnterprise => '进入企业空间';

  @override
  String get aboutTitle => '关于微界';

  @override
  String get aboutVersion => '版本';

  @override
  String get aboutTerms => '用户协议';

  @override
  String get aboutPrivacy => '隐私政策';

  @override
  String get aboutOpenSource => '开源许可';

  @override
  String get aboutCheckUpdate => '检查更新';

  @override
  String get aboutLatestVersion => '已是最新版本';

  @override
  String get aboutUpdateAvailable => '发现新版本';

  @override
  String get aboutUpdateNow => '立即更新';

  @override
  String get aboutUpdateLater => '稍后再说';

  @override
  String get notificationTitle => '通知';

  @override
  String get notificationGlobalMute => '全局静音';

  @override
  String get notificationSound => '声音';

  @override
  String get notificationVibration => '振动';

  @override
  String get notificationPreview => '通知预览';

  @override
  String get notificationDndStart => '免打扰开始时间';

  @override
  String get notificationDndEnd => '免打扰结束时间';

  @override
  String get blacklistTitle => '黑名单';

  @override
  String get blacklistEmpty => '黑名单为空';

  @override
  String get blacklistRemove => '移出黑名单';

  @override
  String get blacklistRemoveConfirm => '确定要将该用户移出黑名单吗？';

  @override
  String get feedbackTitle => '意见反馈';

  @override
  String get feedbackTypeComplaint => '投诉';

  @override
  String get feedbackTypeSuggestion => '建议';

  @override
  String get feedbackTypeBug => 'Bug 报告';

  @override
  String get feedbackContent => '反馈内容';

  @override
  String get feedbackContentHint => '请详细描述您的问题或建议';

  @override
  String get feedbackContact => '联系方式（选填）';

  @override
  String get feedbackSubmit => '提交';

  @override
  String get feedbackSuccess => '反馈已提交，感谢您的建议';

  @override
  String get feedbackFailed => '提交失败，请重试';

  @override
  String get networkTitle => '线路切换';

  @override
  String get networkAutoSelect => '自动选择';

  @override
  String get networkManual => '手动选择';

  @override
  String get timezoneTitle => '时区';

  @override
  String get timezoneAuto => '跟随系统';

  @override
  String get autoTranslateTitle => '自动翻译';

  @override
  String get autoTranslateEnabled => '开启自动翻译';

  @override
  String get autoTranslateLanguage => '翻译目标语言';

  @override
  String get displayTitle => '界面与显示';

  @override
  String get displayFontSize => '字体大小';

  @override
  String get displayChatBackground => '聊天背景';

  @override
  String get displayDarkMode => '深色模式';

  @override
  String get displayDarkModeSystem => '跟随系统';

  @override
  String get displayDarkModeSystemHint => '根据系统设置自动切换';

  @override
  String get displayDarkModeOff => '浅色模式';

  @override
  String get displayDarkModeOffHint => '始终使用浅色主题';

  @override
  String get displayDarkModeOn => '深色模式';

  @override
  String get displayDarkModeOnHint => '始终使用深色主题';

  @override
  String get chatSettingsTitle => '聊天';

  @override
  String get chatHistoryTitle => '聊天记录管理';

  @override
  String get chatHistoryClear => '清空聊天记录';

  @override
  String get chatHistoryClearConfirm => '确定要清空所有聊天记录吗？此操作不可恢复。';

  @override
  String get chatHistoryClearSuccess => '聊天记录已清空';

  @override
  String get accountSecurityTitle => '账号安全';

  @override
  String get accountSecurityChangePassword => '修改密码';

  @override
  String get accountSecurityChangeMobile => '更换手机号';

  @override
  String get accountSecurityChangeEmail => '更换邮箱';

  @override
  String get accountSecurityLoggedDevices => '已登录设备';

  @override
  String get accountSecurityDeactivate => '注销账号';

  @override
  String get accountSecurityDeactivateConfirm => '注销账号后，所有数据将在7天后永久删除，确定要注销吗？';

  @override
  String get loggedDevicesTitle => '已登录设备';

  @override
  String get loggedDevicesCurrent => '当前设备';

  @override
  String get loggedDevicesRevoke => '退出该设备';

  @override
  String get loggedDevicesRevokeConfirm => '确定要退出该设备吗？';

  @override
  String get loggedDevicesRevokeSuccess => '已退出该设备';

  @override
  String get loggedDevicesRevokeFailed => '退出失败，请重试';

  @override
  String get loggedDevicesLastActive => '最后活跃';

  @override
  String get loggedDevicesTypeIos => 'iOS';

  @override
  String get loggedDevicesTypeAndroid => 'Android';

  @override
  String get loggedDevicesTypeWeb => '网页端';

  @override
  String get loggedDevicesTypeDesktop => '桌面端';

  @override
  String get loggedDevicesTypeUnknown => '未知设备';

  @override
  String get privacySettingsTitle => '朋友权限';

  @override
  String get privacySearchableByMobile => '允许通过手机号搜索';

  @override
  String get privacySearchableByLppId => '允许通过微界号搜索';

  @override
  String get privacyAllowFriendRequest => '加我为好友';

  @override
  String get privacyProfileVisibility => '个人资料可见性';

  @override
  String get privacyEveryone => '所有人';

  @override
  String get privacyFriendsOfFriends => '有共同好友的人';

  @override
  String get privacyNobody => '不允许';

  @override
  String get privacyFriendsOnly => '仅好友';

  @override
  String get privacySaveSuccess => '设置已保存';

  @override
  String get privacySaveFailed => '保存失败，请重试';

  @override
  String get fontSizeTitle => '字体大小';

  @override
  String get fontSizeSmall => '小';

  @override
  String get fontSizeNormal => '标准';

  @override
  String get fontSizeLarge => '大';

  @override
  String get fontSizeExtraLarge => '超大';

  @override
  String get fontSizePreview => '字体预览';

  @override
  String get chatBackgroundTitle => '聊天背景';

  @override
  String get chatBackgroundDefault => '默认';

  @override
  String get chatBackgroundCustom => '自定义';

  @override
  String get chatBackgroundReset => '恢复默认';

  @override
  String get termsTitle => '用户协议';

  @override
  String get privacyPolicyTitle => '隐私政策';

  @override
  String get recentContactsTitle => '最近联系';

  @override
  String get recentContactsEmpty => '暂无最近联系人';

  @override
  String get inviteFriendsTitle => '邀请朋友';

  @override
  String get inviteFriendsCopyLink => '复制邀请链接';

  @override
  String get inviteFriendsLinkCopied => '邀请链接已复制';

  @override
  String get imageViewerTitle => '图片';

  @override
  String get imageViewerSave => '保存到相册';

  @override
  String get imageViewerSaveSuccess => '已保存到相册';

  @override
  String get imageViewerSaveFailed => '保存失败，请重试';

  @override
  String get customerServiceTitle => '客服工作台';

  @override
  String get customerServiceQueue => '排队中';

  @override
  String get customerServiceActive => '服务中';

  @override
  String get customerServiceClaim => '接入';

  @override
  String get customerServiceTakeover => '接管';

  @override
  String get customerServiceClose => '结束服务';

  @override
  String get customerServiceCloseConfirm => '确定要结束该服务吗？';

  @override
  String get customerServiceNoQueue => '暂无排队';

  @override
  String get customerServiceNoActive => '暂无进行中的服务';

  @override
  String get customerServiceVisitor => '访客';

  @override
  String get customerServiceCustomer => '客户';

  @override
  String get customerServiceAssignedTo => '负责客服';

  @override
  String get customerServiceTransferConversation => '转交会话';

  @override
  String get marketingToolbar => '营销工具';

  @override
  String get callIncoming => '来电';

  @override
  String get callOutgoing => '去电';

  @override
  String get callAccept => '接听';

  @override
  String get callReject => '拒绝';

  @override
  String get callHangup => '挂断';

  @override
  String get callMissed => '未接来电';

  @override
  String get callDuration => '通话时长';

  @override
  String get callAudio => '语音通话';

  @override
  String get callVideo => '视频通话';

  @override
  String get callConnecting => '连接中...';

  @override
  String get callRinging => '等待接听...';

  @override
  String get callEnded => '通话已结束';

  @override
  String get callFailed => '通话失败';

  @override
  String get callRejected => '对方已拒绝';

  @override
  String get callTimeout => '对方无应答';

  @override
  String get callCancelled => '已取消';

  @override
  String get pendingJoinRequestsTitle => '新的申请';

  @override
  String get pendingJoinRequestsEmpty => '暂无申请';

  @override
  String get pendingJoinRequestApprove => '同意';

  @override
  String get pendingJoinRequestReject => '拒绝';

  @override
  String get pendingJoinRequestApproveSuccess => '已同意申请';

  @override
  String get pendingJoinRequestRejectSuccess => '已拒绝申请';

  @override
  String get pendingJoinRequestFailed => '操作失败，请重试';

  @override
  String get myCustomersTitle => '我的客户';

  @override
  String get myCustomersEmpty => '暂无客户';

  @override
  String get groupListTitle => '群聊列表';

  @override
  String get groupListEmpty => '暂无群聊';

  @override
  String get addFriendTitle => '添加朋友';

  @override
  String get addFriendSearchHint => '手机号 / 邮箱 / 微界号';

  @override
  String addFriendLppIdLabel(String lppId) {
    return '微界号：$lppId';
  }

  @override
  String get addFriendButton => '加好友';

  @override
  String get addFriendCannotAddSelf => '不能添加自己';

  @override
  String get addFriendUnsupportedUser => '当前用户不支持添加好友，可直接发消息';

  @override
  String get addFriendMessageHint => '请输入验证消息';

  @override
  String get addFriendSendRequest => '发送申请';

  @override
  String get joinCompanyTitle => '加入企业';

  @override
  String get joinCompanyCodeHint => '请输入企业码';

  @override
  String get joinCompanySearchHint => '搜索企业名称';

  @override
  String get joinCompanyApply => '申请加入';

  @override
  String get joinCompanyApplySuccess => '申请已提交';

  @override
  String get joinCompanyApplyFailed => '申请失败，请重试';

  @override
  String get joinCompanyAutoApproved => '已自动通过，欢迎加入';

  @override
  String get joinCompanyPending => '申请已提交，等待审批';

  @override
  String get joinCompanyInviteCodeHint => '请输入邀请码';

  @override
  String get joinCompanyAcceptInvite => '接受邀请';

  @override
  String get joinCompanyNoResults => '未找到相关企业';

  @override
  String joinCompanyMemberCount(int count) {
    return '$count 名成员';
  }

  @override
  String get timezoneNameHawaii => '夏威夷';

  @override
  String get timezoneNameAlaska => '阿拉斯加';

  @override
  String get timezoneNamePacificTime => '太平洋时间';

  @override
  String get timezoneNameMountainTime => '山地时间';

  @override
  String get timezoneNameCentralTime => '中部时间';

  @override
  String get timezoneNameEasternTime => '东部时间';

  @override
  String get timezoneNameAtlanticTime => '大西洋时间';

  @override
  String get timezoneNameBrasilia => '巴西利亚';

  @override
  String get timezoneNameAzores => '亚速尔群岛';

  @override
  String get timezoneNameLondonDublin => '伦敦/都柏林';

  @override
  String get timezoneNameBerlinParisRome => '柏林/巴黎/罗马';

  @override
  String get timezoneNameCairoHelsinki => '开罗/赫尔辛基';

  @override
  String get timezoneNameMoscowRiyadh => '莫斯科/利雅得';

  @override
  String get timezoneNameTehran => '德黑兰';

  @override
  String get timezoneNameDubaiBaku => '迪拜/巴库';

  @override
  String get timezoneNameKabul => '喀布尔';

  @override
  String get timezoneNameKarachiTashkent => '卡拉奇/塔什干';

  @override
  String get timezoneNameMumbaiNewDelhi => '孟买/新德里';

  @override
  String get timezoneNameKathmandu => '加德满都';

  @override
  String get timezoneNameDhakaAlmaty => '达卡/阿拉木图';

  @override
  String get timezoneNameYangon => '仰光';

  @override
  String get timezoneNameBangkokHanoiJakarta => '曼谷/河内/雅加达';

  @override
  String get timezoneNameBeijingShanghaiHongKongTaipei => '北京/上海/香港/台北';

  @override
  String get timezoneNameTokyoSeoul => '东京/首尔';

  @override
  String get timezoneNameAdelaide => '阿德莱德';

  @override
  String get timezoneNameSydneyMelbourne => '悉尼/墨尔本';

  @override
  String get timezoneNameSolomonIslands => '所罗门群岛';

  @override
  String get timezoneNameAucklandFiji => '奥克兰/斐济';

  @override
  String get networkSmartSelectBestRoute => '智能选择最优线路';

  @override
  String get networkTesting => '测试中...';

  @override
  String get networkTestingShort => '测试中';

  @override
  String networkLatencyMs(int ms) {
    return '延迟 ${ms}ms';
  }

  @override
  String get networkConnectionMode => '连接模式';

  @override
  String get networkDirectMode => '直连模式';

  @override
  String get networkProxyMode => '代理模式';

  @override
  String get networkDirectModeDesc => '直接连接服务器';

  @override
  String get networkProxyModeDesc => '通过代理服务器连接';

  @override
  String get networkDirectRoutes => '直连线路';

  @override
  String get networkProxyRoutes => '代理线路';

  @override
  String get networkTestAll => '测试全部';

  @override
  String get networkChinaTelecom => '中国电信';

  @override
  String get networkChinaUnicom => '中国联通';

  @override
  String get networkChinaMobile => '中国移动';

  @override
  String get networkHongKongNode => '香港节点';

  @override
  String get networkSingaporeNode => '新加坡节点';

  @override
  String get networkJapanNode => '日本节点';

  @override
  String get networkUnitedStatesNode => '美国节点';

  @override
  String get networkHint =>
      '提示：\n• 直连模式：速度快，适合国内使用\n• 代理模式：稳定性高，适合跨境通信\n• 点击刷新图标可测试单个线路延迟';
}

/// The translations for Chinese, as used in Taiwan (`zh_TW`).
class AppLocalizationsZhTw extends AppLocalizationsZh {
  AppLocalizationsZhTw() : super('zh_TW');

  @override
  String get commonConfirm => '確定';

  @override
  String get commonCancel => '取消';

  @override
  String get commonSave => '儲存';

  @override
  String get commonEdit => '編輯';

  @override
  String get commonDelete => '刪除';

  @override
  String get commonSearch => '搜尋';

  @override
  String get commonLoading => '載入中，請稍候';

  @override
  String get commonLoadFailed => '載入失敗';

  @override
  String get commonRetry => '重試';

  @override
  String get commonEmpty => '暫無資料';

  @override
  String get commonCopy => '複製';

  @override
  String get commonForward => '轉傳';

  @override
  String get commonFavorite => '收藏';

  @override
  String get commonClose => '關閉';

  @override
  String get commonSend => '傳送';

  @override
  String get commonDone => '完成';

  @override
  String get commonMore => '更多';

  @override
  String get commonSettings => '設定';

  @override
  String get commonCopied => '已複製';

  @override
  String get commonUnknown => '未知';

  @override
  String get commonNotSet => '未設定';

  @override
  String get commonUnbound => '未綁定';

  @override
  String get commonViewAll => '查看全部';

  @override
  String get commonSubmit => '提交';

  @override
  String get commonAdd => '新增';

  @override
  String get commonRemove => '移除';

  @override
  String get commonCreate => '建立';

  @override
  String get commonUpdate => '更新';

  @override
  String get commonUpload => '上傳';

  @override
  String get commonShare => '分享';

  @override
  String get commonBlock => '封鎖';

  @override
  String get commonUnblock => '解除封鎖';

  @override
  String get commonMute => '靜音';

  @override
  String get commonUnmute => '取消靜音';

  @override
  String get commonPin => '置頂';

  @override
  String get commonUnpin => '取消置頂';

  @override
  String get commonMarkRead => '標為已讀';

  @override
  String get commonMarkUnread => '標為未讀';

  @override
  String get commonOnline => '線上';

  @override
  String get commonOffline => '離線';

  @override
  String get commonOperationFailed => '操作失敗，請重試';

  @override
  String get commonNetworkError => '網路錯誤，請檢查網路連線';

  @override
  String get navMessages => '訊息';

  @override
  String get navContacts => '通訊錄';

  @override
  String get navMe => '我';

  @override
  String get authLoginTitle => '登入微界';

  @override
  String get authTabMobile => '手機號';

  @override
  String get authTabEmail => '電子郵件';

  @override
  String get authTabLoginName => '微界號';

  @override
  String get authHintMobile => '請輸入手機號';

  @override
  String get authHintEmail => '請輸入電子郵件';

  @override
  String get authHintPassword => '請輸入密碼';

  @override
  String get authHintCode => '請輸入驗證碼';

  @override
  String get authHintLoginName => '請輸入微界號（lpp_xxxxxxxx）';

  @override
  String get authLoginButton => '登入 / 註冊';

  @override
  String get authGetCode => '取得驗證碼';

  @override
  String authResendCode(int seconds) {
    return '${seconds}s 後重新發送';
  }

  @override
  String get authUsePassword => '使用密碼登入';

  @override
  String get authUseCode => '使用驗證碼登入';

  @override
  String get authAgreementPrefix => '我已閱讀並同意';

  @override
  String get authAgreementAnd => '和';

  @override
  String get authTermsLink => '《使用者協議》';

  @override
  String get authPrivacyLink => '《隱私政策》';

  @override
  String get authCaptchaTitle => '安全驗證';

  @override
  String get authCaptchaHint => '請輸入答案';

  @override
  String get authCaptchaFailed => '取得驗證碼失敗，請重試';

  @override
  String get authErrorEmptyCode => '請輸入驗證碼';

  @override
  String get authErrorEmptyPassword => '請輸入密碼';

  @override
  String get authErrorEmptyLoginName => '請輸入微界號';

  @override
  String get authErrorWrongCredentials => '帳號或密碼錯誤';

  @override
  String get authDeactivatingTitle => '帳號登出中';

  @override
  String get authDeactivatingContent =>
      '您的帳號正處於登出冷靜期（7天內）。\n\n如需撤銷登出，請點擊「撤銷登出」；否則點擊「繼續使用」進入應用程式。';

  @override
  String get authContinueUse => '繼續使用';

  @override
  String get authCancelDeactivation => '撤銷登出';

  @override
  String get authDeactivationCancelled => '登出已撤銷，帳號恢復正常';

  @override
  String get authDeactivationCancelFailed => '撤銷失敗，請重試';

  @override
  String get authLogout => '登出';

  @override
  String get authLogoutConfirm => '確定要登出嗎？';

  @override
  String get authSendingCode => '傳送中...';

  @override
  String get authCodeSent => '驗證碼已傳送';

  @override
  String get authLoginFailed => '登入失敗，請重試';

  @override
  String get authRegisterFailed => '註冊失敗，請重試';

  @override
  String get authEnterpriseCode => '企業碼';

  @override
  String get authEnterpriseCodeHint => '請輸入企業碼';

  @override
  String get authPendingApproval => '註冊成功，加入企業申請已提交，等待審核';

  @override
  String get homeTitle => '訊息';

  @override
  String get homeGatewayConnectingTitle => '連線中';

  @override
  String get homePersonalSpace => '個人空間';

  @override
  String get homeOfficialService => '官方服務空間';

  @override
  String get homeSwitchSpace => '切換空間';

  @override
  String get homeSpaceSubtitle => '個人空間 · 企業空間';

  @override
  String get homeJoinEnterprise => '加入企業';

  @override
  String get homeCreateGroup => '發起群組';

  @override
  String get homeAddFriend => '新增朋友';

  @override
  String get homeScan => '掃一掃';

  @override
  String get homeJoinNewSpace => '加入新空間';

  @override
  String get homeSearchConversation => '搜尋對話';

  @override
  String get homeNoMessages => '暫無訊息';

  @override
  String get homeDeleteConversation => '刪除對話';

  @override
  String get homeDeleteConversationConfirm => '確定要刪除該對話嗎？聊天記錄將被清空。';

  @override
  String get homePersonalNote => '我（個人筆記）';

  @override
  String get homeWorkNote => '我（工作筆記）';

  @override
  String homeConversationCount(int count) {
    return '$count 條對話';
  }

  @override
  String homeUnreadCount(int count) {
    return '$count 條未讀';
  }

  @override
  String get chatInputHint => '輸入訊息...';

  @override
  String get chatVoiceHint => '按住說話';

  @override
  String get chatVoiceRelease => '放開傳送';

  @override
  String get chatVoiceCancel => '上滑取消';

  @override
  String get chatMenuCopy => '複製';

  @override
  String get chatMenuForward => '轉傳';

  @override
  String get chatMenuRecall => '收回';

  @override
  String get chatMenuDelete => '刪除';

  @override
  String get chatMenuFavorite => '收藏';

  @override
  String get chatMenuReply => '引用';

  @override
  String get chatMenuMultiSelect => '多選';

  @override
  String get chatMenuTranslate => '翻譯';

  @override
  String get chatMenuVoiceToText => '轉文字';

  @override
  String get chatStatusRecalled => '訊息已收回';

  @override
  String get chatRecallSuccess => '已收回';

  @override
  String get chatRecallFailed => '收回失敗';

  @override
  String get chatRecallTimeout => '超過2分鐘的訊息無法收回';

  @override
  String get chatTranslateFailed => '翻譯失敗，請重試';

  @override
  String get chatTranslateNotConfigured => '翻譯服務暫未開放';

  @override
  String get chatVoiceToTextFailed => '轉文字失敗，請重試';

  @override
  String get chatForwardSuccess => '已轉傳';

  @override
  String get chatForwardFailed => '轉傳失敗，請重試';

  @override
  String get chatNoConversations => '沒有可轉傳的對話';

  @override
  String get chatSendFailed => '傳送失敗';

  @override
  String get chatResend => '重新傳送';

  @override
  String get chatNotFriend => '對方不是你的好友';

  @override
  String get chatNotFriendHint => '你還不是對方的好友，暫時無法傳送訊息';

  @override
  String get chatMutedHint => '全員禁言中';

  @override
  String get chatFileUploadFailed => '檔案上傳失敗，請重試';

  @override
  String get chatFileStatusNotDownloaded => '未下載';

  @override
  String get chatFileStatusDownloaded => '已下載';

  @override
  String get chatFileStatusUploading => '上傳中';

  @override
  String get chatFileStatusUploadFailed => '上傳失敗';

  @override
  String get chatCardSendFailed => '名片傳送失敗';

  @override
  String get chatFavoriteSuccess => '已收藏';

  @override
  String get chatFavoriteFailed => '收藏失敗';

  @override
  String get chatLoadFailed => '載入失敗';

  @override
  String get chatImageMessage => '[圖片]';

  @override
  String get chatVoiceMessage => '[語音]';

  @override
  String get chatVideoMessage => '[影片]';

  @override
  String get chatFileMessage => '[檔案]';

  @override
  String get chatLocationMessage => '[位置]';

  @override
  String get chatContactCardMessage => '[名片]';

  @override
  String get chatCallLogMessage => '[通話記錄]';

  @override
  String chatGroupMemberCount(int count) {
    return '($count)';
  }

  @override
  String chatReadCount(int count) {
    return '已讀 $count 人';
  }

  @override
  String get chatUnread => '未讀';

  @override
  String get chatRecalledSelf => '你收回了一則訊息';

  @override
  String chatRecalledPeer(String sender) {
    return '$sender收回了一則訊息';
  }

  @override
  String chatTranslationPrefix(String translation) {
    return '翻譯：$translation';
  }

  @override
  String get chatMessageDeleted => '訊息已被刪除';

  @override
  String get chatPeer => '對方';

  @override
  String get chatSelf => '我';

  @override
  String get chatGenericMessage => '[訊息]';

  @override
  String get chatVoiceHideText => '隱藏文字';

  @override
  String get chatVoiceShowText => '轉文字';

  @override
  String get chatFileDefaultName => '檔案';

  @override
  String get chatContactDefaultName => '聯絡人';

  @override
  String get chatContactCardTitle => '個人名片';

  @override
  String get chatCallMissed => '未接聽';

  @override
  String get chatCallCancelled => '已取消';

  @override
  String get chatCallRejected => '已拒接';

  @override
  String get chatCallDisconnected => '連線中斷';

  @override
  String get chatCallEnded => '通話已結束';

  @override
  String get chatCallFailed => '通話失敗';

  @override
  String chatCallDuration(String duration) {
    return '通話時長 $duration';
  }

  @override
  String get chatVideoCallTitle => '視訊通話';

  @override
  String get chatVoiceCallTitle => '語音通話';

  @override
  String get chatToolPhotos => '照片';

  @override
  String get chatToolCamera => '拍攝';

  @override
  String get chatToolFile => '檔案';

  @override
  String get chatToolLocation => '位置';

  @override
  String get chatToolContactCard => '名片';

  @override
  String get chatToolVoiceCall => '語音通話';

  @override
  String get chatToolVideoCall => '視訊通話';

  @override
  String get chatToolFavorites => '收藏';

  @override
  String get chatFileTooLarge => '檔案大小超過限制（100 MB）';

  @override
  String get chatInputMutedAdminOnly => '已開啟僅群主或特定成員可發言';

  @override
  String get chatImageUploadUnsupported => '圖片上傳失敗，服務端暫不支援，請聯絡管理員';

  @override
  String get chatFavoriteLongPressHint => '請長按訊息進行收藏';

  @override
  String chatSelectedCount(int count) {
    return '已選擇 $count 則';
  }

  @override
  String get chatLocationSheetTitle => '傳送位置';

  @override
  String get chatLocationNameLabel => '地點名稱';

  @override
  String get chatLocationNameHint => '例如：公司、客戶地址';

  @override
  String get chatLocationAddressLabel => '詳細地址';

  @override
  String get chatLocationOptionalHint => '選填';

  @override
  String get chatLocationLatitudeLabel => '緯度';

  @override
  String get chatLocationLatitudeHint => '-90 到 90';

  @override
  String get chatLocationLongitudeLabel => '經度';

  @override
  String get chatLocationLongitudeHint => '-180 到 180';

  @override
  String chatLocationValidationRequired(String label) {
    return '請輸入$label';
  }

  @override
  String chatLocationValidationRange(String label) {
    return '$label範圍不正確';
  }

  @override
  String get chatLocationDefaultTitle => '位置';

  @override
  String get chatMutedFullNotice => '該群已開啟已開啟僅群主或特定成員可發言';

  @override
  String get chatNotFriendSendBlocked => '你已不是對方好友，無法傳送訊息';

  @override
  String get chatPersonalNotesTitle => '個人筆記';

  @override
  String get chatWorkNotesTitle => '工作筆記';

  @override
  String get chatPersonalNotesDescription => '在這裡記錄個人想法、保存重要資訊\n跨裝置同步，隨時隨地存取';

  @override
  String get chatWorkNotesDescription => '在這裡記錄工作事項、保存工作資料\n團隊空間獨立，資訊安全隔離';

  @override
  String get chatNoMessages => '暫無訊息';

  @override
  String chatReplyTo(String sender) {
    return '回覆 $sender';
  }

  @override
  String chatFeatureComingSoon(String feature) {
    return '$feature 功能即將上線';
  }

  @override
  String get chatForwardSelectTitle => '選擇聊天';

  @override
  String get chatContactSelectTitle => '選擇聯絡人';

  @override
  String get chatNoContacts => '暫無聯絡人';

  @override
  String get contactsTitle => '通訊錄';

  @override
  String get contactsSearch => '搜尋聯絡人';

  @override
  String get contactsNewFriends => '新的朋友';

  @override
  String get contactsGroups => '群組';

  @override
  String get contactsFavorites => '收藏';

  @override
  String get contactsRecent => '最近聯絡';

  @override
  String get contactsOrganization => '組織架構';

  @override
  String get contactsAnnouncement => '企業公告';

  @override
  String get contactsNewApplications => '新的申請';

  @override
  String get contactsCustomerGroups => '客戶群組';

  @override
  String get contactsAllCustomers => '所有客戶';

  @override
  String get contactsMyCustomers => '我的客戶';

  @override
  String get contactsViewAll => '查看全部';

  @override
  String get contactsMyContacts => '我的聯絡人';

  @override
  String get contactsMyAdvisor => '我的專屬顧問';

  @override
  String get contactsNoAdvisor => '暫未分配專屬顧問';

  @override
  String get contactsAdvisorLoading => '載入中，請稍候';

  @override
  String get contactsNavigateFailed => '跳轉失敗，請重試';

  @override
  String get contactsEmpty => '暫無聯絡人';

  @override
  String get contactsNoAnnouncement => '暫無公告';

  @override
  String get contactsOfficialBadge => '官方';

  @override
  String get contactsCustomerBadge => '客戶';

  @override
  String get contactsEmptyCustomers => '暫無客戶';

  @override
  String get myTitle => '我';

  @override
  String get myEnterpriseInfo => '企業資訊';

  @override
  String get myEnterpriseManage => '企業管理';

  @override
  String get myQrCode => '二維碼名片';

  @override
  String get myFavorites => '收藏';

  @override
  String get myLanguage => '系統語言';

  @override
  String get myTimezone => '時區';

  @override
  String get myAutoTranslate => '自動翻譯';

  @override
  String get myNetworkSwitch => '線路切換';

  @override
  String get mySettings => '設定';

  @override
  String get myLogout => '登出';

  @override
  String get myLogoutConfirm => '確定要登出嗎？';

  @override
  String get myLeaveEnterprise => '退出企業';

  @override
  String get myLeaveEnterpriseConfirm => '確定要退出該企業嗎？退出後將無法存取企業資料。';

  @override
  String get myLeaveEnterpriseSuccess => '已退出企業';

  @override
  String get myLeaveEnterpriseFailed => '退出失敗，請重試';

  @override
  String get myLppIdCopied => '微界號已複製';

  @override
  String myLppIdLabel(String lppId) {
    return '微界號：$lppId';
  }

  @override
  String myFriendCount(int count) {
    return '$count 個朋友';
  }

  @override
  String get myAutoSelect => '自動選擇';

  @override
  String get myPresenceStatus => '線上狀態';

  @override
  String get myPresenceStatusTitle => '設定線上狀態';

  @override
  String get myPresenceOnline => '線上';

  @override
  String get myPresenceBusy => '忙碌';

  @override
  String get myPresenceAway => '離開';

  @override
  String get myPresenceInvisible => '隱身';

  @override
  String get profileTitle => '個人資料';

  @override
  String get profileName => '名字';

  @override
  String get profileGender => '性別';

  @override
  String get profileBirthday => '生日';

  @override
  String get profileRegion => '地區';

  @override
  String get profileSignature => '簽名';

  @override
  String get profileSignatureHint => '介紹一下自己';

  @override
  String get profileTapTapText => '拍一拍';

  @override
  String get profileTapTapHint => '拍一拍時顯示的文案（最多20字）';

  @override
  String get profileAccountSection => '帳號';

  @override
  String get profileBasicSection => '基本資訊';

  @override
  String get profileLppId => '微界號';

  @override
  String get profileLppIdNotSet => '未設定';

  @override
  String get profileMobile => '手機號';

  @override
  String get profileMobileUnbound => '未綁定';

  @override
  String get profileEmail => '電子郵件';

  @override
  String get profileEmailUnbound => '未綁定';

  @override
  String get profileQrCode => '我的二維碼';

  @override
  String get profileChangePassword => '修改密碼';

  @override
  String get profileGenderMale => '男';

  @override
  String get profileGenderFemale => '女';

  @override
  String get profileGenderOther => '其他';

  @override
  String get profileGenderUnset => '未設定';

  @override
  String get profileSaveFailed => '儲存失敗，請重試';

  @override
  String get profileLppIdTitle => '微界號';

  @override
  String get profileLppIdSetOnce => '微界號設定後只能修改一次，請謹慎填寫';

  @override
  String get profileLppIdChangeFailed => '修改失敗（微界號只能修改一次）';

  @override
  String get profileChangePasswordOld => '舊密碼';

  @override
  String get profileChangePasswordNew => '新密碼';

  @override
  String get profileChangePasswordConfirm => '確認新密碼';

  @override
  String get profileChangePasswordMismatch => '兩次密碼不一致';

  @override
  String get profileChangePasswordSuccess => '密碼修改成功，請重新登入';

  @override
  String get profileChangePasswordFailed => '密碼修改失敗，請重試';

  @override
  String get settingsTitle => '設定';

  @override
  String get settingsSectionEnterprise => '企業';

  @override
  String get settingsSectionAccount => '帳號';

  @override
  String get settingsSectionGeneral => '一般';

  @override
  String get settingsSectionFeatures => '功能';

  @override
  String get settingsSectionAbout => '關於';

  @override
  String get settingsEnterpriseInfo => '企業資訊';

  @override
  String get settingsProfile => '個人資料';

  @override
  String get settingsAccountSecurity => '帳號安全';

  @override
  String get settingsNotification => '通知';

  @override
  String get settingsDisplay => '介面與顯示';

  @override
  String get settingsFriendPrivacy => '朋友權限';

  @override
  String get settingsChat => '聊天';

  @override
  String get settingsChatHistory => '聊天記錄管理';

  @override
  String get settingsAbout => '關於微界';

  @override
  String get settingsLanguage => '系統語言';

  @override
  String get settingsTimezone => '時區';

  @override
  String get settingsAutoTranslate => '自動翻譯';

  @override
  String get settingsNetworkSwitch => '線路切換';

  @override
  String get enterpriseInfoTitle => '企業資訊';

  @override
  String get enterpriseName => '企業名稱';

  @override
  String get enterpriseDescription => '企業簡介';

  @override
  String get enterpriseUpdateSuccess => '更新成功';

  @override
  String get enterpriseUpdateFailed => '更新失敗，請重試';

  @override
  String get enterpriseLeave => '退出企業';

  @override
  String get enterpriseLeaveConfirm => '確定要退出該企業嗎？';

  @override
  String get enterpriseLeaveSuccess => '已退出企業';

  @override
  String get enterpriseLeaveFailed => '退出失敗，請重試';

  @override
  String get enterpriseLeaveOwnerError => '所有者不能直接退出，請先轉讓所有者權限';

  @override
  String get enterpriseMemberCount => '成員數';

  @override
  String get enterpriseCreatedAt => '建立時間';

  @override
  String get enterpriseCode => '企業碼';

  @override
  String get enterpriseInviteMembers => '邀請成員';

  @override
  String get enterpriseCopyInviteCode => '複製邀請碼';

  @override
  String get enterpriseInviteCodeCopied => '邀請碼已複製';

  @override
  String get groupCreateTitle => '發起群組';

  @override
  String get groupNameHint => '請輸入群組名稱';

  @override
  String get groupCreateSuccess => '群組建立成功';

  @override
  String get groupCreateFailed => '群組建立失敗';

  @override
  String get groupSettings => '群組設定';

  @override
  String get groupName => '群組名稱';

  @override
  String get groupAvatar => '群組頭像';

  @override
  String get groupAnnouncement => '群組公告';

  @override
  String get groupMembers => '群組成員';

  @override
  String get groupAddMember => '新增成員';

  @override
  String get groupRemoveMember => '移除成員';

  @override
  String get groupRemoveMemberConfirm => '確定要移除該成員嗎？';

  @override
  String get groupSetAdmin => '設為管理員';

  @override
  String get groupRemoveAdmin => '取消管理員';

  @override
  String get groupTransferOwner => '轉讓群主';

  @override
  String get groupTransferOwnerConfirm => '確定要將群主轉讓給該成員嗎？';

  @override
  String get groupTransferOwnerSuccess => '群主已轉讓';

  @override
  String get groupTransferOwnerFailed => '轉讓失敗，請重試';

  @override
  String get groupLeave => '退出群組';

  @override
  String get groupLeaveConfirm => '確定要退出該群組嗎？';

  @override
  String get groupLeaveSuccess => '已退出群組';

  @override
  String get groupLeaveFailed => '退出失敗，請重試';

  @override
  String get groupDissolve => '解散群組';

  @override
  String get groupDissolveConfirm => '確定要解散該群組嗎？解散後所有成員將被移除。';

  @override
  String get groupDissolveSuccess => '群組已解散';

  @override
  String get groupDissolveFailed => '解散失敗，請重試';

  @override
  String get groupQrCode => '群組二維碼';

  @override
  String get groupMuteAll => '全員禁言';

  @override
  String get groupMuteAllOn => '開啟全員禁言';

  @override
  String get groupMuteAllOff => '關閉全員禁言';

  @override
  String get groupAllowMemberInvite => '允許成員邀請';

  @override
  String get groupAllowMemberModifyTitle => '允許成員修改群組名稱';

  @override
  String get groupAllowMemberAtAll => '允許成員@所有人';

  @override
  String get groupAllowMemberViewMemberList => '允許成員查看成員列表';

  @override
  String get groupAllowQrCodeJoin => '允許二維碼加入';

  @override
  String get groupRequireApproval => '加入群組需要審核';

  @override
  String get groupAllowMemberAddFriend => '允許群組成員互加好友';

  @override
  String get groupRoleOwner => '群主';

  @override
  String get groupRoleAdmin => '管理員';

  @override
  String get groupRoleMember => '成員';

  @override
  String get groupNoMembers => '暫無成員';

  @override
  String get groupNoAnnouncements => '暫無公告';

  @override
  String get groupCreateAnnouncement => '發布公告';

  @override
  String get groupEditAnnouncement => '編輯公告';

  @override
  String get groupDeleteAnnouncement => '刪除公告';

  @override
  String get groupDeleteAnnouncementConfirm => '確定要刪除該公告嗎？';

  @override
  String get groupAnnouncementTitle => '公告標題';

  @override
  String get groupAnnouncementContent => '公告內容';

  @override
  String get groupAnnouncementPin => '置頂公告';

  @override
  String groupMemberCount(int count) {
    return '$count 人';
  }

  @override
  String groupSelectedCount(int count) {
    return '已選 $count 人';
  }

  @override
  String get groupJoinRequestApprove => '同意';

  @override
  String get groupJoinRequestReject => '拒絕';

  @override
  String get groupJoinRequests => '入群申請';

  @override
  String get groupNoJoinRequests => '暫無入群申請';

  @override
  String get groupReadReceipts => '訊息已讀回執';

  @override
  String groupReadCount(int count) {
    return '$count 人已讀';
  }

  @override
  String groupUnreadCount(int count) {
    return '$count 人未讀';
  }

  @override
  String get friendAddTitle => '新增朋友';

  @override
  String get friendSearchHint => '手機號 / 電子郵件 / 微界號';

  @override
  String get friendRequestSent => '已傳送好友申請';

  @override
  String get friendRequestFailed => '傳送失敗，請重試';

  @override
  String get friendAlreadyFriend => '你們已經是好友了';

  @override
  String get friendNewFriendsTitle => '新的朋友';

  @override
  String get friendNoRequests => '暫無好友申請';

  @override
  String get friendAccept => '接受';

  @override
  String get friendReject => '拒絕';

  @override
  String get friendAccepted => '已接受';

  @override
  String get friendRejected => '已拒絕';

  @override
  String get friendDeleteConfirm => '確定要刪除該好友嗎？';

  @override
  String get friendDeleteSuccess => '已刪除好友';

  @override
  String get friendDeleteFailed => '刪除失敗，請重試';

  @override
  String get friendRemarkName => '備註名稱';

  @override
  String get friendGroupName => '分組';

  @override
  String get friendSendMessage => '傳送訊息';

  @override
  String get friendMatchTypeLppId => '微界號匹配';

  @override
  String get friendMatchTypeMobile => '手機號匹配';

  @override
  String get friendMatchTypeEmail => '電子郵件匹配';

  @override
  String get friendSearchEmpty => '未找到相關使用者';

  @override
  String get friendAddMessage => '請求新增你為好友';

  @override
  String get friendBlockConfirm => '確定要封鎖該使用者嗎？';

  @override
  String get friendUnblockConfirm => '確定要解除封鎖嗎？';

  @override
  String get friendBlockSuccess => '已封鎖';

  @override
  String get friendUnblockSuccess => '已解除封鎖';

  @override
  String get profilePageTitle => '個人資訊';

  @override
  String get profilePageSendMessage => '傳送訊息';

  @override
  String get profilePageAddFriend => '加好友';

  @override
  String get profilePageAlreadyFriend => '已是好友';

  @override
  String get profilePageBlocked => '已封鎖';

  @override
  String get profilePageBlock => '封鎖';

  @override
  String get profilePageUnblock => '解除封鎖';

  @override
  String get profilePageHidden => '該使用者已設定不對外展示資料';

  @override
  String get profilePageFriendsOnly => '該使用者僅對好友展示資料';

  @override
  String get profilePageLppId => '微界號';

  @override
  String get profilePageRemarkName => '備註';

  @override
  String get profilePageEditRemark => '修改備註';

  @override
  String get profilePageSaveRemarkSuccess => '備註已儲存';

  @override
  String get profilePageSaveRemarkFailed => '儲存失敗，請重試';

  @override
  String get searchTitle => '搜尋';

  @override
  String get searchHint => '輸入完整手機號、電子郵件或微界號搜尋';

  @override
  String get searchNoResults => '未找到相關結果';

  @override
  String get searchMessages => '訊息';

  @override
  String get searchUsers => '使用者';

  @override
  String get searchFailed => '搜尋失敗，請重試';

  @override
  String get scanTitle => '掃一掃';

  @override
  String get scanFailed => '識別失敗，請重試';

  @override
  String get scanInvalidQrCode => '無效的二維碼';

  @override
  String get scanFlashOn => '開啟手電筒';

  @override
  String get scanFlashOff => '關閉手電筒';

  @override
  String get scanAlbum => '從相簿選擇';

  @override
  String get favoritesTitle => '收藏';

  @override
  String get favoritesEmpty => '暫無收藏';

  @override
  String get favoritesAll => '全部';

  @override
  String get favoritesText => '文字';

  @override
  String get favoritesImage => '圖片';

  @override
  String get favoritesVideo => '影片';

  @override
  String get favoritesVoice => '語音';

  @override
  String get favoritesFile => '檔案';

  @override
  String get favoritesOther => '其他';

  @override
  String get favoritesDeleteConfirm => '確定要取消收藏嗎？';

  @override
  String get favoritesDeleteSuccess => '已取消收藏';

  @override
  String get favoritesDeleteFailed => '取消收藏失敗';

  @override
  String get favoritesOriginalRecalled => '訊息已收回';

  @override
  String get favoritesViewOriginal => '查看原訊息';

  @override
  String get favoritesSearchHint => '搜尋收藏內容';

  @override
  String get favoritesNoResults => '沒有找到相關收藏';

  @override
  String get noticeTitle => '企業公告';

  @override
  String get noticeEmpty => '暫無公告';

  @override
  String get noticeDetail => '公告詳情';

  @override
  String get noticePublishedAt => '發布時間';

  @override
  String get noticePriorityNormal => '一般';

  @override
  String get noticePriorityImportant => '重要';

  @override
  String get noticePriorityUrgent => '緊急';

  @override
  String get organizationTitle => '組織架構';

  @override
  String get organizationEmpty => '暫無部門資訊';

  @override
  String get organizationMembers => '成員';

  @override
  String get organizationDepartment => '部門';

  @override
  String get organizationPosition => '職位';

  @override
  String get organizationLeader => '負責人';

  @override
  String get qrCodeTitle => '我的二維碼';

  @override
  String get qrCodeSave => '儲存到相簿';

  @override
  String get qrCodeShare => '分享';

  @override
  String get qrCodeSaveSuccess => '已儲存到相簿';

  @override
  String get qrCodeSaveFailed => '儲存失敗，請重試';

  @override
  String get qrCodeRefresh => '重新整理二維碼';

  @override
  String get qrCodeExpired => '二維碼已過期，請重新整理';

  @override
  String get qrCodeScanToAdd => '掃一掃上面的二維碼，新增我為好友';

  @override
  String get spacePersonal => '個人空間';

  @override
  String get spaceEnterprise => '企業空間';

  @override
  String get spaceJoinByCode => '透過企業碼加入';

  @override
  String get spaceJoinByInvite => '透過邀請碼加入';

  @override
  String get spaceEnterCode => '請輸入企業碼';

  @override
  String get spaceEnterInviteCode => '請輸入邀請碼';

  @override
  String get spaceSearchEnterprise => '搜尋企業';

  @override
  String get spaceJoinRequestSent => '申請已提交，等待審核';

  @override
  String get spaceJoinRequestPending => '申請審核中';

  @override
  String get spaceJoinRequestApproved => '申請已通過';

  @override
  String get spaceJoinRequestRejected => '申請已拒絕';

  @override
  String get spaceAlreadyMember => '你已經是該企業成員';

  @override
  String get spaceAutoApproved => '已自動通過，歡迎加入';

  @override
  String get spacePendingApprovalHint => '註冊成功，加入企業申請已提交，等待審核';

  @override
  String get spaceNoSpaces => '暫無空間';

  @override
  String get spaceInviteExpired => '邀請碼已過期';

  @override
  String get spaceInviteTargetMismatch => '該邀請碼不適用於你的帳號';

  @override
  String get spaceAcceptInviteSuccess => '已成功加入企業';

  @override
  String get spaceAcceptInviteFailed => '加入失敗，請重試';

  @override
  String get spaceTenantSelectTitle => '選擇空間';

  @override
  String get spaceTenantSelectHint => '請選擇要進入的空間';

  @override
  String get spaceEnterPersonal => '進入個人空間';

  @override
  String get spaceEnterEnterprise => '進入企業空間';

  @override
  String get aboutTitle => '關於微界';

  @override
  String get aboutVersion => '版本';

  @override
  String get aboutTerms => '使用者協議';

  @override
  String get aboutPrivacy => '隱私政策';

  @override
  String get aboutOpenSource => '開源授權';

  @override
  String get aboutCheckUpdate => '檢查更新';

  @override
  String get aboutLatestVersion => '已是最新版本';

  @override
  String get aboutUpdateAvailable => '發現新版本';

  @override
  String get aboutUpdateNow => '立即更新';

  @override
  String get aboutUpdateLater => '稍後再說';

  @override
  String get notificationTitle => '通知';

  @override
  String get notificationGlobalMute => '全域靜音';

  @override
  String get notificationSound => '聲音';

  @override
  String get notificationVibration => '震動';

  @override
  String get notificationPreview => '通知預覽';

  @override
  String get notificationDndStart => '勿擾開始時間';

  @override
  String get notificationDndEnd => '勿擾結束時間';

  @override
  String get blacklistTitle => '黑名單';

  @override
  String get blacklistEmpty => '黑名單為空';

  @override
  String get blacklistRemove => '移出黑名單';

  @override
  String get blacklistRemoveConfirm => '確定要將該使用者移出黑名單嗎？';

  @override
  String get feedbackTitle => '意見回饋';

  @override
  String get feedbackTypeComplaint => '投訴';

  @override
  String get feedbackTypeSuggestion => '建議';

  @override
  String get feedbackTypeBug => 'Bug 回報';

  @override
  String get feedbackContent => '回饋內容';

  @override
  String get feedbackContentHint => '請詳細描述您的問題或建議';

  @override
  String get feedbackContact => '聯絡方式（選填）';

  @override
  String get feedbackSubmit => '提交';

  @override
  String get feedbackSuccess => '回饋已提交，感謝您的建議';

  @override
  String get feedbackFailed => '提交失敗，請重試';

  @override
  String get networkTitle => '線路切換';

  @override
  String get networkAutoSelect => '自動選擇';

  @override
  String get networkManual => '手動選擇';

  @override
  String get timezoneTitle => '時區';

  @override
  String get timezoneAuto => '跟隨系統';

  @override
  String get autoTranslateTitle => '自動翻譯';

  @override
  String get autoTranslateEnabled => '開啟自動翻譯';

  @override
  String get autoTranslateLanguage => '翻譯目標語言';

  @override
  String get displayTitle => '介面與顯示';

  @override
  String get displayFontSize => '字體大小';

  @override
  String get displayChatBackground => '聊天背景';

  @override
  String get displayDarkMode => '深色模式';

  @override
  String get displayDarkModeSystem => '跟隨系統';

  @override
  String get displayDarkModeSystemHint => '根據系統設定自動切換';

  @override
  String get displayDarkModeOff => '淺色模式';

  @override
  String get displayDarkModeOffHint => '始終使用淺色主題';

  @override
  String get displayDarkModeOn => '深色模式';

  @override
  String get displayDarkModeOnHint => '始終使用深色主題';

  @override
  String get chatSettingsTitle => '聊天';

  @override
  String get chatHistoryTitle => '聊天記錄管理';

  @override
  String get chatHistoryClear => '清空聊天記錄';

  @override
  String get chatHistoryClearConfirm => '確定要清空所有聊天記錄嗎？此操作不可復原。';

  @override
  String get chatHistoryClearSuccess => '聊天記錄已清空';

  @override
  String get accountSecurityTitle => '帳號安全';

  @override
  String get accountSecurityChangePassword => '修改密碼';

  @override
  String get accountSecurityChangeMobile => '更換手機號';

  @override
  String get accountSecurityChangeEmail => '更換電子郵件';

  @override
  String get accountSecurityLoggedDevices => '已登入裝置';

  @override
  String get accountSecurityDeactivate => '登出帳號';

  @override
  String get accountSecurityDeactivateConfirm => '帳號登出後，所有資料將在7天後永久刪除，確定要登出嗎？';

  @override
  String get loggedDevicesTitle => '已登入裝置';

  @override
  String get loggedDevicesCurrent => '目前裝置';

  @override
  String get loggedDevicesRevoke => '登出該裝置';

  @override
  String get loggedDevicesRevokeConfirm => '確定要登出該裝置嗎？';

  @override
  String get loggedDevicesRevokeSuccess => '已登出該裝置';

  @override
  String get loggedDevicesRevokeFailed => '登出失敗，請重試';

  @override
  String get loggedDevicesLastActive => '最後活躍';

  @override
  String get loggedDevicesTypeIos => 'iOS';

  @override
  String get loggedDevicesTypeAndroid => 'Android';

  @override
  String get loggedDevicesTypeWeb => '網頁端';

  @override
  String get loggedDevicesTypeDesktop => '桌面端';

  @override
  String get loggedDevicesTypeUnknown => '未知裝置';

  @override
  String get privacySettingsTitle => '朋友權限';

  @override
  String get privacySearchableByMobile => '允許透過手機號搜尋';

  @override
  String get privacySearchableByLppId => '允許透過微界號搜尋';

  @override
  String get privacyAllowFriendRequest => '加我為好友';

  @override
  String get privacyProfileVisibility => '個人資料可見性';

  @override
  String get privacyEveryone => '所有人';

  @override
  String get privacyFriendsOfFriends => '有共同好友的人';

  @override
  String get privacyNobody => '不允許';

  @override
  String get privacyFriendsOnly => '僅好友';

  @override
  String get privacySaveSuccess => '設定已儲存';

  @override
  String get privacySaveFailed => '儲存失敗，請重試';

  @override
  String get fontSizeTitle => '字體大小';

  @override
  String get fontSizeSmall => '小';

  @override
  String get fontSizeNormal => '標準';

  @override
  String get fontSizeLarge => '大';

  @override
  String get fontSizeExtraLarge => '超大';

  @override
  String get fontSizePreview => '字體預覽';

  @override
  String get chatBackgroundTitle => '聊天背景';

  @override
  String get chatBackgroundDefault => '預設';

  @override
  String get chatBackgroundCustom => '自訂';

  @override
  String get chatBackgroundReset => '恢復預設';

  @override
  String get termsTitle => '使用者協議';

  @override
  String get privacyPolicyTitle => '隱私政策';

  @override
  String get recentContactsTitle => '最近聯絡';

  @override
  String get recentContactsEmpty => '暫無最近聯絡人';

  @override
  String get inviteFriendsTitle => '邀請朋友';

  @override
  String get inviteFriendsCopyLink => '複製邀請連結';

  @override
  String get inviteFriendsLinkCopied => '邀請連結已複製';

  @override
  String get imageViewerTitle => '圖片';

  @override
  String get imageViewerSave => '儲存到相簿';

  @override
  String get imageViewerSaveSuccess => '已儲存到相簿';

  @override
  String get imageViewerSaveFailed => '儲存失敗，請重試';

  @override
  String get customerServiceTitle => '客服工作台';

  @override
  String get customerServiceQueue => '排隊中';

  @override
  String get customerServiceActive => '服務中';

  @override
  String get customerServiceClaim => '接入';

  @override
  String get customerServiceTakeover => '接管';

  @override
  String get customerServiceClose => '結束服務';

  @override
  String get customerServiceCloseConfirm => '確定要結束該服務嗎？';

  @override
  String get customerServiceNoQueue => '暫無排隊';

  @override
  String get customerServiceNoActive => '暫無進行中的服務';

  @override
  String get customerServiceVisitor => '訪客';

  @override
  String get customerServiceCustomer => '客戶';

  @override
  String get customerServiceAssignedTo => '負責客服';

  @override
  String get customerServiceTransferConversation => '轉交對話';

  @override
  String get marketingToolbar => '行銷工具';

  @override
  String get callIncoming => '來電';

  @override
  String get callOutgoing => '去電';

  @override
  String get callAccept => '接聽';

  @override
  String get callReject => '拒絕';

  @override
  String get callHangup => '掛斷';

  @override
  String get callMissed => '未接來電';

  @override
  String get callDuration => '通話時長';

  @override
  String get callAudio => '語音通話';

  @override
  String get callVideo => '視訊通話';

  @override
  String get callConnecting => '連線中...';

  @override
  String get callRinging => '等待接聽...';

  @override
  String get callEnded => '通話已結束';

  @override
  String get callFailed => '通話失敗';

  @override
  String get callRejected => '對方已拒絕';

  @override
  String get callTimeout => '對方無應答';

  @override
  String get callCancelled => '已取消';

  @override
  String get pendingJoinRequestsTitle => '新的申請';

  @override
  String get pendingJoinRequestsEmpty => '暫無申請';

  @override
  String get pendingJoinRequestApprove => '同意';

  @override
  String get pendingJoinRequestReject => '拒絕';

  @override
  String get pendingJoinRequestApproveSuccess => '已同意申請';

  @override
  String get pendingJoinRequestRejectSuccess => '已拒絕申請';

  @override
  String get pendingJoinRequestFailed => '操作失敗，請重試';

  @override
  String get myCustomersTitle => '我的客戶';

  @override
  String get myCustomersEmpty => '暫無客戶';

  @override
  String get groupListTitle => '群組列表';

  @override
  String get groupListEmpty => '暫無群組';

  @override
  String get addFriendTitle => '新增朋友';

  @override
  String get addFriendSearchHint => '手機號 / 電子郵件 / 微界號';

  @override
  String addFriendLppIdLabel(String lppId) {
    return '微界號：$lppId';
  }

  @override
  String get addFriendButton => '加好友';

  @override
  String get addFriendCannotAddSelf => '不能新增自己';

  @override
  String get addFriendUnsupportedUser => '目前使用者不支援新增好友，可直接傳送訊息';

  @override
  String get addFriendMessageHint => '請輸入驗證訊息';

  @override
  String get addFriendSendRequest => '傳送申請';

  @override
  String get joinCompanyTitle => '加入企業';

  @override
  String get joinCompanyCodeHint => '請輸入企業碼';

  @override
  String get joinCompanySearchHint => '搜尋企業名稱';

  @override
  String get joinCompanyApply => '申請加入';

  @override
  String get joinCompanyApplySuccess => '申請已提交';

  @override
  String get joinCompanyApplyFailed => '申請失敗，請重試';

  @override
  String get joinCompanyAutoApproved => '已自動通過，歡迎加入';

  @override
  String get joinCompanyPending => '申請已提交，等待審核';

  @override
  String get joinCompanyInviteCodeHint => '請輸入邀請碼';

  @override
  String get joinCompanyAcceptInvite => '接受邀請';

  @override
  String get joinCompanyNoResults => '未找到相關企業';

  @override
  String joinCompanyMemberCount(int count) {
    return '$count 名成員';
  }

  @override
  String get timezoneNameHawaii => '夏威夷';

  @override
  String get timezoneNameAlaska => '阿拉斯加';

  @override
  String get timezoneNamePacificTime => '太平洋時間';

  @override
  String get timezoneNameMountainTime => '山地時間';

  @override
  String get timezoneNameCentralTime => '中部時間';

  @override
  String get timezoneNameEasternTime => '東部時間';

  @override
  String get timezoneNameAtlanticTime => '大西洋時間';

  @override
  String get timezoneNameBrasilia => '巴西利亞';

  @override
  String get timezoneNameAzores => '亞速爾群島';

  @override
  String get timezoneNameLondonDublin => '倫敦/都柏林';

  @override
  String get timezoneNameBerlinParisRome => '柏林/巴黎/羅馬';

  @override
  String get timezoneNameCairoHelsinki => '開羅/赫爾辛基';

  @override
  String get timezoneNameMoscowRiyadh => '莫斯科/利雅得';

  @override
  String get timezoneNameTehran => '德黑蘭';

  @override
  String get timezoneNameDubaiBaku => '杜拜/巴庫';

  @override
  String get timezoneNameKabul => '喀布爾';

  @override
  String get timezoneNameKarachiTashkent => '喀拉蚩/塔什干';

  @override
  String get timezoneNameMumbaiNewDelhi => '孟買/新德里';

  @override
  String get timezoneNameKathmandu => '加德滿都';

  @override
  String get timezoneNameDhakaAlmaty => '達卡/阿拉木圖';

  @override
  String get timezoneNameYangon => '仰光';

  @override
  String get timezoneNameBangkokHanoiJakarta => '曼谷/河內/雅加達';

  @override
  String get timezoneNameBeijingShanghaiHongKongTaipei => '北京/上海/香港/台北';

  @override
  String get timezoneNameTokyoSeoul => '東京/首爾';

  @override
  String get timezoneNameAdelaide => '阿德萊德';

  @override
  String get timezoneNameSydneyMelbourne => '雪梨/墨爾本';

  @override
  String get timezoneNameSolomonIslands => '索羅門群島';

  @override
  String get timezoneNameAucklandFiji => '奧克蘭/斐濟';

  @override
  String get networkSmartSelectBestRoute => '智慧選擇最佳線路';

  @override
  String get networkTesting => '測試中...';

  @override
  String get networkTestingShort => '測試中';

  @override
  String networkLatencyMs(int ms) {
    return '延遲 ${ms}ms';
  }

  @override
  String get networkConnectionMode => '連線模式';

  @override
  String get networkDirectMode => '直連模式';

  @override
  String get networkProxyMode => '代理模式';

  @override
  String get networkDirectModeDesc => '直接連線伺服器';

  @override
  String get networkProxyModeDesc => '透過代理伺服器連線';

  @override
  String get networkDirectRoutes => '直連線路';

  @override
  String get networkProxyRoutes => '代理線路';

  @override
  String get networkTestAll => '全部測試';

  @override
  String get networkChinaTelecom => '中國電信';

  @override
  String get networkChinaUnicom => '中國聯通';

  @override
  String get networkChinaMobile => '中國移動';

  @override
  String get networkHongKongNode => '香港節點';

  @override
  String get networkSingaporeNode => '新加坡節點';

  @override
  String get networkJapanNode => '日本節點';

  @override
  String get networkUnitedStatesNode => '美國節點';

  @override
  String get networkHint =>
      '提示：\n• 直連模式：速度快，適合國內使用\n• 代理模式：穩定性高，適合跨境通訊\n• 點擊重新整理圖示可測試單一線路延遲';
}
