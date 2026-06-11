// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Vietnamese (`vi`).
class AppLocalizationsVi extends AppLocalizations {
  AppLocalizationsVi([String locale = 'vi']) : super(locale);

  @override
  String get commonConfirm => 'Xác nhận';

  @override
  String get commonCancel => 'Hủy';

  @override
  String get commonSave => 'Lưu';

  @override
  String get commonEdit => 'Chỉnh sửa';

  @override
  String get commonDelete => 'Xóa';

  @override
  String get commonSearch => 'Tìm kiếm';

  @override
  String get commonLoading => 'Đang tải...';

  @override
  String get commonLoadFailed => 'Tải thất bại';

  @override
  String get commonRetry => 'Thử lại';

  @override
  String get commonEmpty => 'Không có dữ liệu';

  @override
  String get commonCopy => 'Sao chép';

  @override
  String get commonForward => 'Chuyển tiếp';

  @override
  String get commonFavorite => 'Yêu thích';

  @override
  String get commonClose => 'Đóng';

  @override
  String get commonSend => 'Gửi';

  @override
  String get commonDone => 'Xong';

  @override
  String get commonMore => 'Xem thêm';

  @override
  String get commonSettings => 'Cài đặt';

  @override
  String get commonCopied => 'Đã sao chép';

  @override
  String get commonUnknown => 'Không xác định';

  @override
  String get commonNotSet => 'Chưa đặt';

  @override
  String get commonUnbound => 'Chưa liên kết';

  @override
  String get commonViewAll => 'Xem tất cả';

  @override
  String get commonSubmit => 'Gửi';

  @override
  String get commonAdd => 'Thêm';

  @override
  String get commonRemove => 'Xóa';

  @override
  String get commonCreate => 'Tạo';

  @override
  String get commonUpdate => 'Cập nhật';

  @override
  String get commonUpload => 'Tải lên';

  @override
  String get commonShare => 'Chia sẻ';

  @override
  String get commonBlock => 'Chặn';

  @override
  String get commonUnblock => 'Bỏ chặn';

  @override
  String get commonMute => 'Tắt thông báo';

  @override
  String get commonUnmute => 'Bật thông báo';

  @override
  String get commonPin => 'Ghim';

  @override
  String get commonUnpin => 'Bỏ ghim';

  @override
  String get commonMarkRead => 'Đánh dấu đã đọc';

  @override
  String get commonMarkUnread => 'Đánh dấu chưa đọc';

  @override
  String get commonOnline => 'Trực tuyến';

  @override
  String get commonOffline => 'Ngoại tuyến';

  @override
  String get commonOperationFailed => 'Thao tác thất bại, vui lòng thử lại';

  @override
  String get commonNetworkError => 'Lỗi mạng, vui lòng kiểm tra kết nối';

  @override
  String get navMessages => 'Tin nhắn';

  @override
  String get navContacts => 'Danh bạ';

  @override
  String get navMe => 'Tôi';

  @override
  String get authLoginTitle => 'Đăng nhập StartLink';

  @override
  String get authTabMobile => 'Số điện thoại';

  @override
  String get authTabEmail => 'Email';

  @override
  String get authTabLoginName => 'StartLink ID';

  @override
  String get authHintMobile => 'Nhập số điện thoại';

  @override
  String get authHintEmail => 'Nhập địa chỉ email';

  @override
  String get authHintPassword => 'Nhập mật khẩu';

  @override
  String get authHintCode => 'Nhập mã xác minh';

  @override
  String get authHintLoginName => 'Nhập StartLink ID (lpp_xxxxxxxx)';

  @override
  String get authLoginButton => 'Đăng nhập / Đăng ký';

  @override
  String get authGetCode => 'Lấy mã';

  @override
  String authResendCode(int seconds) {
    return 'Gửi lại sau ${seconds}s';
  }

  @override
  String get authUsePassword => 'Dùng mật khẩu';

  @override
  String get authUseCode => 'Dùng mã xác minh';

  @override
  String get authAgreementPrefix => 'Tôi đã đọc và đồng ý với ';

  @override
  String get authAgreementAnd => ' và ';

  @override
  String get authTermsLink => 'Điều khoản dịch vụ';

  @override
  String get authPrivacyLink => 'Chính sách bảo mật';

  @override
  String get authCaptchaTitle => 'Xác minh bảo mật';

  @override
  String get authCaptchaHint => 'Nhập câu trả lời';

  @override
  String get authCaptchaFailed => 'Lấy mã xác minh thất bại, vui lòng thử lại';

  @override
  String get authErrorEmptyCode => 'Vui lòng nhập mã xác minh';

  @override
  String get authErrorEmptyPassword => 'Vui lòng nhập mật khẩu';

  @override
  String get authErrorEmptyLoginName => 'Vui lòng nhập StartLink ID';

  @override
  String get authErrorWrongCredentials => 'Tài khoản hoặc mật khẩu không đúng';

  @override
  String get authDeactivatingTitle => 'Đang xóa tài khoản';

  @override
  String get authDeactivatingContent =>
      'Tài khoản của bạn đang trong thời gian chờ xóa (7 ngày).\n\nĐể hủy xóa, nhấn \"Hủy xóa\"; nếu không nhấn \"Tiếp tục\" để vào ứng dụng.';

  @override
  String get authContinueUse => 'Tiếp tục';

  @override
  String get authCancelDeactivation => 'Hủy xóa';

  @override
  String get authDeactivationCancelled => 'Đã hủy xóa tài khoản';

  @override
  String get authDeactivationCancelFailed => 'Hủy thất bại, vui lòng thử lại';

  @override
  String get authLogout => 'Đăng xuất';

  @override
  String get authLogoutConfirm => 'Bạn có chắc muốn đăng xuất?';

  @override
  String get authSendingCode => 'Đang gửi...';

  @override
  String get authCodeSent => 'Đã gửi mã xác minh';

  @override
  String get authLoginFailed => 'Đăng nhập thất bại, vui lòng thử lại';

  @override
  String get authRegisterFailed => 'Đăng ký thất bại, vui lòng thử lại';

  @override
  String get authEnterpriseCode => 'Mã doanh nghiệp';

  @override
  String get authEnterpriseCodeHint => 'Nhập mã doanh nghiệp';

  @override
  String get authPendingApproval =>
      'Đăng ký thành công. Yêu cầu tham gia doanh nghiệp đã được gửi và đang chờ phê duyệt.';

  @override
  String get homeTitle => 'Tin nhắn';

  @override
  String get homePersonalSpace => 'Không gian cá nhân';

  @override
  String get homeOfficialService => 'Dịch vụ chính thức';

  @override
  String get homeSwitchSpace => 'Chuyển không gian';

  @override
  String get homeSpaceSubtitle => 'Cá nhân · Doanh nghiệp';

  @override
  String get homeJoinEnterprise => 'Tham gia doanh nghiệp';

  @override
  String get homeCreateGroup => 'Tạo nhóm';

  @override
  String get homeAddFriend => 'Thêm bạn bè';

  @override
  String get homeScan => 'Quét mã QR';

