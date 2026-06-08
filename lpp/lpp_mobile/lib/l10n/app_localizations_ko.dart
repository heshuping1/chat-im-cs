// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get commonConfirm => '확인';

  @override
  String get commonCancel => '취소';

  @override
  String get commonSave => '저장';

  @override
  String get commonEdit => '편집';

  @override
  String get commonDelete => '삭제';

  @override
  String get commonSearch => '검색';

  @override
  String get commonLoading => '로딩 중...';

  @override
  String get commonLoadFailed => '로드 실패';

  @override
  String get commonRetry => '다시 시도';

  @override
  String get commonEmpty => '데이터가 없습니다';

  @override
  String get commonCopy => '복사';

  @override
  String get commonForward => '전달';

  @override
  String get commonFavorite => '즐겨찾기';

  @override
  String get commonClose => '닫기';

  @override
  String get commonSend => '전송';

  @override
  String get commonDone => '완료';

  @override
  String get commonMore => '더보기';

  @override
  String get commonSettings => '설정';

  @override
  String get commonCopied => '복사되었습니다';

  @override
  String get commonUnknown => '알 수 없음';

  @override
  String get commonNotSet => '미설정';

  @override
  String get commonUnbound => '미등록';

  @override
  String get commonViewAll => '전체 보기';

  @override
  String get commonSubmit => '제출';

  @override
  String get commonAdd => '추가';

  @override
  String get commonRemove => '제거';

  @override
  String get commonCreate => '만들기';

  @override
  String get commonUpdate => '업데이트';

  @override
  String get commonUpload => '업로드';

  @override
  String get commonShare => '공유';

  @override
  String get commonBlock => '차단';

  @override
  String get commonUnblock => '차단 해제';

  @override
  String get commonMute => '알림 끄기';

  @override
  String get commonUnmute => '알림 켜기';

  @override
  String get commonPin => '고정';

  @override
  String get commonUnpin => '고정 해제';

  @override
  String get commonMarkRead => '읽음으로 표시';

  @override
  String get commonMarkUnread => '읽지 않음으로 표시';

  @override
  String get commonOnline => '온라인';

  @override
  String get commonOffline => '오프라인';

  @override
  String get commonOperationFailed => '작업에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get commonNetworkError => '네트워크 오류입니다. 연결을 확인해 주십시오';

  @override
  String get navMessages => '채팅';

  @override
  String get navContacts => '연락처';

  @override
  String get navMe => '마이페이지';

  @override
  String get authLoginTitle => 'LPP 로그인';

  @override
  String get authTabMobile => '전화번호';

  @override
  String get authTabEmail => '이메일';

  @override
  String get authTabLoginName => 'LPP ID';

  @override
  String get authHintMobile => '전화번호를 입력해 주십시오';

  @override
  String get authHintEmail => '이메일을 입력해 주십시오';

  @override
  String get authHintPassword => '비밀번호를 입력해 주십시오';

  @override
  String get authHintCode => '인증 코드를 입력해 주십시오';

  @override
  String get authHintLoginName => 'LPP ID를 입력해 주십시오 (lpp_xxxxxxxx)';

  @override
  String get authLoginButton => '로그인 / 회원가입';

  @override
  String get authGetCode => '인증 코드 받기';

  @override
  String authResendCode(int seconds) {
    return '$seconds초 후 재전송';
  }

  @override
  String get authUsePassword => '비밀번호로 로그인';

  @override
  String get authUseCode => '인증 코드로 로그인';

  @override
  String get authAgreementPrefix => '이용약관 및 개인정보처리방침에 동의합니다';

  @override
  String get authAgreementAnd => '및';

  @override
  String get authTermsLink => '이용약관';

  @override
  String get authPrivacyLink => '개인정보처리방침';

  @override
  String get authCaptchaTitle => '보안 확인';

  @override
  String get authCaptchaHint => '답을 입력해 주십시오';

  @override
  String get authCaptchaFailed => '인증 코드 가져오기에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get authErrorEmptyCode => '인증 코드를 입력해 주십시오';

  @override
  String get authErrorEmptyPassword => '비밀번호를 입력해 주십시오';

  @override
  String get authErrorEmptyLoginName => 'LPP ID를 입력해 주십시오';

  @override
  String get authErrorWrongCredentials => '계정 또는 비밀번호가 올바르지 않습니다';

  @override
  String get authDeactivatingTitle => '계정 탈퇴 중';

  @override
  String get authDeactivatingContent =>
      '계정이 탈퇴 유예 기간 중입니다 (7일).\n\n탈퇴를 취소하려면 「탈퇴 취소」를 탭해 주십시오.';

  @override
  String get authContinueUse => '계속 사용';

  @override
  String get authCancelDeactivation => '탈퇴 취소';

  @override
  String get authDeactivationCancelled => '탈퇴가 취소되었습니다';

  @override
  String get authDeactivationCancelFailed => '취소에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get authLogout => '로그아웃';

  @override
  String get authLogoutConfirm => '로그아웃하시겠습니까?';

  @override
  String get authSendingCode => '전송 중...';

  @override
  String get authCodeSent => '인증 코드가 전송되었습니다';

  @override
  String get authLoginFailed => '로그인에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get authRegisterFailed => '회원가입에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get authEnterpriseCode => '기업 코드';

  @override
  String get authEnterpriseCodeHint => '기업 코드를 입력해 주십시오';

  @override
  String get authPendingApproval => '회원가입이 완료되었습니다. 기업 참가 신청이 제출되어 승인 대기 중입니다.';

  @override
  String get homeTitle => '채팅';

  @override
  String get homePersonalSpace => '개인 공간';

  @override
  String get homeOfficialService => '공식 서비스';

  @override
  String get homeSwitchSpace => '공간 전환';

  @override
  String get homeSpaceSubtitle => '개인 · 기업';

  @override
  String get homeJoinEnterprise => '기업 참가';

  @override
  String get homeCreateGroup => '그룹 만들기';

  @override
  String get homeAddFriend => '친구 추가';

  @override
  String get homeScan => 'QR 코드 스캔';

  @override
  String get homeJoinNewSpace => '새 공간 참가';

  @override
  String get homeSearchConversation => '채팅 검색';

  @override
  String get homeNoMessages => '메시지가 없습니다';

  @override
  String get homeDeleteConversation => '채팅 삭제';

  @override
  String get homeDeleteConversationConfirm => '이 채팅을 삭제하시겠습니까? 채팅 기록이 삭제됩니다.';

  @override
  String get homePersonalNote => '나 (개인 메모)';

  @override
  String get homeWorkNote => '나 (업무 메모)';

  @override
  String homeConversationCount(int count) {
    return '$count개의 채팅';
  }

  @override
  String homeUnreadCount(int count) {
    return '$count개 읽지 않음';
  }

  @override
  String get chatInputHint => '메시지 입력...';

  @override
  String get chatVoiceHint => '누르고 말하기';

  @override
  String get chatVoiceRelease => '놓으면 전송';

  @override
  String get chatVoiceCancel => '위로 밀어 취소';

  @override
  String get chatMenuCopy => '복사';

  @override
  String get chatMenuForward => '전달';

  @override
  String get chatMenuRecall => '취소';

  @override
  String get chatMenuDelete => '삭제';

  @override
  String get chatMenuFavorite => '즐겨찾기';

  @override
  String get chatMenuReply => '답장';

  @override
  String get chatMenuMultiSelect => '여러 선택';

  @override
  String get chatMenuTranslate => '번역';

  @override
  String get chatMenuVoiceToText => '텍스트 변환';

  @override
  String get chatStatusRecalled => '메시지가 취소되었습니다';

  @override
  String get chatRecallSuccess => '취소되었습니다';

  @override
  String get chatRecallFailed => '취소에 실패했습니다';

  @override
  String get chatRecallTimeout => '2분이 지난 메시지는 취소할 수 없습니다';

  @override
  String get chatTranslateFailed => '번역에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get chatTranslateNotConfigured => '번역 서비스를 현재 이용할 수 없습니다';

  @override
  String get chatVoiceToTextFailed => '변환에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get chatForwardSuccess => '전달되었습니다';

  @override
  String get chatForwardFailed => '전달에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get chatNoConversations => '전달할 채팅이 없습니다';

  @override
  String get chatSendFailed => '전송 실패';

  @override
  String get chatResend => '다시 전송';

  @override
  String get chatNotFriend => '친구가 아닙니다';

  @override
  String get chatNotFriendHint => '아직 친구가 아니어서 메시지를 보낼 수 없습니다';

  @override
  String get chatMutedHint => '전체 음소거 중';

  @override
  String get chatFileUploadFailed => '파일 업로드에 실패했습니다';

  @override
  String get chatFileStatusNotDownloaded => '다운로드 전';

  @override
  String get chatFileStatusDownloaded => '다운로드됨';

  @override
  String get chatFileStatusUploading => '업로드 중';

  @override
  String get chatFileStatusUploadFailed => '업로드 실패';

  @override
  String get chatCardSendFailed => '연락처 카드 전송에 실패했습니다';

  @override
  String get chatFavoriteSuccess => '즐겨찾기에 추가되었습니다';

  @override
  String get chatFavoriteFailed => '즐겨찾기 추가에 실패했습니다';

  @override
  String get chatLoadFailed => '로드 실패';

  @override
  String get chatImageMessage => '[이미지]';

  @override
  String get chatVoiceMessage => '[음성]';

  @override
  String get chatVideoMessage => '[동영상]';

  @override
  String get chatFileMessage => '[파일]';

  @override
  String get chatLocationMessage => '[위치]';

  @override
  String get chatContactCardMessage => '[연락처]';

  @override
  String get chatCallLogMessage => '[통화 기록]';

  @override
  String chatGroupMemberCount(int count) {
    return '($count)';
  }

  @override
  String chatReadCount(int count) {
    return '$count명 읽음';
  }

  @override
  String get chatUnread => '읽지 않음';

  @override
  String get chatRecalledSelf => '메시지를 취소했습니다';

  @override
  String chatRecalledPeer(String sender) {
    return '$sender님이 메시지를 취소했습니다';
  }

  @override
  String chatTranslationPrefix(String translation) {
    return '번역: $translation';
  }

  @override
  String get chatMessageDeleted => '메시지가 삭제되었습니다';

  @override
  String get chatPeer => '상대방';

  @override
  String get chatSelf => '나';

  @override
  String get chatGenericMessage => '[메시지]';

  @override
  String get chatVoiceHideText => '텍스트 숨기기';

  @override
  String get chatVoiceShowText => '텍스트 변환';

  @override
  String get chatFileDefaultName => '파일';

  @override
  String get chatContactDefaultName => '연락처';

  @override
  String get chatContactCardTitle => '연락처 카드';

  @override
  String get chatCallMissed => '부재중';

  @override
  String get chatCallCancelled => '취소됨';

  @override
  String get chatCallRejected => '거절됨';

  @override
  String get chatCallDisconnected => '연결 끊김';

  @override
  String get chatCallEnded => '통화 종료';

  @override
  String get chatCallFailed => '통화 실패';

  @override
  String chatCallDuration(String duration) {
    return '통화 시간 $duration';
  }

  @override
  String get chatVideoCallTitle => '영상 통화';

  @override
  String get chatVoiceCallTitle => '음성 통화';

  @override
  String get chatToolPhotos => '사진';

  @override
  String get chatToolCamera => '촬영';

  @override
  String get chatToolFile => '파일';

  @override
  String get chatToolLocation => '위치';

  @override
  String get chatToolContactCard => '연락처';

  @override
  String get chatToolVoiceCall => '음성 통화';

  @override
  String get chatToolVideoCall => '영상 통화';

  @override
  String get chatToolFavorites => '즐겨찾기';

  @override
  String get chatFileTooLarge => '파일 크기가 제한을 초과했습니다(100 MB)';

  @override
  String get chatInputMutedAdminOnly => '소유자 또는 지정된 멤버만 말할 수 있습니다';

  @override
  String get chatImageUploadUnsupported => '이미지 업로드에 실패했습니다. 서버가 아직 지원하지 않습니다.';

  @override
  String get chatFavoriteLongPressHint => '메시지를 길게 눌러 즐겨찾기에 추가하세요';

  @override
  String chatSelectedCount(int count) {
    return '$count개 선택됨';
  }

  @override
  String get chatLocationSheetTitle => '위치 보내기';

  @override
  String get chatLocationNameLabel => '장소 이름';

  @override
  String get chatLocationNameHint => '예: 회사, 고객 주소';

  @override
  String get chatLocationAddressLabel => '상세 주소';

  @override
  String get chatLocationOptionalHint => '선택 사항';

  @override
  String get chatLocationLatitudeLabel => '위도';

  @override
  String get chatLocationLatitudeHint => '-90 ~ 90';

  @override
  String get chatLocationLongitudeLabel => '경도';

  @override
  String get chatLocationLongitudeHint => '-180 ~ 180';

  @override
  String chatLocationValidationRequired(String label) {
    return '$label을(를) 입력해 주십시오';
  }

  @override
  String chatLocationValidationRange(String label) {
    return '$label 범위가 올바르지 않습니다';
  }

  @override
  String get chatLocationDefaultTitle => '위치';

  @override
  String get chatMutedFullNotice =>
      '이 그룹은 전체 음소거 중입니다. 소유자 또는 지정된 멤버만 말할 수 있습니다';

  @override
  String get chatNotFriendSendBlocked => '상대방과 친구가 아니어서 메시지를 보낼 수 없습니다';

  @override
  String get chatPersonalNotesTitle => '개인 노트';

  @override
  String get chatWorkNotesTitle => '업무 노트';

  @override
  String get chatPersonalNotesDescription =>
      '개인 생각과 중요한 정보를 여기에 기록하세요\n기기 간 동기화되어 언제든지 접근할 수 있습니다';

  @override
  String get chatWorkNotesDescription =>
      '업무 사항과 자료를 여기에 저장하세요\n팀 공간은 독립적으로 안전하게 분리됩니다';

  @override
  String get chatNoMessages => '메시지가 없습니다';

  @override
  String chatReplyTo(String sender) {
    return '$sender에게 답장';
  }

  @override
  String chatFeatureComingSoon(String feature) {
    return '$feature 기능은 곧 제공됩니다';
  }

  @override
  String get chatForwardSelectTitle => '채팅 선택';

  @override
  String get chatContactSelectTitle => '연락처 선택';

  @override
  String get chatNoContacts => '연락처가 없습니다';

  @override
  String get contactsTitle => '연락처';

  @override
  String get contactsSearch => '연락처 검색';

  @override
  String get contactsNewFriends => '새 친구';

  @override
  String get contactsGroups => '그룹';

  @override
  String get contactsFavorites => '즐겨찾기';

  @override
  String get contactsRecent => '최근 연락처';

  @override
  String get contactsOrganization => '조직도';

  @override
  String get contactsAnnouncement => '공지사항';

  @override
  String get contactsNewApplications => '새 신청';

  @override
  String get contactsCustomerGroups => '고객 그룹';

  @override
  String get contactsAllCustomers => '전체 고객';

  @override
  String get contactsMyCustomers => '담당 고객';

  @override
  String get contactsViewAll => '전체 보기';

  @override
  String get contactsMyContacts => '내 연락처';

  @override
  String get contactsMyAdvisor => '담당 어드바이저';

  @override
  String get contactsNoAdvisor => '담당자가 배정되지 않았습니다';

  @override
  String get contactsAdvisorLoading => '로딩 중...';

  @override
  String get contactsNavigateFailed => '이동에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get contactsEmpty => '연락처가 없습니다';

  @override
  String get contactsNoAnnouncement => '공지사항이 없습니다';

  @override
  String get contactsOfficialBadge => '공식';

  @override
  String get contactsCustomerBadge => '고객';

  @override
  String get contactsEmptyCustomers => '고객이 없습니다';

  @override
  String get myTitle => '마이페이지';

  @override
  String get myEnterpriseInfo => '기업 정보';

  @override
  String get myEnterpriseManage => '기업 관리';

  @override
  String get myQrCode => 'QR 코드 명함';

  @override
  String get myFavorites => '즐겨찾기';

  @override
  String get myLanguage => '언어';

  @override
  String get myTimezone => '시간대';

  @override
  String get myAutoTranslate => '자동 번역';

  @override
  String get myNetworkSwitch => '네트워크';

  @override
  String get mySettings => '설정';

  @override
  String get myLogout => '로그아웃';

  @override
  String get myLogoutConfirm => '로그아웃하시겠습니까?';

  @override
  String get myLeaveEnterprise => '기업 탈퇴';

  @override
  String get myLeaveEnterpriseConfirm =>
      '이 기업을 탈퇴하시겠습니까? 탈퇴 후에는 기업 데이터에 접근할 수 없습니다.';

  @override
  String get myLeaveEnterpriseSuccess => '기업을 탈퇴했습니다';

  @override
  String get myLeaveEnterpriseFailed => '탈퇴에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get myLppIdCopied => 'LPP ID가 복사되었습니다';

  @override
  String myLppIdLabel(String lppId) {
    return 'LPP ID: $lppId';
  }

  @override
  String myFriendCount(int count) {
    return '친구 $count명';
  }

  @override
  String get myAutoSelect => '자동';

  @override
  String get myPresenceStatus => '온라인 상태';

  @override
  String get myPresenceStatusTitle => '온라인 상태 설정';

  @override
  String get myPresenceOnline => '온라인';

  @override
  String get myPresenceBusy => '바쁨';

  @override
  String get myPresenceAway => '자리 비움';

  @override
  String get myPresenceInvisible => '숨김';

  @override
  String get profileTitle => '프로필';

  @override
  String get profileName => '이름';

  @override
  String get profileGender => '성별';

  @override
  String get profileBirthday => '생일';

  @override
  String get profileRegion => '지역';

  @override
  String get profileSignature => '자기소개';

  @override
  String get profileSignatureHint => '자기소개를 입력해 주십시오';

  @override
  String get profileTapTapText => '탭탭';

  @override
  String get profileTapTapHint => '탭 시 표시할 텍스트 (최대 20자)';

  @override
  String get profileAccountSection => '계정';

  @override
  String get profileBasicSection => '기본 정보';

  @override
  String get profileLppId => 'LPP ID';

  @override
  String get profileLppIdNotSet => '미설정';

  @override
  String get profileMobile => '전화번호';

  @override
  String get profileMobileUnbound => '미등록';

  @override
  String get profileEmail => '이메일';

  @override
  String get profileEmailUnbound => '미등록';

  @override
  String get profileQrCode => '내 QR 코드';

  @override
  String get profileChangePassword => '비밀번호 변경';

  @override
  String get profileGenderMale => '남성';

  @override
  String get profileGenderFemale => '여성';

  @override
  String get profileGenderOther => '기타';

  @override
  String get profileGenderUnset => '미설정';

  @override
  String get profileSaveFailed => '저장에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get profileLppIdTitle => 'LPP ID';

  @override
  String get profileLppIdSetOnce => 'LPP ID는 한 번만 변경할 수 있습니다. 신중하게 입력해 주십시오.';

  @override
  String get profileLppIdChangeFailed => '변경에 실패했습니다 (LPP ID는 한 번만 변경 가능)';

  @override
  String get profileChangePasswordOld => '현재 비밀번호';

  @override
  String get profileChangePasswordNew => '새 비밀번호';

  @override
  String get profileChangePasswordConfirm => '새 비밀번호 확인';

  @override
  String get profileChangePasswordMismatch => '비밀번호가 일치하지 않습니다';

  @override
  String get profileChangePasswordSuccess => '비밀번호가 변경되었습니다. 다시 로그인해 주십시오.';

  @override
  String get profileChangePasswordFailed => '비밀번호 변경에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get settingsTitle => '설정';

  @override
  String get settingsSectionEnterprise => '기업';

  @override
  String get settingsSectionAccount => '계정';

  @override
  String get settingsSectionGeneral => '일반';

  @override
  String get settingsSectionFeatures => '기능';

  @override
  String get settingsSectionAbout => '앱 정보';

  @override
  String get settingsEnterpriseInfo => '기업 정보';

  @override
  String get settingsProfile => '프로필';

  @override
  String get settingsAccountSecurity => '계정 보안';

  @override
  String get settingsNotification => '알림';

  @override
  String get settingsDisplay => '화면';

  @override
  String get settingsFriendPrivacy => '개인정보';

  @override
  String get settingsChat => '채팅';

  @override
  String get settingsChatHistory => '채팅 기록';

  @override
  String get settingsAbout => 'LPP 정보';

  @override
  String get settingsLanguage => '언어';

  @override
  String get settingsTimezone => '시간대';

  @override
  String get settingsAutoTranslate => '자동 번역';

  @override
  String get settingsNetworkSwitch => '네트워크';

  @override
  String get enterpriseInfoTitle => '기업 정보';

  @override
  String get enterpriseName => '기업명';

  @override
  String get enterpriseDescription => '기업 소개';

  @override
  String get enterpriseUpdateSuccess => '업데이트되었습니다';

  @override
  String get enterpriseUpdateFailed => '업데이트에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get enterpriseLeave => '기업 탈퇴';

  @override
  String get enterpriseLeaveConfirm => '이 기업을 탈퇴하시겠습니까?';

  @override
  String get enterpriseLeaveSuccess => '기업을 탈퇴했습니다';

  @override
  String get enterpriseLeaveFailed => '탈퇴에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get enterpriseLeaveOwnerError =>
      '소유자는 직접 탈퇴할 수 없습니다. 먼저 소유자 권한을 양도해 주십시오.';

  @override
  String get enterpriseMemberCount => '멤버 수';

  @override
  String get enterpriseCreatedAt => '생성일';

  @override
  String get enterpriseCode => '기업 코드';

  @override
  String get enterpriseInviteMembers => '멤버 초대';

  @override
  String get enterpriseCopyInviteCode => '초대 코드 복사';

  @override
  String get enterpriseInviteCodeCopied => '초대 코드가 복사되었습니다';

  @override
  String get groupCreateTitle => '그룹 만들기';

  @override
  String get groupNameHint => '그룹 이름을 입력해 주십시오';

  @override
  String get groupCreateSuccess => '그룹이 만들어졌습니다';

  @override
  String get groupCreateFailed => '그룹 만들기에 실패했습니다';

  @override
  String get groupSettings => '그룹 설정';

  @override
  String get groupName => '그룹 이름';

  @override
  String get groupAvatar => '그룹 아이콘';

  @override
  String get groupAnnouncement => '공지사항';

  @override
  String get groupMembers => '멤버';

  @override
  String get groupAddMember => '멤버 추가';

  @override
  String get groupRemoveMember => '멤버 제거';

  @override
  String get groupRemoveMemberConfirm => '이 멤버를 제거하시겠습니까?';

  @override
  String get groupSetAdmin => '관리자로 설정';

  @override
  String get groupRemoveAdmin => '관리자 해제';

  @override
  String get groupTransferOwner => '소유자 양도';

  @override
  String get groupTransferOwnerConfirm => '이 멤버에게 소유자를 양도하시겠습니까?';

  @override
  String get groupTransferOwnerSuccess => '소유자가 양도되었습니다';

  @override
  String get groupTransferOwnerFailed => '양도에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get groupLeave => '그룹 나가기';

  @override
  String get groupLeaveConfirm => '이 그룹을 나가시겠습니까?';

  @override
  String get groupLeaveSuccess => '그룹을 나갔습니다';

  @override
  String get groupLeaveFailed => '나가기에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get groupDissolve => '그룹 해산';

  @override
  String get groupDissolveConfirm => '이 그룹을 해산하시겠습니까? 모든 멤버가 제거됩니다.';

  @override
  String get groupDissolveSuccess => '그룹이 해산되었습니다';

  @override
  String get groupDissolveFailed => '해산에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get groupQrCode => '그룹 QR 코드';

  @override
  String get groupMuteAll => '전체 음소거';

  @override
  String get groupMuteAllOn => '전체 음소거 켜기';

  @override
  String get groupMuteAllOff => '전체 음소거 끄기';

  @override
  String get groupAllowMemberInvite => '멤버 초대 허용';

  @override
  String get groupAllowMemberModifyTitle => '멤버의 그룹 이름 변경 허용';

  @override
  String get groupAllowMemberAtAll => '멤버의 @전체 허용';

  @override
  String get groupAllowMemberViewMemberList => '멤버 목록 보기 허용';

  @override
  String get groupAllowQrCodeJoin => 'QR 코드 참가 허용';

  @override
  String get groupRequireApproval => '참가 시 승인 필요';

  @override
  String get groupAllowMemberAddFriend => '멤버 간 친구 추가 허용';

  @override
  String get groupRoleOwner => '소유자';

  @override
  String get groupRoleAdmin => '관리자';

  @override
  String get groupRoleMember => '멤버';

  @override
  String get groupNoMembers => '멤버가 없습니다';

  @override
  String get groupNoAnnouncements => '공지사항이 없습니다';

  @override
  String get groupCreateAnnouncement => '공지 게시';

  @override
  String get groupEditAnnouncement => '공지 편집';

  @override
  String get groupDeleteAnnouncement => '공지 삭제';

  @override
  String get groupDeleteAnnouncementConfirm => '이 공지를 삭제하시겠습니까?';

  @override
  String get groupAnnouncementTitle => '제목';

  @override
  String get groupAnnouncementContent => '내용';

  @override
  String get groupAnnouncementPin => '공지 고정';

  @override
  String groupMemberCount(int count) {
    return '$count명';
  }

  @override
  String groupSelectedCount(int count) {
    return '$count명 선택됨';
  }

  @override
  String get groupJoinRequestApprove => '승인';

  @override
  String get groupJoinRequestReject => '거절';

  @override
  String get groupJoinRequests => '참가 신청';

  @override
  String get groupNoJoinRequests => '참가 신청이 없습니다';

  @override
  String get groupReadReceipts => '읽음 확인';

  @override
  String groupReadCount(int count) {
    return '$count명 읽음';
  }

  @override
  String groupUnreadCount(int count) {
    return '$count명 읽지 않음';
  }

  @override
  String get friendAddTitle => '친구 추가';

  @override
  String get friendSearchHint => '전화번호 / 이메일 / LPP ID';

  @override
  String get friendRequestSent => '친구 신청을 보냈습니다';

  @override
  String get friendRequestFailed => '전송에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get friendAlreadyFriend => '이미 친구입니다';

  @override
  String get friendNewFriendsTitle => '새 친구';

  @override
  String get friendNoRequests => '친구 신청이 없습니다';

  @override
  String get friendAccept => '수락';

  @override
  String get friendReject => '거절';

  @override
  String get friendAccepted => '수락했습니다';

  @override
  String get friendRejected => '거절했습니다';

  @override
  String get friendDeleteConfirm => '이 친구를 삭제하시겠습니까?';

  @override
  String get friendDeleteSuccess => '친구를 삭제했습니다';

  @override
  String get friendDeleteFailed => '삭제에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get friendRemarkName => '별명';

  @override
  String get friendGroupName => '그룹';

  @override
  String get friendSendMessage => '메시지 보내기';

  @override
  String get friendMatchTypeLppId => 'LPP ID로 일치';

  @override
  String get friendMatchTypeMobile => '전화번호로 일치';

  @override
  String get friendMatchTypeEmail => '이메일로 일치';

  @override
  String get friendSearchEmpty => '사용자를 찾을 수 없습니다';

  @override
  String get friendAddMessage => '친구 신청을 보내고 싶습니다';

  @override
  String get friendBlockConfirm => '이 사용자를 차단하시겠습니까?';

  @override
  String get friendUnblockConfirm => '차단을 해제하시겠습니까?';

  @override
  String get friendBlockSuccess => '차단했습니다';

  @override
  String get friendUnblockSuccess => '차단을 해제했습니다';

  @override
  String get profilePageTitle => '프로필';

  @override
  String get profilePageSendMessage => '메시지 보내기';

  @override
  String get profilePageAddFriend => '친구 추가';

  @override
  String get profilePageAlreadyFriend => '이미 친구';

  @override
  String get profilePageBlocked => '차단됨';

  @override
  String get profilePageBlock => '차단';

  @override
  String get profilePageUnblock => '차단 해제';

  @override
  String get profilePageHidden => '이 사용자는 프로필을 비공개로 설정했습니다';

  @override
  String get profilePageFriendsOnly => '이 사용자는 친구에게만 프로필을 공개합니다';

  @override
  String get profilePageLppId => 'LPP ID';

  @override
  String get profilePageRemarkName => '별명';

  @override
  String get profilePageEditRemark => '별명 편집';

  @override
  String get profilePageSaveRemarkSuccess => '별명이 저장되었습니다';

  @override
  String get profilePageSaveRemarkFailed => '저장에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get searchTitle => '검색';

  @override
  String get searchHint => '전화번호, 이메일 또는 LPP ID로 검색';

  @override
  String get searchNoResults => '결과를 찾을 수 없습니다';

  @override
  String get searchMessages => '메시지';

  @override
  String get searchUsers => '사용자';

  @override
  String get searchFailed => '검색에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get scanTitle => 'QR 코드 스캔';

  @override
  String get scanFailed => '인식에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get scanInvalidQrCode => '유효하지 않은 QR 코드입니다';

  @override
  String get scanFlashOn => '플래시 켜기';

  @override
  String get scanFlashOff => '플래시 끄기';

  @override
  String get scanAlbum => '앨범에서 선택';

  @override
  String get favoritesTitle => '즐겨찾기';

  @override
  String get favoritesEmpty => '즐겨찾기가 없습니다';

  @override
  String get favoritesAll => '전체';

  @override
  String get favoritesText => '텍스트';

  @override
  String get favoritesImage => '이미지';

  @override
  String get favoritesVideo => '동영상';

  @override
  String get favoritesVoice => '음성';

  @override
  String get favoritesFile => '파일';

  @override
  String get favoritesOther => '기타';

  @override
  String get favoritesDeleteConfirm => '즐겨찾기에서 삭제하시겠습니까?';

  @override
  String get favoritesDeleteSuccess => '즐겨찾기에서 삭제되었습니다';

  @override
  String get favoritesDeleteFailed => '삭제에 실패했습니다';

  @override
  String get favoritesOriginalRecalled => '메시지가 취소되었습니다';

  @override
  String get favoritesViewOriginal => '원본 메시지 보기';

  @override
  String get favoritesSearchHint => '즐겨찾기 검색';

  @override
  String get favoritesNoResults => '해당하는 즐겨찾기를 찾을 수 없습니다';

  @override
  String get noticeTitle => '공지사항';

  @override
  String get noticeEmpty => '공지사항이 없습니다';

  @override
  String get noticeDetail => '공지사항 상세';

  @override
  String get noticePublishedAt => '게시일';

  @override
  String get noticePriorityNormal => '일반';

  @override
  String get noticePriorityImportant => '중요';

  @override
  String get noticePriorityUrgent => '긴급';

  @override
  String get organizationTitle => '조직도';

  @override
  String get organizationEmpty => '부서 정보가 없습니다';

  @override
  String get organizationMembers => '멤버';

  @override
  String get organizationDepartment => '부서';

  @override
  String get organizationPosition => '직책';

  @override
  String get organizationLeader => '리더';

  @override
  String get qrCodeTitle => '내 QR 코드';

  @override
  String get qrCodeSave => '앨범에 저장';

  @override
  String get qrCodeShare => '공유';

  @override
  String get qrCodeSaveSuccess => '앨범에 저장되었습니다';

  @override
  String get qrCodeSaveFailed => '저장에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get qrCodeRefresh => 'QR 코드 새로고침';

  @override
  String get qrCodeExpired => 'QR 코드가 만료되었습니다. 새로고침해 주십시오';

  @override
  String get qrCodeScanToAdd => 'QR 코드를 스캔하여 친구 추가';

  @override
  String get spacePersonal => '개인 공간';

  @override
  String get spaceEnterprise => '기업 공간';

  @override
  String get spaceJoinByCode => '기업 코드로 참가';

  @override
  String get spaceJoinByInvite => '초대 코드로 참가';

  @override
  String get spaceEnterCode => '기업 코드를 입력해 주십시오';

  @override
  String get spaceEnterInviteCode => '초대 코드를 입력해 주십시오';

  @override
  String get spaceSearchEnterprise => '기업 검색';

  @override
  String get spaceJoinRequestSent => '신청이 제출되었습니다. 승인을 기다려 주십시오';

  @override
  String get spaceJoinRequestPending => '승인 대기 중';

  @override
  String get spaceJoinRequestApproved => '신청이 승인되었습니다';

  @override
  String get spaceJoinRequestRejected => '신청이 거절되었습니다';

  @override
  String get spaceAlreadyMember => '이미 멤버입니다';

  @override
  String get spaceAutoApproved => '자동 승인되었습니다. 환영합니다!';

  @override
  String get spacePendingApprovalHint =>
      '회원가입이 완료되었습니다. 참가 신청이 제출되어 승인 대기 중입니다.';

  @override
  String get spaceNoSpaces => '공간이 없습니다';

  @override
  String get spaceInviteExpired => '초대 코드가 만료되었습니다';

  @override
  String get spaceInviteTargetMismatch => '이 초대 코드는 귀하의 계정에 사용할 수 없습니다';

  @override
  String get spaceAcceptInviteSuccess => '기업에 참가했습니다';

  @override
  String get spaceAcceptInviteFailed => '참가에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get spaceTenantSelectTitle => '공간 선택';

  @override
  String get spaceTenantSelectHint => '입장할 공간을 선택해 주십시오';

  @override
  String get spaceEnterPersonal => '개인 공간 입장';

  @override
  String get spaceEnterEnterprise => '기업 공간 입장';

  @override
  String get aboutTitle => 'LPP 정보';

  @override
  String get aboutVersion => '버전';

  @override
  String get aboutTerms => '이용약관';

  @override
  String get aboutPrivacy => '개인정보처리방침';

  @override
  String get aboutOpenSource => '오픈소스 라이선스';

  @override
  String get aboutCheckUpdate => '업데이트 확인';

  @override
  String get aboutLatestVersion => '최신 버전입니다';

  @override
  String get aboutUpdateAvailable => '업데이트가 있습니다';

  @override
  String get aboutUpdateNow => '지금 업데이트';

  @override
  String get aboutUpdateLater => '나중에';

  @override
  String get notificationTitle => '알림';

  @override
  String get notificationGlobalMute => '방해 금지';

  @override
  String get notificationSound => '소리';

  @override
  String get notificationVibration => '진동';

  @override
  String get notificationPreview => '알림 미리보기';

  @override
  String get notificationDndStart => '방해 금지 시작 시간';

  @override
  String get notificationDndEnd => '방해 금지 종료 시간';

  @override
  String get blacklistTitle => '차단 목록';

  @override
  String get blacklistEmpty => '차단한 사용자가 없습니다';

  @override
  String get blacklistRemove => '차단 해제';

  @override
  String get blacklistRemoveConfirm => '이 사용자의 차단을 해제하시겠습니까?';

  @override
  String get feedbackTitle => '피드백';

  @override
  String get feedbackTypeComplaint => '불만';

  @override
  String get feedbackTypeSuggestion => '제안';

  @override
  String get feedbackTypeBug => '버그 신고';

  @override
  String get feedbackContent => '내용';

  @override
  String get feedbackContentHint => '문제나 제안을 자세히 설명해 주십시오';

  @override
  String get feedbackContact => '연락처 (선택)';

  @override
  String get feedbackSubmit => '제출';

  @override
  String get feedbackSuccess => '피드백이 제출되었습니다. 감사합니다!';

  @override
  String get feedbackFailed => '제출에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get networkTitle => '네트워크';

  @override
  String get networkAutoSelect => '자동';

  @override
  String get networkManual => '수동';

  @override
  String get timezoneTitle => '시간대';

  @override
  String get timezoneAuto => '시스템 따르기';

  @override
  String get autoTranslateTitle => '자동 번역';

  @override
  String get autoTranslateEnabled => '자동 번역 사용';

  @override
  String get autoTranslateLanguage => '번역 대상 언어';

  @override
  String get displayTitle => '화면';

  @override
  String get displayFontSize => '글자 크기';

  @override
  String get displayChatBackground => '채팅 배경';

  @override
  String get displayDarkMode => '다크';

  @override
  String get displayDarkModeSystem => '시스템 따르기';

  @override
  String get displayDarkModeSystemHint => '시스템 설정에 따라 자동 전환';

  @override
  String get displayDarkModeOff => '라이트';

  @override
  String get displayDarkModeOffHint => '항상 라이트 테마 사용';

  @override
  String get displayDarkModeOn => '다크';

  @override
  String get displayDarkModeOnHint => '항상 다크 테마 사용';

  @override
  String get chatSettingsTitle => '채팅';

  @override
  String get chatHistoryTitle => '채팅 기록';

  @override
  String get chatHistoryClear => '기록 모두 삭제';

  @override
  String get chatHistoryClearConfirm => '모든 채팅 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.';

  @override
  String get chatHistoryClearSuccess => '채팅 기록이 삭제되었습니다';

  @override
  String get accountSecurityTitle => '계정 보안';

  @override
  String get accountSecurityChangePassword => '비밀번호 변경';

  @override
  String get accountSecurityChangeMobile => '전화번호 변경';

  @override
  String get accountSecurityChangeEmail => '이메일 변경';

  @override
  String get accountSecurityLoggedDevices => '로그인된 기기';

  @override
  String get accountSecurityDeactivate => '계정 탈퇴';

  @override
  String get accountSecurityDeactivateConfirm =>
      '계정을 탈퇴하면 7일 후 모든 데이터가 영구 삭제됩니다. 탈퇴하시겠습니까?';

  @override
  String get loggedDevicesTitle => '로그인된 기기';

  @override
  String get loggedDevicesCurrent => '현재 기기';

  @override
  String get loggedDevicesRevoke => '로그아웃';

  @override
  String get loggedDevicesRevokeConfirm => '이 기기에서 로그아웃하시겠습니까?';

  @override
  String get loggedDevicesRevokeSuccess => '기기에서 로그아웃했습니다';

  @override
  String get loggedDevicesRevokeFailed => '실패했습니다. 다시 시도해 주십시오';

  @override
  String get loggedDevicesLastActive => '마지막 활동';

  @override
  String get loggedDevicesTypeIos => 'iOS';

  @override
  String get loggedDevicesTypeAndroid => 'Android';

  @override
  String get loggedDevicesTypeWeb => '웹';

  @override
  String get loggedDevicesTypeDesktop => '데스크톱';

  @override
  String get loggedDevicesTypeUnknown => '알 수 없는 기기';

  @override
  String get privacySettingsTitle => '개인정보';

  @override
  String get privacySearchableByMobile => '전화번호로 검색 허용';

  @override
  String get privacySearchableByLppId => 'LPP ID로 검색 허용';

  @override
  String get privacyAllowFriendRequest => '친구 신청 허용';

  @override
  String get privacyProfileVisibility => '프로필 공개 범위';

  @override
  String get privacyEveryone => '모든 사람';

  @override
  String get privacyFriendsOfFriends => '친구의 친구';

  @override
  String get privacyNobody => '비공개';

  @override
  String get privacyFriendsOnly => '친구만';

  @override
  String get privacySaveSuccess => '설정이 저장되었습니다';

  @override
  String get privacySaveFailed => '저장에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get fontSizeTitle => '글자 크기';

  @override
  String get fontSizeSmall => '작게';

  @override
  String get fontSizeNormal => '보통';

  @override
  String get fontSizeLarge => '크게';

  @override
  String get fontSizeExtraLarge => '매우 크게';

  @override
  String get fontSizePreview => '미리보기';

  @override
  String get chatBackgroundTitle => '채팅 배경';

  @override
  String get chatBackgroundDefault => '기본';

  @override
  String get chatBackgroundCustom => '사용자 지정';

  @override
  String get chatBackgroundReset => '기본으로 재설정';

  @override
  String get termsTitle => '이용약관';

  @override
  String get privacyPolicyTitle => '개인정보처리방침';

  @override
  String get recentContactsTitle => '최근 연락처';

  @override
  String get recentContactsEmpty => '최근 연락처가 없습니다';

  @override
  String get inviteFriendsTitle => '친구 초대';

  @override
  String get inviteFriendsCopyLink => '초대 링크 복사';

  @override
  String get inviteFriendsLinkCopied => '초대 링크가 복사되었습니다';

  @override
  String get imageViewerTitle => '사진';

  @override
  String get imageViewerSave => '앨범에 저장';

  @override
  String get imageViewerSaveSuccess => '앨범에 저장되었습니다';

  @override
  String get imageViewerSaveFailed => '저장에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get customerServiceTitle => '고객 서비스';

  @override
  String get customerServiceQueue => '대기 중';

  @override
  String get customerServiceActive => '응대 중';

  @override
  String get customerServiceClaim => '수락';

  @override
  String get customerServiceTakeover => '인계';

  @override
  String get customerServiceClose => '응대 종료';

  @override
  String get customerServiceCloseConfirm => '이 응대를 종료하시겠습니까?';

  @override
  String get customerServiceNoQueue => '대기 중인 세션이 없습니다';

  @override
  String get customerServiceNoActive => '응대 중인 세션이 없습니다';

  @override
  String get customerServiceVisitor => '방문자';

  @override
  String get customerServiceCustomer => '고객';

  @override
  String get customerServiceAssignedTo => '담당자';

  @override
  String get customerServiceTransferConversation => '채팅 이관';

  @override
  String get marketingToolbar => '마케팅 도구';

  @override
  String get callIncoming => '수신 전화';

  @override
  String get callOutgoing => '발신 전화';

  @override
  String get callAccept => '수락';

  @override
  String get callReject => '거절';

  @override
  String get callHangup => '종료';

  @override
  String get callMissed => '부재중 전화';

  @override
  String get callDuration => '통화 시간';

  @override
  String get callAudio => '음성 통화';

  @override
  String get callVideo => '영상 통화';

  @override
  String get callConnecting => '연결 중...';

  @override
  String get callRinging => '연결 대기 중...';

  @override
  String get callEnded => '통화가 종료되었습니다';

  @override
  String get callFailed => '통화에 실패했습니다';

  @override
  String get callRejected => '통화가 거절되었습니다';

  @override
  String get callTimeout => '응답이 없습니다';

  @override
  String get callCancelled => '취소되었습니다';

  @override
  String get pendingJoinRequestsTitle => '새 신청';

  @override
  String get pendingJoinRequestsEmpty => '신청이 없습니다';

  @override
  String get pendingJoinRequestApprove => '승인';

  @override
  String get pendingJoinRequestReject => '거절';

  @override
  String get pendingJoinRequestApproveSuccess => '승인했습니다';

  @override
  String get pendingJoinRequestRejectSuccess => '거절했습니다';

  @override
  String get pendingJoinRequestFailed => '작업에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get myCustomersTitle => '담당 고객';

  @override
  String get myCustomersEmpty => '고객이 없습니다';

  @override
  String get groupListTitle => '그룹 목록';

  @override
  String get groupListEmpty => '그룹이 없습니다';

  @override
  String get addFriendTitle => '친구 추가';

  @override
  String get addFriendSearchHint => '전화번호 / 이메일 / LPP ID';

  @override
  String addFriendLppIdLabel(String lppId) {
    return 'LPP ID: $lppId';
  }

  @override
  String get addFriendButton => '친구 추가';

  @override
  String get addFriendCannotAddSelf => '자기 자신은 추가할 수 없습니다';

  @override
  String get addFriendUnsupportedUser =>
      '이 사용자는 친구로 추가할 수 없습니다. 바로 메시지를 보낼 수 있습니다.';

  @override
  String get addFriendMessageHint => '메시지를 입력해 주십시오';

  @override
  String get addFriendSendRequest => '신청 보내기';

  @override
  String get joinCompanyTitle => '기업 참가';

  @override
  String get joinCompanyCodeHint => '기업 코드를 입력해 주십시오';

  @override
  String get joinCompanySearchHint => '기업명 검색';

  @override
  String get joinCompanyApply => '참가 신청';

  @override
  String get joinCompanyApplySuccess => '신청이 제출되었습니다';

  @override
  String get joinCompanyApplyFailed => '신청에 실패했습니다. 다시 시도해 주십시오';

  @override
  String get joinCompanyAutoApproved => '자동 승인되었습니다. 환영합니다!';

  @override
  String get joinCompanyPending => '신청이 제출되었습니다. 승인을 기다려 주십시오';

  @override
  String get joinCompanyInviteCodeHint => '초대 코드를 입력해 주십시오';

  @override
  String get joinCompanyAcceptInvite => '초대 수락';

  @override
  String get joinCompanyNoResults => '기업을 찾을 수 없습니다';

  @override
  String joinCompanyMemberCount(int count) {
    return '$count명';
  }

  @override
  String get timezoneNameHawaii => '하와이';

  @override
  String get timezoneNameAlaska => '알래스카';

  @override
  String get timezoneNamePacificTime => '태평양 시간';

  @override
  String get timezoneNameMountainTime => '산악 시간';

  @override
  String get timezoneNameCentralTime => '중부 시간';

  @override
  String get timezoneNameEasternTime => '동부 시간';

  @override
  String get timezoneNameAtlanticTime => '대서양 시간';

  @override
  String get timezoneNameBrasilia => '브라질리아';

  @override
  String get timezoneNameAzores => '아조레스';

  @override
  String get timezoneNameLondonDublin => '런던/더블린';

  @override
  String get timezoneNameBerlinParisRome => '베를린/파리/로마';

  @override
  String get timezoneNameCairoHelsinki => '카이로/헬싱키';

  @override
  String get timezoneNameMoscowRiyadh => '모스크바/리야드';

  @override
  String get timezoneNameTehran => '테헤란';

  @override
  String get timezoneNameDubaiBaku => '두바이/바쿠';

  @override
  String get timezoneNameKabul => '카불';

  @override
  String get timezoneNameKarachiTashkent => '카라치/타슈켄트';

  @override
  String get timezoneNameMumbaiNewDelhi => '뭄바이/뉴델리';

  @override
  String get timezoneNameKathmandu => '카트만두';

  @override
  String get timezoneNameDhakaAlmaty => '다카/알마티';

  @override
  String get timezoneNameYangon => '양곤';

  @override
  String get timezoneNameBangkokHanoiJakarta => '방콕/하노이/자카르타';

  @override
  String get timezoneNameBeijingShanghaiHongKongTaipei => '베이징/상하이/홍콩/타이베이';

  @override
  String get timezoneNameTokyoSeoul => '도쿄/서울';

  @override
  String get timezoneNameAdelaide => '애들레이드';

  @override
  String get timezoneNameSydneyMelbourne => '시드니/멜버른';

  @override
  String get timezoneNameSolomonIslands => '솔로몬 제도';

  @override
  String get timezoneNameAucklandFiji => '오클랜드/피지';

  @override
  String get networkSmartSelectBestRoute => '최적 경로 자동 선택';

  @override
  String get networkTesting => '테스트 중...';

  @override
  String get networkTestingShort => '테스트 중';

  @override
  String networkLatencyMs(int ms) {
    return '지연 ${ms}ms';
  }

  @override
  String get networkConnectionMode => '연결 모드';

  @override
  String get networkDirectMode => '직접 연결 모드';

  @override
  String get networkProxyMode => '프록시 모드';

  @override
  String get networkDirectModeDesc => '서버에 직접 연결합니다';

  @override
  String get networkProxyModeDesc => '프록시 서버를 통해 연결합니다';

  @override
  String get networkDirectRoutes => '직접 연결 경로';

  @override
  String get networkProxyRoutes => '프록시 경로';

  @override
  String get networkTestAll => '전체 테스트';

  @override
  String get networkChinaTelecom => '차이나 텔레콤';

  @override
  String get networkChinaUnicom => '차이나 유니콤';

  @override
  String get networkChinaMobile => '차이나 모바일';

  @override
  String get networkHongKongNode => '홍콩 노드';

  @override
  String get networkSingaporeNode => '싱가포르 노드';

  @override
  String get networkJapanNode => '일본 노드';

  @override
  String get networkUnitedStatesNode => '미국 노드';

  @override
  String get networkHint =>
      '팁:\n• 직접 연결 모드: 빠르며 국내 사용에 적합합니다\n• 프록시 모드: 국경 간 통신에 더 안정적입니다\n• 새로고침 아이콘을 눌러 개별 경로 지연 시간을 테스트할 수 있습니다';
}