  @override
  String get homeJoinNewSpace => 'Tham gia không gian mới';

  @override
  String get homeSearchConversation => 'Tìm kiếm cuộc trò chuyện';

  @override
  String get homeNoMessages => 'Chưa có tin nhắn';

  @override
  String get homeDeleteConversation => 'Xóa cuộc trò chuyện';

  @override
  String get homeDeleteConversationConfirm =>
      'Xóa cuộc trò chuyện này? Lịch sử chat sẽ bị xóa.';

  @override
  String get homePersonalNote => 'Tôi (Ghi chú cá nhân)';

  @override
  String get homeWorkNote => 'Tôi (Ghi chú công việc)';

  @override
  String homeConversationCount(int count) {
    return '$count cuộc trò chuyện';
  }

  @override
  String homeUnreadCount(int count) {
    return '$count chưa đọc';
  }

  @override
  String get chatInputHint => 'Nhập tin nhắn...';

  @override
  String get chatVoiceHint => 'Giữ để nói';

  @override
  String get chatVoiceRelease => 'Thả để gửi';

  @override
  String get chatVoiceCancel => 'Vuốt lên để hủy';

  @override
  String get chatMenuCopy => 'Sao chép';

  @override
  String get chatMenuForward => 'Chuyển tiếp';

  @override
  String get chatMenuRecall => 'Thu hồi';

  @override
  String get chatMenuDelete => 'Xóa';

  @override
  String get chatMenuFavorite => 'Yêu thích';

  @override
  String get chatMenuReply => 'Trả lời';

  @override
  String get chatMenuMultiSelect => 'Chọn nhiều';

  @override
  String get chatMenuTranslate => 'Dịch';

  @override
  String get chatMenuVoiceToText => 'Chuyển thành văn bản';

  @override
  String get chatStatusRecalled => 'Tin nhắn đã được thu hồi';

  @override
  String get chatRecallSuccess => 'Đã thu hồi';

  @override
  String get chatRecallFailed => 'Thu hồi thất bại';

  @override
  String get chatRecallTimeout => 'Không thể thu hồi tin nhắn quá 2 phút';

  @override
  String get chatTranslateFailed => 'Dịch thất bại, vui lòng thử lại';

  @override
  String get chatTranslateNotConfigured => 'Dịch vụ dịch thuật chưa khả dụng';

  @override
  String get chatVoiceToTextFailed => 'Chuyển đổi thất bại, vui lòng thử lại';

  @override
  String get chatForwardSuccess => 'Đã chuyển tiếp';

  @override
  String get chatForwardFailed => 'Chuyển tiếp thất bại, vui lòng thử lại';

  @override
  String get chatNoConversations => 'Không có cuộc trò chuyện để chuyển tiếp';

  @override
  String get chatSendFailed => 'Gửi thất bại';

  @override
  String get chatResend => 'Gửi lại';

  @override
  String get chatNotFriend => 'Không phải bạn bè';

  @override
  String get chatNotFriendHint => 'Bạn chưa là bạn bè, không thể gửi tin nhắn';

  @override
  String get chatMutedHint => 'Tất cả thành viên đang bị tắt tiếng';

  @override
  String get chatFileUploadFailed => 'Tải file thất bại, vui lòng thử lại';

  @override
  String get chatFileStatusNotDownloaded => 'Chưa tải';

  @override
  String get chatFileStatusDownloaded => 'Đã tải';

  @override
  String get chatFileStatusUploading => 'Đang tải lên';

  @override
  String get chatFileStatusUploadFailed => 'Tải lên thất bại';

  @override
  String get chatCardSendFailed => 'Gửi danh thiếp thất bại';

  @override
  String get chatFavoriteSuccess => 'Đã thêm vào yêu thích';

  @override
  String get chatFavoriteFailed => 'Thêm vào yêu thích thất bại';

  @override
  String get chatLoadFailed => 'Tải thất bại';

  @override
  String get chatImageMessage => '[Hình ảnh]';

  @override
  String get chatVoiceMessage => '[Giọng nói]';

  @override
  String get chatVideoMessage => '[Video]';

  @override
  String get chatFileMessage => '[File]';

  @override
  String get chatLocationMessage => '[Vị trí]';

  @override
  String get chatContactCardMessage => '[Danh thiếp]';

  @override
  String get chatCallLogMessage => '[Lịch sử cuộc gọi]';

  @override
  String chatGroupMemberCount(int count) {
    return '($count)';
  }

  @override
  String chatReadCount(int count) {
    return '$count người đã đọc';
  }

  @override
  String get chatUnread => 'Chưa đọc';

  @override
  String get chatRecalledSelf => 'Bạn đã thu hồi một tin nhắn';

  @override
  String chatRecalledPeer(String sender) {
    return '$sender đã thu hồi một tin nhắn';
  }

  @override
  String chatTranslationPrefix(String translation) {
    return 'Bản dịch: $translation';
  }

  @override
  String get chatMessageDeleted => 'Tin nhắn đã bị xóa';

  @override
  String get chatPeer => 'Đối phương';

  @override
  String get chatSelf => 'Tôi';

  @override
  String get chatGenericMessage => '[Tin nhắn]';

  @override
  String get chatVoiceHideText => 'Ẩn văn bản';

  @override
  String get chatVoiceShowText => 'Chuyển thành văn bản';

  @override
  String get chatFileDefaultName => 'Tệp';

  @override
  String get chatContactDefaultName => 'Liên hệ';

  @override
  String get chatContactCardTitle => 'Danh thiếp';

  @override
  String get chatCallMissed => 'Nhỡ cuộc gọi';

  @override
  String get chatCallCancelled => 'Đã hủy';

  @override
  String get chatCallRejected => 'Đã từ chối';

  @override
  String get chatCallDisconnected => 'Mất kết nối';

  @override
  String get chatCallEnded => 'Cuộc gọi đã kết thúc';

  @override
  String get chatCallFailed => 'Cuộc gọi thất bại';

  @override
  String chatCallDuration(String duration) {
    return 'Thời lượng $duration';
  }

  @override
  String get chatVideoCallTitle => 'Cuộc gọi video';

  @override
  String get chatVoiceCallTitle => 'Cuộc gọi thoại';

  @override
  String get chatToolPhotos => 'Ảnh';

  @override
  String get chatToolCamera => 'Máy ảnh';

  @override
  String get chatToolFile => 'Tệp';

  @override
  String get chatToolLocation => 'Vị trí';

  @override
  String get chatToolContactCard => 'Liên hệ';

  @override
  String get chatToolVoiceCall => 'Gọi thoại';

  @override
  String get chatToolVideoCall => 'Gọi video';

  @override
  String get chatToolFavorites => 'Yêu thích';

  @override
  String get chatFileTooLarge => 'Tệp vượt quá giới hạn (100 MB)';

  @override
  String get chatInputMutedAdminOnly =>
      'Chỉ chủ nhóm hoặc thành viên được chỉ định có thể nói.';

  @override
  String get chatImageUploadUnsupported =>
      'Tải ảnh thất bại. Máy chủ chưa hỗ trợ.';

  @override
  String get chatFavoriteLongPressHint =>
      'Nhấn giữ tin nhắn để thêm vào yêu thích';

  @override
  String chatSelectedCount(int count) {
    return 'Đã chọn $count';
  }

  @override
  String get chatLocationSheetTitle => 'Gửi vị trí';

  @override
  String get chatLocationNameLabel => 'Tên địa điểm';

  @override
  String get chatLocationNameHint => 'VD: Văn phòng, địa chỉ khách hàng';

  @override
  String get chatLocationAddressLabel => 'Địa chỉ chi tiết';

  @override
  String get chatLocationOptionalHint => 'Không bắt buộc';

  @override
  String get chatLocationLatitudeLabel => 'Vĩ độ';

  @override
  String get chatLocationLatitudeHint => '-90 đến 90';

  @override
  String get chatLocationLongitudeLabel => 'Kinh độ';

  @override
  String get chatLocationLongitudeHint => '-180 đến 180';

  @override
  String chatLocationValidationRequired(String label) {
    return 'Vui lòng nhập $label';
  }

  @override
  String chatLocationValidationRange(String label) {
    return '$label không đúng phạm vi';
  }

  @override
  String get chatLocationDefaultTitle => 'Vị trí';

  @override
  String get chatMutedFullNotice =>
      'Nhóm này đang tắt tiếng toàn bộ. Chỉ chủ nhóm hoặc thành viên được chỉ định có thể nói.';

  @override
  String get chatNotFriendSendBlocked =>
      'Bạn không còn là bạn bè với đối phương nên không thể gửi tin nhắn';

  @override
  String get chatPersonalNotesTitle => 'Ghi chú cá nhân';

  @override
  String get chatWorkNotesTitle => 'Ghi chú công việc';

  @override
  String get chatPersonalNotesDescription =>
      'Ghi lại suy nghĩ cá nhân và lưu thông tin quan trọng tại đây\nĐồng bộ giữa các thiết bị, truy cập mọi lúc';

  @override
  String get chatWorkNotesDescription =>
      'Ghi lại việc cần làm và lưu tài liệu công việc tại đây\nKhông gian nhóm được tách riêng và bảo mật';

  @override
  String get chatNoMessages => 'Chưa có tin nhắn';

  @override
  String chatReplyTo(String sender) {
    return 'Trả lời $sender';
  }

  @override
  String chatFeatureComingSoon(String feature) {
    return '$feature sắp ra mắt';
  }

  @override
  String get chatForwardSelectTitle => 'Chọn cuộc trò chuyện';

  @override
  String get chatContactSelectTitle => 'Chọn liên hệ';

  @override
  String get chatNoContacts => 'Không có liên hệ';

  @override
  String get contactsTitle => 'Danh bạ';

  @override
  String get contactsSearch => 'Tìm kiếm liên hệ';

  @override
  String get contactsNewFriends => 'Bạn bè mới';

  @override
  String get contactsGroups => 'Nhóm';

  @override
  String get contactsFavorites => 'Yêu thích';

  @override
  String get contactsRecent => 'Liên hệ gần đây';

  @override
  String get contactsOrganization => 'Sơ đồ tổ chức';

  @override
  String get contactsAnnouncement => 'Thông báo';

  @override
  String get contactsNewApplications => 'Yêu cầu mới';

  @override
  String get contactsCustomerGroups => 'Nhóm khách hàng';

  @override
  String get contactsAllCustomers => 'Tất cả khách hàng';

  @override
  String get contactsMyCustomers => 'Khách hàng của tôi';

  @override
  String get contactsViewAll => 'Xem tất cả';

  @override
  String get contactsMyContacts => 'Liên hệ của tôi';

  @override
  String get contactsMyAdvisor => 'Cố vấn của tôi';

  @override
  String get contactsNoAdvisor => 'Chưa được phân công cố vấn';

  @override
  String get contactsAdvisorLoading => 'Đang tải...';

  @override
  String get contactsNavigateFailed => 'Điều hướng thất bại, vui lòng thử lại';

  @override
  String get contactsEmpty => 'Không có liên hệ';

  @override
  String get contactsNoAnnouncement => 'Không có thông báo';

  @override
  String get contactsOfficialBadge => 'Chính thức';

  @override
  String get contactsCustomerBadge => 'Khách hàng';

  @override
  String get contactsEmptyCustomers => 'Không có khách hàng';

  @override
  String get myTitle => 'Tôi';

  @override
  String get myEnterpriseInfo => 'Thông tin doanh nghiệp';

  @override
  String get myEnterpriseManage => 'Quản lý doanh nghiệp';

  @override
  String get myQrCode => 'Danh thiếp QR';

  @override
  String get myFavorites => 'Yêu thích';

  @override
  String get myLanguage => 'Ngôn ngữ';

  @override
  String get myTimezone => 'Múi giờ';

  @override
  String get myAutoTranslate => 'Tự động dịch';

  @override
  String get myNetworkSwitch => 'Mạng';

  @override
  String get mySettings => 'Cài đặt';

  @override
  String get myLogout => 'Đăng xuất';

  @override
  String get myLogoutConfirm => 'Bạn có chắc muốn đăng xuất?';

  @override
  String get myLeaveEnterprise => 'Rời doanh nghiệp';

  @override
  String get myLeaveEnterpriseConfirm =>
      'Bạn có chắc muốn rời doanh nghiệp này? Bạn sẽ mất quyền truy cập dữ liệu doanh nghiệp.';

  @override
  String get myLeaveEnterpriseSuccess => 'Đã rời doanh nghiệp';

  @override
  String get myLeaveEnterpriseFailed => 'Rời thất bại, vui lòng thử lại';

  @override
  String get myLppIdCopied => 'Đã sao chép StartLink ID';

  @override
  String myLppIdLabel(String lppId) {
    return 'StartLink ID: $lppId';
  }

  @override
  String myFriendCount(int count) {
    return '$count bạn bè';
  }

  @override
  String get myAutoSelect => 'Tự động';

  @override
  String get myPresenceStatus => 'Trạng thái online';

  @override
  String get myPresenceStatusTitle => 'Đặt trạng thái online';

  @override
  String get myPresenceOnline => 'Online';

  @override
  String get myPresenceBusy => 'Bận';

  @override
  String get myPresenceAway => 'Vắng mặt';

  @override
  String get myPresenceInvisible => 'Ẩn';

  @override
  String get profileTitle => 'Hồ sơ';

  @override
  String get profileName => 'Tên';

  @override
  String get profileGender => 'Giới tính';

  @override
  String get profileBirthday => 'Ngày sinh';

  @override
  String get profileRegion => 'Khu vực';

  @override
  String get profileSignature => 'Giới thiệu';

  @override
  String get profileSignatureHint => 'Giới thiệu về bản thân';

  @override
  String get profileTapTapText => 'Tap Tap';

  @override
  String get profileTapTapHint => 'Văn bản hiển thị khi tap (tối đa 20 ký tự)';

  @override
  String get profileAccountSection => 'Tài khoản';

  @override
  String get profileBasicSection => 'Thông tin cơ bản';

  @override
  String get profileLppId => 'StartLink ID';

  @override
  String get profileLppIdNotSet => 'Chưa đặt';

  @override
  String get profileMobile => 'Số điện thoại';

  @override
  String get profileMobileUnbound => 'Chưa liên kết';

  @override
  String get profileEmail => 'Email';

  @override
  String get profileEmailUnbound => 'Chưa liên kết';

  @override
  String get profileQrCode => 'Mã QR của tôi';

  @override
  String get profileChangePassword => 'Đổi mật khẩu';

  @override
  String get profileGenderMale => 'Nam';

  @override
  String get profileGenderFemale => 'Nữ';

  @override
  String get profileGenderOther => 'Khác';

  @override
  String get profileGenderUnset => 'Chưa đặt';

  @override
  String get profileSaveFailed => 'Lưu thất bại, vui lòng thử lại';

  @override
  String get profileLppIdTitle => 'StartLink ID';

  @override
  String get profileLppIdSetOnce =>
      'StartLink ID chỉ có thể thay đổi một lần. Vui lòng điền cẩn thận.';

  @override
  String get profileLppIdChangeFailed =>
      'Thay đổi thất bại (StartLink ID chỉ thay đổi được một lần)';

  @override
  String get profileChangePasswordOld => 'Mật khẩu hiện tại';

  @override
  String get profileChangePasswordNew => 'Mật khẩu mới';

  @override
  String get profileChangePasswordConfirm => 'Xác nhận mật khẩu mới';

  @override
  String get profileChangePasswordMismatch => 'Mật khẩu không khớp';

  @override
  String get profileChangePasswordSuccess =>
      'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.';

  @override
  String get profileChangePasswordFailed =>
      'Đổi mật khẩu thất bại, vui lòng thử lại';

  @override
  String get settingsTitle => 'Cài đặt';

  @override
  String get settingsSectionEnterprise => 'Doanh nghiệp';

  @override
  String get settingsSectionAccount => 'Tài khoản';

  @override
  String get settingsSectionGeneral => 'Chung';

  @override
  String get settingsSectionFeatures => 'Tính năng';

  @override
  String get settingsSectionAbout => 'Giới thiệu';

  @override
  String get settingsEnterpriseInfo => 'Thông tin doanh nghiệp';

  @override
  String get settingsProfile => 'Hồ sơ';

  @override
  String get settingsAccountSecurity => 'Bảo mật tài khoản';

  @override
  String get settingsNotification => 'Thông báo';

  @override
  String get settingsDisplay => 'Hiển thị';

  @override
  String get settingsFriendPrivacy => 'Quyền riêng tư';

  @override
  String get settingsChat => 'Chat';

  @override
  String get settingsChatHistory => 'Lịch sử chat';

  @override
  String get settingsAbout => 'Về StartLink';

  @override
  String get settingsLanguage => 'Ngôn ngữ';

  @override
  String get settingsTimezone => 'Múi giờ';

  @override
  String get settingsAutoTranslate => 'Tự động dịch';

  @override
  String get settingsNetworkSwitch => 'Mạng';

  @override
  String get enterpriseInfoTitle => 'Thông tin doanh nghiệp';

  @override
  String get enterpriseName => 'Tên doanh nghiệp';

  @override
  String get enterpriseDescription => 'Mô tả';

  @override
  String get enterpriseUpdateSuccess => 'Cập nhật thành công';

  @override
  String get enterpriseUpdateFailed => 'Cập nhật thất bại, vui lòng thử lại';

  @override
  String get enterpriseLeave => 'Rời doanh nghiệp';

  @override
  String get enterpriseLeaveConfirm => 'Bạn có chắc muốn rời doanh nghiệp này?';

  @override
  String get enterpriseLeaveSuccess => 'Đã rời doanh nghiệp';

  @override
  String get enterpriseLeaveFailed => 'Rời thất bại, vui lòng thử lại';

  @override
  String get enterpriseLeaveOwnerError =>
      'Chủ sở hữu không thể rời trực tiếp. Vui lòng chuyển quyền sở hữu trước.';

  @override
  String get enterpriseMemberCount => 'Số thành viên';

  @override
  String get enterpriseCreatedAt => 'Ngày tạo';

  @override
  String get enterpriseCode => 'Mã doanh nghiệp';

  @override
  String get enterpriseInviteMembers => 'Mời thành viên';

  @override
  String get enterpriseCopyInviteCode => 'Sao chép mã mời';

  @override
  String get enterpriseInviteCodeCopied => 'Đã sao chép mã mời';

  @override
  String get groupCreateTitle => 'Tạo nhóm';

  @override
  String get groupNameHint => 'Nhập tên nhóm';

  @override
  String get groupCreateSuccess => 'Tạo nhóm thành công';

  @override
  String get groupCreateFailed => 'Tạo nhóm thất bại';

  @override
  String get groupSettings => 'Cài đặt nhóm';

  @override
  String get groupName => 'Tên nhóm';

  @override
  String get groupAvatar => 'Ảnh nhóm';

  @override
  String get groupAnnouncement => 'Thông báo nhóm';

  @override
  String get groupMembers => 'Thành viên';

  @override
  String get groupAddMember => 'Thêm thành viên';

  @override
  String get groupRemoveMember => 'Xóa thành viên';

  @override
  String get groupRemoveMemberConfirm => 'Xóa thành viên này?';

  @override
  String get groupSetAdmin => 'Đặt làm quản trị viên';

  @override
  String get groupRemoveAdmin => 'Xóa quyền quản trị';

  @override
  String get groupTransferOwner => 'Chuyển quyền sở hữu';

  @override
  String get groupTransferOwnerConfirm =>
      'Chuyển quyền sở hữu cho thành viên này?';

  @override
  String get groupTransferOwnerSuccess => 'Đã chuyển quyền sở hữu';

  @override
  String get groupTransferOwnerFailed => 'Chuyển thất bại, vui lòng thử lại';

  @override
  String get groupLeave => 'Rời nhóm';

  @override
  String get groupLeaveConfirm => 'Rời nhóm này?';

  @override
  String get groupLeaveSuccess => 'Đã rời nhóm';

  @override
  String get groupLeaveFailed => 'Rời thất bại, vui lòng thử lại';

  @override
  String get groupDissolve => 'Giải tán nhóm';

  @override
  String get groupDissolveConfirm =>
      'Giải tán nhóm này? Tất cả thành viên sẽ bị xóa.';

  @override
  String get groupDissolveSuccess => 'Đã giải tán nhóm';

  @override
  String get groupDissolveFailed => 'Giải tán thất bại, vui lòng thử lại';

  @override
  String get groupQrCode => 'Mã QR nhóm';

  @override
  String get groupMuteAll => 'Tắt tiếng tất cả';

  @override
  String get groupMuteAllOn => 'Bật tắt tiếng tất cả';

  @override
  String get groupMuteAllOff => 'Tắt tắt tiếng tất cả';

  @override
  String get groupAllowMemberInvite => 'Cho phép thành viên mời';

  @override
  String get groupAllowMemberModifyTitle => 'Cho phép thành viên đổi tên nhóm';

  @override
  String get groupAllowMemberAtAll => 'Cho phép thành viên @tất cả';

  @override
  String get groupAllowMemberViewMemberList =>
      'Cho phép xem danh sách thành viên';

  @override
  String get groupAllowQrCodeJoin => 'Cho phép tham gia bằng mã QR';

  @override
  String get groupRequireApproval => 'Yêu cầu phê duyệt khi tham gia';

  @override
  String get groupAllowMemberAddFriend =>
      'Cho phép thành viên kết bạn với nhau';

  @override
  String get groupRoleOwner => 'Chủ nhóm';

  @override
  String get groupRoleAdmin => 'Quản trị viên';

  @override
  String get groupRoleMember => 'Thành viên';

  @override
  String get groupNoMembers => 'Không có thành viên';

  @override
  String get groupNoAnnouncements => 'Không có thông báo';

  @override
  String get groupCreateAnnouncement => 'Đăng thông báo';

  @override
  String get groupEditAnnouncement => 'Chỉnh sửa thông báo';

  @override
  String get groupDeleteAnnouncement => 'Xóa thông báo';

  @override
  String get groupDeleteAnnouncementConfirm => 'Xóa thông báo này?';

  @override
  String get groupAnnouncementTitle => 'Tiêu đề';

  @override
  String get groupAnnouncementContent => 'Nội dung';

  @override
  String get groupAnnouncementPin => 'Ghim thông báo';

  @override
  String groupMemberCount(int count) {
    return '$count thành viên';
  }

  @override
  String groupSelectedCount(int count) {
    return 'Đã chọn $count';
  }

  @override
  String get groupJoinRequestApprove => 'Chấp nhận';

  @override
  String get groupJoinRequestReject => 'Từ chối';

  @override
  String get groupJoinRequests => 'Yêu cầu tham gia';

  @override
  String get groupNoJoinRequests => 'Không có yêu cầu tham gia';

  @override
  String get groupReadReceipts => 'Xác nhận đã đọc';

  @override
  String groupReadCount(int count) {
    return '$count đã đọc';
  }

  @override
  String groupUnreadCount(int count) {
    return '$count chưa đọc';
  }

  @override
  String get friendAddTitle => 'Thêm bạn bè';

  @override
  String get friendSearchHint => 'SĐT / Email / StartLink ID';

  @override
  String get friendRequestSent => 'Đã gửi lời mời kết bạn';

  @override
  String get friendRequestFailed => 'Gửi thất bại, vui lòng thử lại';

  @override
  String get friendAlreadyFriend => 'Đã là bạn bè';

  @override
  String get friendNewFriendsTitle => 'Bạn bè mới';

  @override
  String get friendNoRequests => 'Không có lời mời kết bạn';

  @override
  String get friendAccept => 'Chấp nhận';

  @override
  String get friendReject => 'Từ chối';

  @override
  String get friendAccepted => 'Đã chấp nhận';

  @override
  String get friendRejected => 'Đã từ chối';

  @override
  String get friendDeleteConfirm => 'Xóa bạn bè này?';

  @override
  String get friendDeleteSuccess => 'Đã xóa bạn bè';

  @override
  String get friendDeleteFailed => 'Xóa thất bại, vui lòng thử lại';

  @override
  String get friendRemarkName => 'Biệt danh';

  @override
  String get friendGroupName => 'Nhóm';

  @override
  String get friendSendMessage => 'Nhắn tin';

  @override
  String get friendMatchTypeLppId => 'Khớp theo StartLink ID';

  @override
  String get friendMatchTypeMobile => 'Khớp theo SĐT';

  @override
  String get friendMatchTypeEmail => 'Khớp theo email';

  @override
  String get friendSearchEmpty => 'Không tìm thấy người dùng';

  @override
  String get friendAddMessage => 'Tôi muốn kết bạn với bạn';

  @override
  String get friendBlockConfirm => 'Chặn người dùng này?';

  @override
  String get friendUnblockConfirm => 'Bỏ chặn người dùng này?';

  @override
  String get friendBlockSuccess => 'Đã chặn';

  @override
  String get friendUnblockSuccess => 'Đã bỏ chặn';

  @override
  String get profilePageTitle => 'Hồ sơ';

  @override
  String get profilePageSendMessage => 'Nhắn tin';

  @override
  String get profilePageAddFriend => 'Kết bạn';

  @override
  String get profilePageAlreadyFriend => 'Đã là bạn bè';

  @override
  String get profilePageBlocked => 'Đã chặn';

  @override
  String get profilePageBlock => 'Chặn';

  @override
  String get profilePageUnblock => 'Bỏ chặn';

  @override
  String get profilePageHidden => 'Người dùng này đã ẩn hồ sơ';

  @override
  String get profilePageFriendsOnly =>
      'Người dùng này chỉ hiển thị hồ sơ cho bạn bè';

  @override
  String get profilePageLppId => 'StartLink ID';

  @override
  String get profilePageRemarkName => 'Biệt danh';

  @override
  String get profilePageEditRemark => 'Chỉnh sửa biệt danh';

  @override
  String get profilePageSaveRemarkSuccess => 'Đã lưu biệt danh';

  @override
  String get profilePageSaveRemarkFailed => 'Lưu thất bại, vui lòng thử lại';

  @override
  String get searchTitle => 'Tìm kiếm';

  @override
  String get searchHint => 'Tìm theo SĐT, email hoặc StartLink ID';

  @override
  String get searchNoResults => 'Không tìm thấy kết quả';

  @override
  String get searchMessages => 'Tin nhắn';

  @override
  String get searchUsers => 'Người dùng';

  @override
  String get searchFailed => 'Tìm kiếm thất bại, vui lòng thử lại';

  @override
  String get scanTitle => 'Quét mã QR';

  @override
  String get scanFailed => 'Nhận dạng thất bại, vui lòng thử lại';

  @override
  String get scanInvalidQrCode => 'Mã QR không hợp lệ';

  @override
  String get scanFlashOn => 'Bật đèn flash';

  @override
  String get scanFlashOff => 'Tắt đèn flash';

  @override
  String get scanAlbum => 'Chọn từ thư viện';

  @override
  String get favoritesTitle => 'Yêu thích';

  @override
  String get favoritesEmpty => 'Chưa có mục yêu thích';

  @override
  String get favoritesAll => 'Tất cả';

  @override
  String get favoritesText => 'Văn bản';

  @override
  String get favoritesImage => 'Hình ảnh';

  @override
  String get favoritesVideo => 'Video';

  @override
  String get favoritesVoice => 'Giọng nói';

  @override
  String get favoritesFile => 'File';

  @override
  String get favoritesOther => 'Khác';

  @override
  String get favoritesDeleteConfirm => 'Xóa khỏi yêu thích?';

  @override
  String get favoritesDeleteSuccess => 'Đã xóa khỏi yêu thích';

  @override
  String get favoritesDeleteFailed => 'Xóa thất bại';

  @override
  String get favoritesOriginalRecalled => 'Tin nhắn đã được thu hồi';

  @override
  String get favoritesViewOriginal => 'Xem tin nhắn gốc';

  @override
  String get favoritesSearchHint => 'Tìm kiếm yêu thích';

  @override
  String get favoritesNoResults => 'Không tìm thấy mục yêu thích phù hợp';

  @override
  String get noticeTitle => 'Thông báo';

  @override
  String get noticeEmpty => 'Không có thông báo';

  @override
  String get noticeDetail => 'Chi tiết thông báo';

  @override
  String get noticePublishedAt => 'Ngày đăng';

  @override
  String get noticePriorityNormal => 'Thường';

  @override
  String get noticePriorityImportant => 'Quan trọng';

  @override
  String get noticePriorityUrgent => 'Khẩn cấp';

  @override
  String get organizationTitle => 'Sơ đồ tổ chức';

  @override
  String get organizationEmpty => 'Không có thông tin phòng ban';

  @override
  String get organizationMembers => 'Thành viên';

  @override
  String get organizationDepartment => 'Phòng ban';

  @override
  String get organizationPosition => 'Chức vụ';

  @override
  String get organizationLeader => 'Trưởng nhóm';

  @override
  String get qrCodeTitle => 'Mã QR của tôi';

  @override
  String get qrCodeSave => 'Lưu vào thư viện';

  @override
  String get qrCodeShare => 'Chia sẻ';

  @override
  String get qrCodeSaveSuccess => 'Đã lưu vào thư viện';

  @override
  String get qrCodeSaveFailed => 'Lưu thất bại, vui lòng thử lại';

  @override
  String get qrCodeRefresh => 'Làm mới mã QR';

  @override
  String get qrCodeExpired => 'Mã QR đã hết hạn, vui lòng làm mới';

  @override
  String get qrCodeScanToAdd => 'Quét mã QR để kết bạn với tôi';

  @override
  String get spacePersonal => 'Cá nhân';

  @override
  String get spaceEnterprise => 'Doanh nghiệp';

  @override
  String get spaceJoinByCode => 'Tham gia bằng mã doanh nghiệp';

  @override
  String get spaceJoinByInvite => 'Tham gia bằng mã mời';

  @override
  String get spaceEnterCode => 'Nhập mã doanh nghiệp';

  @override
  String get spaceEnterInviteCode => 'Nhập mã mời';

  @override
  String get spaceSearchEnterprise => 'Tìm kiếm doanh nghiệp';

  @override
  String get spaceJoinRequestSent => 'Yêu cầu đã được gửi, đang chờ phê duyệt';

  @override
  String get spaceJoinRequestPending => 'Đang chờ phê duyệt';

  @override
  String get spaceJoinRequestApproved => 'Yêu cầu đã được chấp nhận';

  @override
  String get spaceJoinRequestRejected => 'Yêu cầu đã bị từ chối';

  @override
  String get spaceAlreadyMember => 'Bạn đã là thành viên';

  @override
  String get spaceAutoApproved => 'Đã được tự động chấp nhận. Chào mừng!';

  @override
  String get spacePendingApprovalHint =>
      'Đăng ký thành công. Yêu cầu tham gia đã được gửi và đang chờ phê duyệt.';

  @override
  String get spaceNoSpaces => 'Không có không gian';

  @override
  String get spaceInviteExpired => 'Mã mời đã hết hạn';

  @override
  String get spaceInviteTargetMismatch =>
      'Mã mời này không dành cho tài khoản của bạn';

  @override
  String get spaceAcceptInviteSuccess => 'Đã tham gia doanh nghiệp thành công';

  @override
  String get spaceAcceptInviteFailed => 'Tham gia thất bại, vui lòng thử lại';

  @override
  String get spaceTenantSelectTitle => 'Chọn không gian';

  @override
  String get spaceTenantSelectHint => 'Chọn không gian để vào';

  @override
  String get spaceEnterPersonal => 'Vào không gian cá nhân';

  @override
  String get spaceEnterEnterprise => 'Vào không gian doanh nghiệp';

  @override
  String get aboutTitle => 'Về StartLink';

  @override
  String get aboutVersion => 'Phiên bản';

  @override
  String get aboutTerms => 'Điều khoản dịch vụ';

  @override
  String get aboutPrivacy => 'Chính sách bảo mật';

  @override
  String get aboutOpenSource => 'Giấy phép mã nguồn mở';

  @override
  String get aboutCheckUpdate => 'Kiểm tra cập nhật';

  @override
  String get aboutLatestVersion => 'Đã là phiên bản mới nhất';

  @override
  String get aboutUpdateAvailable => 'Có bản cập nhật mới';

  @override
  String get aboutUpdateNow => 'Cập nhật ngay';

  @override
  String get aboutUpdateLater => 'Để sau';

  @override
  String get notificationTitle => 'Thông báo';

  @override
  String get notificationGlobalMute => 'Không làm phiền';

  @override
  String get notificationSound => 'Âm thanh';

  @override
  String get notificationVibration => 'Rung';

  @override
  String get notificationPreview => 'Xem trước thông báo';

  @override
  String get notificationDndStart => 'Giờ bắt đầu không làm phiền';

  @override
  String get notificationDndEnd => 'Giờ kết thúc không làm phiền';

  @override
  String get blacklistTitle => 'Danh sách chặn';

  @override
  String get blacklistEmpty => 'Không có người dùng bị chặn';

  @override
  String get blacklistRemove => 'Bỏ chặn';

  @override
  String get blacklistRemoveConfirm => 'Bỏ chặn người dùng này?';

  @override
  String get feedbackTitle => 'Phản hồi';

  @override
  String get feedbackTypeComplaint => 'Khiếu nại';

  @override
  String get feedbackTypeSuggestion => 'Đề xuất';

  @override
  String get feedbackTypeBug => 'Báo lỗi';

  @override
  String get feedbackContent => 'Nội dung';

  @override
  String get feedbackContentHint =>
      'Mô tả chi tiết vấn đề hoặc đề xuất của bạn';

  @override
  String get feedbackContact => 'Liên hệ (tùy chọn)';

  @override
  String get feedbackSubmit => 'Gửi';

  @override
  String get feedbackSuccess => 'Đã gửi phản hồi. Cảm ơn bạn!';

  @override
  String get feedbackFailed => 'Gửi thất bại, vui lòng thử lại';

  @override
  String get networkTitle => 'Mạng';

  @override
  String get networkAutoSelect => 'Tự động';

  @override
  String get networkManual => 'Thủ công';

  @override
  String get timezoneTitle => 'Múi giờ';

  @override
  String get timezoneAuto => 'Theo hệ thống';

  @override
  String get autoTranslateTitle => 'Tự động dịch';

  @override
  String get autoTranslateEnabled => 'Bật tự động dịch';

  @override
  String get autoTranslateLanguage => 'Ngôn ngữ đích';

  @override
  String get displayTitle => 'Hiển thị';

  @override
  String get displayFontSize => 'Cỡ chữ';

  @override
  String get displayChatBackground => 'Nền chat';

  @override
  String get displayDarkMode => 'Tối';

  @override
  String get displayDarkModeSystem => 'Theo hệ thống';

  @override
  String get displayDarkModeSystemHint =>
      'Tự động chuyển đổi theo cài đặt hệ thống';

  @override
  String get displayDarkModeOff => 'Sáng';

  @override
  String get displayDarkModeOffHint => 'Luôn dùng giao diện sáng';

  @override
  String get displayDarkModeOn => 'Tối';

  @override
  String get displayDarkModeOnHint => 'Luôn dùng giao diện tối';

  @override
  String get chatSettingsTitle => 'Chat';

  @override
  String get chatHistoryTitle => 'Lịch sử chat';

  @override
  String get chatHistoryClear => 'Xóa tất cả lịch sử';

  @override
  String get chatHistoryClearConfirm =>
      'Xóa tất cả lịch sử chat? Không thể hoàn tác.';

  @override
  String get chatHistoryClearSuccess => 'Đã xóa lịch sử chat';

  @override
  String get accountSecurityTitle => 'Bảo mật tài khoản';

  @override
  String get accountSecurityChangePassword => 'Đổi mật khẩu';

  @override
  String get accountSecurityChangeMobile => 'Đổi số điện thoại';

  @override
  String get accountSecurityChangeEmail => 'Đổi email';

  @override
  String get accountSecurityLoggedDevices => 'Thiết bị đã đăng nhập';

  @override
  String get accountSecurityDeactivate => 'Xóa tài khoản';

  @override
  String get accountSecurityDeactivateConfirm =>
      'Tất cả dữ liệu sẽ bị xóa vĩnh viễn sau 7 ngày. Xóa tài khoản?';

  @override
  String get loggedDevicesTitle => 'Thiết bị đã đăng nhập';

  @override
  String get loggedDevicesCurrent => 'Thiết bị này';

  @override
  String get loggedDevicesRevoke => 'Đăng xuất';

  @override
  String get loggedDevicesRevokeConfirm => 'Đăng xuất khỏi thiết bị này?';

  @override
  String get loggedDevicesRevokeSuccess => 'Đã đăng xuất khỏi thiết bị';

  @override
  String get loggedDevicesRevokeFailed => 'Thất bại, vui lòng thử lại';

  @override
  String get loggedDevicesLastActive => 'Hoạt động lần cuối';

  @override
  String get loggedDevicesTypeIos => 'iOS';

  @override
  String get loggedDevicesTypeAndroid => 'Android';

  @override
  String get loggedDevicesTypeWeb => 'Web';

  @override
  String get loggedDevicesTypeDesktop => 'Máy tính';

  @override
  String get loggedDevicesTypeUnknown => 'Thiết bị không xác định';

  @override
  String get privacySettingsTitle => 'Quyền riêng tư';

  @override
  String get privacySearchableByMobile => 'Cho phép tìm kiếm theo SĐT';

  @override
  String get privacySearchableByLppId => 'Cho phép tìm kiếm theo StartLink ID';

  @override
  String get privacyAllowFriendRequest => 'Cho phép lời mời kết bạn';

  @override
  String get privacyProfileVisibility => 'Hiển thị hồ sơ';

  @override
  String get privacyEveryone => 'Tất cả mọi người';

  @override
  String get privacyFriendsOfFriends => 'Bạn của bạn bè';

  @override
  String get privacyNobody => 'Không ai';

  @override
  String get privacyFriendsOnly => 'Chỉ bạn bè';

  @override
  String get privacySaveSuccess => 'Đã lưu cài đặt';

  @override
  String get privacySaveFailed => 'Lưu thất bại, vui lòng thử lại';

  @override
  String get fontSizeTitle => 'Cỡ chữ';

  @override
  String get fontSizeSmall => 'Nhỏ';

  @override
  String get fontSizeNormal => 'Bình thường';

  @override
  String get fontSizeLarge => 'Lớn';

  @override
  String get fontSizeExtraLarge => 'Rất lớn';

  @override
  String get fontSizePreview => 'Xem trước';

  @override
  String get chatBackgroundTitle => 'Nền chat';

  @override
  String get chatBackgroundDefault => 'Mặc định';

  @override
  String get chatBackgroundCustom => 'Tùy chỉnh';

  @override
  String get chatBackgroundReset => 'Đặt lại mặc định';

  @override
  String get termsTitle => 'Điều khoản dịch vụ';

  @override
  String get privacyPolicyTitle => 'Chính sách bảo mật';

  @override
  String get recentContactsTitle => 'Liên hệ gần đây';

  @override
  String get recentContactsEmpty => 'Không có liên hệ gần đây';

  @override
  String get inviteFriendsTitle => 'Mời bạn bè';

  @override
  String get inviteFriendsCopyLink => 'Sao chép link mời';

  @override
  String get inviteFriendsLinkCopied => 'Đã sao chép link mời';

  @override
  String get imageViewerTitle => 'Ảnh';

  @override
  String get imageViewerSave => 'Lưu vào thư viện';

  @override
  String get imageViewerSaveSuccess => 'Đã lưu vào thư viện';

  @override
  String get imageViewerSaveFailed => 'Lưu thất bại, vui lòng thử lại';

  @override
  String get customerServiceTitle => 'Dịch vụ khách hàng';

  @override
  String get customerServiceQueue => 'Đang chờ';

  @override
  String get customerServiceActive => 'Đang phục vụ';

  @override
  String get customerServiceClaim => 'Tiếp nhận';

  @override
  String get customerServiceTakeover => 'Tiếp quản';

  @override
  String get customerServiceClose => 'Kết thúc dịch vụ';

  @override
  String get customerServiceCloseConfirm => 'Kết thúc phiên dịch vụ này?';

  @override
  String get customerServiceNoQueue => 'Không có phiên đang chờ';

  @override
  String get customerServiceNoActive => 'Không có phiên đang hoạt động';

  @override
  String get customerServiceVisitor => 'Khách';

  @override
  String get customerServiceCustomer => 'Khách hàng';

  @override
  String get customerServiceAssignedTo => 'Nhân viên phụ trách';

  @override
  String get customerServiceTransferConversation => 'Chuyển cuộc trò chuyện';

  @override
  String get marketingToolbar => 'Công cụ marketing';

  @override
  String get callIncoming => 'Cuộc gọi đến';

  @override
  String get callOutgoing => 'Cuộc gọi đi';

  @override
  String get callAccept => 'Chấp nhận';

  @override
  String get callReject => 'Từ chối';

  @override
  String get callHangup => 'Kết thúc';

  @override
  String get callMissed => 'Cuộc gọi nhỡ';

  @override
  String get callDuration => 'Thời lượng';

  @override
  String get callAudio => 'Gọi thoại';

  @override
  String get callVideo => 'Gọi video';

  @override
  String get callConnecting => 'Đang kết nối...';

  @override
  String get callRinging => 'Đang đổ chuông...';

  @override
  String get callEnded => 'Cuộc gọi đã kết thúc';

  @override
  String get callFailed => 'Cuộc gọi thất bại';

  @override
  String get callRejected => 'Cuộc gọi bị từ chối';

  @override
  String get callTimeout => 'Không có phản hồi';

  @override
  String get callCancelled => 'Đã hủy';

  @override
  String get pendingJoinRequestsTitle => 'Yêu cầu mới';

  @override
  String get pendingJoinRequestsEmpty => 'Không có yêu cầu';

  @override
  String get pendingJoinRequestApprove => 'Chấp nhận';

  @override
  String get pendingJoinRequestReject => 'Từ chối';

  @override
  String get pendingJoinRequestApproveSuccess => 'Đã chấp nhận';

  @override
  String get pendingJoinRequestRejectSuccess => 'Đã từ chối';

  @override
  String get pendingJoinRequestFailed => 'Thao tác thất bại, vui lòng thử lại';

  @override
  String get myCustomersTitle => 'Khách hàng của tôi';

  @override
  String get myCustomersEmpty => 'Không có khách hàng';

  @override
  String get groupListTitle => 'Danh sách nhóm';

  @override
  String get groupListEmpty => 'Không có nhóm';

  @override
  String get addFriendTitle => 'Thêm bạn bè';

  @override
  String get addFriendSearchHint => 'SĐT / Email / StartLink ID';

  @override
  String addFriendLppIdLabel(String lppId) {
    return 'StartLink ID: $lppId';
  }

  @override
  String get addFriendButton => 'Kết bạn';

  @override
  String get addFriendCannotAddSelf => 'Bạn không thể thêm chính mình';

  @override
  String get addFriendUnsupportedUser =>
      'Không thể thêm người dùng này. Bạn có thể nhắn tin trực tiếp.';

  @override
  String get addFriendMessageHint => 'Nhập tin nhắn';

  @override
  String get addFriendSendRequest => 'Gửi yêu cầu';

  @override
  String get joinCompanyTitle => 'Tham gia doanh nghiệp';

  @override
  String get joinCompanyCodeHint => 'Nhập mã doanh nghiệp';

  @override
  String get joinCompanySearchHint => 'Tìm kiếm tên doanh nghiệp';

  @override
  String get joinCompanyApply => 'Gửi yêu cầu tham gia';

  @override
  String get joinCompanyApplySuccess => 'Đã gửi yêu cầu';

  @override
  String get joinCompanyApplyFailed => 'Gửi yêu cầu thất bại, vui lòng thử lại';

  @override
  String get joinCompanyAutoApproved => 'Đã được tự động chấp nhận. Chào mừng!';

  @override
  String get joinCompanyPending => 'Đã gửi yêu cầu, đang chờ phê duyệt';

  @override
  String get joinCompanyInviteCodeHint => 'Nhập mã mời';

  @override
  String get joinCompanyAcceptInvite => 'Chấp nhận lời mời';

  @override
  String get joinCompanyNoResults => 'Không tìm thấy doanh nghiệp';

  @override
  String joinCompanyMemberCount(int count) {
    return '$count thành viên';
  }

  @override
  String get timezoneNameHawaii => 'Hawaii';

  @override
  String get timezoneNameAlaska => 'Alaska';

  @override
  String get timezoneNamePacificTime => 'Giờ Thái Bình Dương';

  @override
  String get timezoneNameMountainTime => 'Giờ Miền núi';

  @override
  String get timezoneNameCentralTime => 'Giờ Miền Trung';

  @override
  String get timezoneNameEasternTime => 'Giờ Miền Đông';

  @override
  String get timezoneNameAtlanticTime => 'Giờ Đại Tây Dương';

  @override
  String get timezoneNameBrasilia => 'Brasilia';

  @override
  String get timezoneNameAzores => 'Azores';

  @override
  String get timezoneNameLondonDublin => 'London/Dublin';

  @override
  String get timezoneNameBerlinParisRome => 'Berlin/Paris/Rome';

  @override
  String get timezoneNameCairoHelsinki => 'Cairo/Helsinki';

  @override
  String get timezoneNameMoscowRiyadh => 'Moscow/Riyadh';

  @override
  String get timezoneNameTehran => 'Tehran';

  @override
  String get timezoneNameDubaiBaku => 'Dubai/Baku';

  @override
  String get timezoneNameKabul => 'Kabul';

  @override
  String get timezoneNameKarachiTashkent => 'Karachi/Tashkent';

  @override
  String get timezoneNameMumbaiNewDelhi => 'Mumbai/New Delhi';

  @override
  String get timezoneNameKathmandu => 'Kathmandu';

  @override
  String get timezoneNameDhakaAlmaty => 'Dhaka/Almaty';

  @override
  String get timezoneNameYangon => 'Yangon';

  @override
  String get timezoneNameBangkokHanoiJakarta => 'Bangkok/Hà Nội/Jakarta';

  @override
  String get timezoneNameBeijingShanghaiHongKongTaipei =>
      'Bắc Kinh/Thượng Hải/Hồng Kông/Đài Bắc';

  @override
  String get timezoneNameTokyoSeoul => 'Tokyo/Seoul';

  @override
  String get timezoneNameAdelaide => 'Adelaide';

  @override
  String get timezoneNameSydneyMelbourne => 'Sydney/Melbourne';

  @override
  String get timezoneNameSolomonIslands => 'Quần đảo Solomon';

  @override
  String get timezoneNameAucklandFiji => 'Auckland/Fiji';

  @override
  String get networkSmartSelectBestRoute => 'Tự chọn tuyến tối ưu';

  @override
  String get networkTesting => 'Đang kiểm tra...';

  @override
  String get networkTestingShort => 'Đang kiểm tra';

  @override
  String networkLatencyMs(int ms) {
    return 'Độ trễ ${ms}ms';
  }

  @override
  String get networkConnectionMode => 'Chế độ kết nối';

  @override
  String get networkDirectMode => 'Chế độ trực tiếp';

  @override
  String get networkProxyMode => 'Chế độ proxy';

  @override
  String get networkDirectModeDesc => 'Kết nối trực tiếp tới máy chủ';

  @override
  String get networkProxyModeDesc => 'Kết nối qua máy chủ proxy';

  @override
  String get networkDirectRoutes => 'Tuyến trực tiếp';

  @override
  String get networkProxyRoutes => 'Tuyến proxy';

  @override
  String get networkTestAll => 'Kiểm tra tất cả';

  @override
  String get networkChinaTelecom => 'China Telecom';

  @override
  String get networkChinaUnicom => 'China Unicom';

  @override
  String get networkChinaMobile => 'China Mobile';

  @override
  String get networkHongKongNode => 'Nút Hồng Kông';

  @override
  String get networkSingaporeNode => 'Nút Singapore';

  @override
  String get networkJapanNode => 'Nút Nhật Bản';

  @override
  String get networkUnitedStatesNode => 'Nút Hoa Kỳ';

  @override
  String get networkHint =>
      'Gợi ý:\n• Chế độ trực tiếp: nhanh hơn, phù hợp dùng trong nước\n• Chế độ proxy: ổn định hơn cho liên lạc xuyên biên giới\n• Nhấn biểu tượng làm mới để kiểm tra độ trễ từng tuyến';
}
