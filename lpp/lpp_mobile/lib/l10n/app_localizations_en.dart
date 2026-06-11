// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get commonConfirm => 'OK';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonSave => 'Save';

  @override
  String get commonEdit => 'Edit';

  @override
  String get commonDelete => 'Delete';

  @override
  String get commonSearch => 'Search';

  @override
  String get commonLoading => 'Loading...';

  @override
  String get commonLoadFailed => 'Failed to load';

  @override
  String get commonRetry => 'Retry';

  @override
  String get commonEmpty => 'No data';

  @override
  String get commonCopy => 'Copy';

  @override
  String get commonForward => 'Forward';

  @override
  String get commonFavorite => 'Favorite';

  @override
  String get commonClose => 'Close';

  @override
  String get commonSend => 'Send';

  @override
  String get commonDone => 'Done';

  @override
  String get commonMore => 'More';

  @override
  String get commonSettings => 'Settings';

  @override
  String get commonCopied => 'Copied';

  @override
  String get commonUnknown => 'Unknown';

  @override
  String get commonNotSet => 'Not set';

  @override
  String get commonUnbound => 'Not bound';

  @override
  String get commonViewAll => 'View all';

  @override
  String get commonSubmit => 'Submit';

  @override
  String get commonAdd => 'Add';

  @override
  String get commonRemove => 'Remove';

  @override
  String get commonCreate => 'Create';

  @override
  String get commonUpdate => 'Update';

  @override
  String get commonUpload => 'Upload';

  @override
  String get commonShare => 'Share';

  @override
  String get commonBlock => 'Block';

  @override
  String get commonUnblock => 'Unblock';

  @override
  String get commonMute => 'Mute';

  @override
  String get commonUnmute => 'Unmute';

  @override
  String get commonPin => 'Pin';

  @override
  String get commonUnpin => 'Unpin';

  @override
  String get commonMarkRead => 'Mark as read';

  @override
  String get commonMarkUnread => 'Mark as unread';

  @override
  String get commonOnline => 'Online';

  @override
  String get commonOffline => 'Offline';

  @override
  String get commonOperationFailed => 'Operation failed, please try again';

  @override
  String get commonNetworkError =>
      'Network error, please check your connection';

  @override
  String get navMessages => 'Chats';

  @override
  String get navContacts => 'Contacts';

  @override
  String get navMe => 'Me';

  @override
  String get authLoginTitle => 'Sign in to StartLink';

  @override
  String get authTabMobile => 'Phone';

  @override
  String get authTabEmail => 'Email';

  @override
  String get authTabLoginName => 'StartLink ID';

  @override
  String get authHintMobile => 'Enter phone number';

  @override
  String get authHintEmail => 'Enter email address';

  @override
  String get authHintPassword => 'Enter password';

  @override
  String get authHintCode => 'Enter verification code';

  @override
  String get authHintLoginName => 'Enter StartLink ID (lpp_xxxxxxxx)';

  @override
  String get authLoginButton => 'Sign In / Register';

  @override
  String get authGetCode => 'Get Code';

  @override
  String authResendCode(int seconds) {
    return 'Resend in ${seconds}s';
  }

  @override
  String get authUsePassword => 'Use password';

  @override
  String get authUseCode => 'Use verification code';

  @override
  String get authAgreementPrefix => 'I have read and agree to the ';

  @override
  String get authAgreementAnd => ' and ';

  @override
  String get authTermsLink => 'Terms of Service';

  @override
  String get authPrivacyLink => 'Privacy Policy';

  @override
  String get authCaptchaTitle => 'Security Verification';

  @override
  String get authCaptchaHint => 'Enter the answer';

  @override
  String get authCaptchaFailed => 'Failed to get captcha, please try again';

  @override
  String get authErrorEmptyCode => 'Please enter verification code';

  @override
  String get authErrorEmptyPassword => 'Please enter password';

  @override
  String get authErrorEmptyLoginName => 'Please enter StartLink ID';

  @override
  String get authErrorWrongCredentials => 'Incorrect account or password';

  @override
  String get authDeactivatingTitle => 'Account Deactivation';

  @override
  String get authDeactivatingContent =>
      'Your account is in the deactivation cooling-off period (7 days).\n\nTo cancel deactivation, tap \"Cancel Deactivation\"; otherwise tap \"Continue\" to enter the app.';

  @override
  String get authContinueUse => 'Continue';

  @override
  String get authCancelDeactivation => 'Cancel Deactivation';

  @override
  String get authDeactivationCancelled =>
      'Deactivation cancelled, account restored';

  @override
  String get authDeactivationCancelFailed =>
      'Failed to cancel, please try again';

  @override
  String get authLogout => 'Sign Out';

  @override
  String get authLogoutConfirm => 'Are you sure you want to sign out?';

  @override
  String get authSendingCode => 'Sending...';

  @override
  String get authCodeSent => 'Code sent';

  @override
  String get authLoginFailed => 'Sign in failed, please try again';

  @override
  String get authRegisterFailed => 'Registration failed, please try again';

  @override
  String get authEnterpriseCode => 'Enterprise Code';

  @override
  String get authEnterpriseCodeHint => 'Enter enterprise code';

  @override
  String get authPendingApproval =>
      'Registration successful. Your request to join the enterprise has been submitted and is awaiting approval.';

  @override
  String get homeTitle => 'Chats';

  @override
  String get homePersonalSpace => 'Personal';

  @override
  String get homeOfficialService => 'Official Service';

  @override
  String get homeSwitchSpace => 'Switch Space';

  @override
  String get homeSpaceSubtitle => 'Personal · Enterprise';

  @override
  String get homeJoinEnterprise => 'Join Enterprise';

  @override
  String get homeCreateGroup => 'New Group';

  @override
  String get homeAddFriend => 'Add Contact';

  @override
  String get homeScan => 'Scan';

  @override
  String get homeJoinNewSpace => 'Join New Space';

  @override
  String get homeSearchConversation => 'Search';

  @override
  String get homeNoMessages => 'No messages yet';

  @override
  String get homeDeleteConversation => 'Delete Chat';

  @override
  String get homeDeleteConversationConfirm =>
      'Delete this chat? Chat history will be cleared.';

  @override
  String get homePersonalNote => 'Me (Personal Notes)';

  @override
  String get homeWorkNote => 'Me (Work Notes)';

  @override
  String homeConversationCount(int count) {
    return '$count chats';
  }

  @override
  String homeUnreadCount(int count) {
    return '$count unread';
  }

  @override
  String get chatInputHint => 'Type a message...';

  @override
  String get chatVoiceHint => 'Hold to talk';

  @override
  String get chatVoiceRelease => 'Release to send';

  @override
  String get chatVoiceCancel => 'Slide up to cancel';

  @override
  String get chatMenuCopy => 'Copy';

  @override
  String get chatMenuForward => 'Forward';

  @override
  String get chatMenuRecall => 'Recall';

  @override
  String get chatMenuDelete => 'Delete';

  @override
  String get chatMenuFavorite => 'Favorite';

  @override
  String get chatMenuReply => 'Reply';

  @override
  String get chatMenuMultiSelect => 'Select';

  @override
  String get chatMenuTranslate => 'Translate';

  @override
  String get chatMenuVoiceToText => 'Convert to Text';

  @override
  String get chatStatusRecalled => 'Message recalled';

  @override
  String get chatRecallSuccess => 'Recalled';

  @override
  String get chatRecallFailed => 'Failed to recall';

  @override
  String get chatRecallTimeout =>
      'Messages older than 2 minutes cannot be recalled';

  @override
  String get chatTranslateFailed => 'Translation failed, please try again';

  @override
  String get chatTranslateNotConfigured => 'Translation service not available';

  @override
  String get chatVoiceToTextFailed => 'Conversion failed, please try again';

  @override
  String get chatForwardSuccess => 'Forwarded';

  @override
  String get chatForwardFailed => 'Failed to forward, please try again';

  @override
  String get chatNoConversations => 'No chats to forward to';

  @override
  String get chatSendFailed => 'Failed to send';

  @override
  String get chatResend => 'Resend';

  @override
  String get chatNotFriend => 'Not in contact list';

  @override
  String get chatNotFriendHint =>
      'You are not contacts yet. Unable to send messages.';

  @override
  String get chatMutedHint => 'All members are muted';

  @override
  String get chatFileUploadFailed => 'File upload failed, please try again';

  @override
  String get chatFileStatusNotDownloaded => 'Not downloaded';

  @override
  String get chatFileStatusDownloaded => 'Downloaded';

  @override
  String get chatFileStatusUploading => 'Uploading';

  @override
  String get chatFileStatusUploadFailed => 'Upload failed';

  @override
  String get chatCardSendFailed => 'Failed to send contact card';

  @override
  String get chatFavoriteSuccess => 'Added to favorites';

  @override
  String get chatFavoriteFailed => 'Failed to add to favorites';

  @override
  String get chatLoadFailed => 'Failed to load';

  @override
  String get chatImageMessage => '[Image]';

  @override
  String get chatVoiceMessage => '[Voice]';

  @override
  String get chatVideoMessage => '[Video]';

  @override
  String get chatFileMessage => '[File]';

  @override
  String get chatLocationMessage => '[Location]';

  @override
  String get chatContactCardMessage => '[Contact]';

  @override
  String get chatCallLogMessage => '[Call]';

  @override
  String chatGroupMemberCount(int count) {
    return '($count)';
  }

  @override
  String chatReadCount(int count) {
    return 'Read by $count';
  }

  @override
  String get chatUnread => 'Unread';

  @override
  String get chatRecalledSelf => 'You recalled a message';

  @override
  String chatRecalledPeer(String sender) {
    return '$sender recalled a message';
  }

  @override
  String chatTranslationPrefix(String translation) {
    return 'Translation: $translation';
  }

  @override
  String get chatMessageDeleted => 'Message deleted';

  @override
  String get chatPeer => 'Other';

  @override
  String get chatSelf => 'Me';

  @override
  String get chatGenericMessage => '[Message]';

  @override
  String get chatVoiceHideText => 'Hide text';

  @override
  String get chatVoiceShowText => 'Convert to text';

  @override
  String get chatFileDefaultName => 'File';

  @override
  String get chatContactDefaultName => 'Contact';

  @override
  String get chatContactCardTitle => 'Contact card';

  @override
  String get chatCallMissed => 'Missed';

  @override
  String get chatCallCancelled => 'Cancelled';

  @override
  String get chatCallRejected => 'Declined';

  @override
  String get chatCallDisconnected => 'Disconnected';

  @override
  String get chatCallEnded => 'Call ended';

  @override
  String get chatCallFailed => 'Call failed';

  @override
  String chatCallDuration(String duration) {
    return 'Duration $duration';
  }

  @override
  String get chatVideoCallTitle => 'Video call';

  @override
  String get chatVoiceCallTitle => 'Voice call';

  @override
  String get chatToolPhotos => 'Photos';

  @override
  String get chatToolCamera => 'Camera';

  @override
  String get chatToolFile => 'File';

  @override
  String get chatToolLocation => 'Location';

  @override
  String get chatToolContactCard => 'Contact';

  @override
  String get chatToolVoiceCall => 'Voice call';

  @override
  String get chatToolVideoCall => 'Video call';

  @override
  String get chatToolFavorites => 'Favorites';

  @override
  String get chatFileTooLarge => 'File exceeds the limit (100 MB)';

  @override
  String get chatInputMutedAdminOnly =>
      'Only the owner or selected members can speak.';

  @override
  String get chatImageUploadUnsupported =>
      'Image upload failed. Server support is not available yet.';

  @override
  String get chatFavoriteLongPressHint => 'Long press a message to favorite it';

  @override
  String chatSelectedCount(int count) {
    return '$count selected';
  }

  @override
  String get chatLocationSheetTitle => 'Send location';

  @override
  String get chatLocationNameLabel => 'Place name';

  @override
  String get chatLocationNameHint => 'e.g. Office, customer address';

  @override
  String get chatLocationAddressLabel => 'Address';

  @override
  String get chatLocationOptionalHint => 'Optional';

  @override
  String get chatLocationLatitudeLabel => 'Latitude';

  @override
  String get chatLocationLatitudeHint => '-90 to 90';

  @override
  String get chatLocationLongitudeLabel => 'Longitude';

  @override
  String get chatLocationLongitudeHint => '-180 to 180';

  @override
  String chatLocationValidationRequired(String label) {
    return 'Enter $label';
  }

  @override
  String chatLocationValidationRange(String label) {
    return '$label is out of range';
  }

  @override
  String get chatLocationDefaultTitle => 'Location';

  @override
  String get chatMutedFullNotice =>
      'This group is muted. Only the owner or selected members can speak.';

  @override
  String get chatNotFriendSendBlocked =>
      'You are no longer friends and cannot send messages';

  @override
  String get chatPersonalNotesTitle => 'Personal notes';

  @override
  String get chatWorkNotesTitle => 'Work notes';

  @override
  String get chatPersonalNotesDescription =>
      'Record personal thoughts and save important info here\nSynced across devices for access anytime';

  @override
  String get chatWorkNotesDescription =>
      'Record work tasks and save work materials here\nTeam spaces stay separate and secure';

  @override
  String get chatNoMessages => 'No messages yet';

  @override
  String chatReplyTo(String sender) {
    return 'Reply to $sender';
  }

  @override
  String chatFeatureComingSoon(String feature) {
    return '$feature is coming soon';
  }

  @override
  String get chatForwardSelectTitle => 'Choose chat';

  @override
  String get chatContactSelectTitle => 'Choose contact';

  @override
  String get chatNoContacts => 'No contacts';

  @override
  String get contactsTitle => 'Contacts';

  @override
  String get contactsSearch => 'Search contacts';

  @override
  String get contactsNewFriends => 'New Friends';

  @override
  String get contactsGroups => 'Groups';

  @override
  String get contactsFavorites => 'Favorites';

  @override
  String get contactsRecent => 'Recent';

  @override
  String get contactsOrganization => 'Organization';

  @override
  String get contactsAnnouncement => 'Announcements';

  @override
  String get contactsNewApplications => 'New Applications';

  @override
  String get contactsCustomerGroups => 'Customer Groups';

  @override
  String get contactsAllCustomers => 'All Customers';

  @override
  String get contactsMyCustomers => 'My Customers';

  @override
  String get contactsViewAll => 'View All';

  @override
  String get contactsMyContacts => 'My Contacts';

  @override
  String get contactsMyAdvisor => 'My Advisor';

  @override
  String get contactsNoAdvisor => 'No advisor assigned yet';

  @override
  String get contactsAdvisorLoading => 'Loading...';

  @override
  String get contactsNavigateFailed => 'Navigation failed, please try again';

  @override
  String get contactsEmpty => 'No contacts';

  @override
  String get contactsNoAnnouncement => 'No announcements';

  @override
  String get contactsOfficialBadge => 'Official';

  @override
  String get contactsCustomerBadge => 'Customer';

  @override
  String get contactsEmptyCustomers => 'No customers';

  @override
  String get myTitle => 'Me';

  @override
  String get myEnterpriseInfo => 'Enterprise Info';

  @override
  String get myEnterpriseManage => 'Enterprise Management';

  @override
  String get myQrCode => 'QR Code';

  @override
  String get myFavorites => 'Favorites';

  @override
  String get myLanguage => 'Language';

  @override
  String get myTimezone => 'Timezone';

  @override
  String get myAutoTranslate => 'Auto Translate';

  @override
  String get myNetworkSwitch => 'Network';

  @override
  String get mySettings => 'Settings';

  @override
  String get myLogout => 'Sign Out';

  @override
  String get myLogoutConfirm => 'Are you sure you want to sign out?';

  @override
  String get myLeaveEnterprise => 'Leave Enterprise';

  @override
  String get myLeaveEnterpriseConfirm =>
      'Are you sure you want to leave this enterprise? You will lose access to enterprise data.';

  @override
  String get myLeaveEnterpriseSuccess => 'Left enterprise';

  @override
  String get myLeaveEnterpriseFailed => 'Failed to leave, please try again';

  @override
  String get myLppIdCopied => 'StartLink ID copied';

  @override
  String myLppIdLabel(String lppId) {
    return 'StartLink ID: $lppId';
  }

  @override
  String myFriendCount(int count) {
    return '$count contacts';
  }

  @override
  String get myAutoSelect => 'Auto';

  @override
  String get myPresenceStatus => 'Presence';

  @override
  String get myPresenceStatusTitle => 'Set Presence';

  @override
  String get myPresenceOnline => 'Online';

  @override
  String get myPresenceBusy => 'Busy';

  @override
  String get myPresenceAway => 'Away';

  @override
  String get myPresenceInvisible => 'Invisible';

  @override
  String get profileTitle => 'Profile';

  @override
  String get profileName => 'Name';

  @override
  String get profileGender => 'Gender';

  @override
  String get profileBirthday => 'Birthday';

  @override
  String get profileRegion => 'Region';

  @override
  String get profileSignature => 'Bio';

  @override
  String get profileSignatureHint => 'Tell something about yourself';

  @override
  String get profileTapTapText => 'Tap Tap';

  @override
  String get profileTapTapHint => 'Text shown when tapped (max 20 chars)';

  @override
  String get profileAccountSection => 'Account';

  @override
  String get profileBasicSection => 'Basic Info';

  @override
  String get profileLppId => 'StartLink ID';

  @override
  String get profileLppIdNotSet => 'Not set';

  @override
  String get profileMobile => 'Phone';

  @override
  String get profileMobileUnbound => 'Not bound';

  @override
  String get profileEmail => 'Email';

  @override
  String get profileEmailUnbound => 'Not bound';

  @override
  String get profileQrCode => 'My QR Code';

  @override
  String get profileChangePassword => 'Change Password';

  @override
  String get profileGenderMale => 'Male';

  @override
  String get profileGenderFemale => 'Female';

  @override
  String get profileGenderOther => 'Other';

  @override
  String get profileGenderUnset => 'Not set';

  @override
  String get profileSaveFailed => 'Failed to save, please try again';

  @override
  String get profileLppIdTitle => 'StartLink ID';

  @override
  String get profileLppIdSetOnce =>
      'StartLink ID can only be changed once. Please choose carefully.';

  @override
  String get profileLppIdChangeFailed =>
      'Change failed (StartLink ID can only be changed once)';

  @override
  String get profileChangePasswordOld => 'Current Password';

  @override
  String get profileChangePasswordNew => 'New Password';

  @override
  String get profileChangePasswordConfirm => 'Confirm New Password';

  @override
  String get profileChangePasswordMismatch => 'Passwords do not match';

  @override
  String get profileChangePasswordSuccess =>
      'Password changed. Please sign in again.';

  @override
  String get profileChangePasswordFailed =>
      'Failed to change password, please try again';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsSectionEnterprise => 'Enterprise';

  @override
  String get settingsSectionAccount => 'Account';

  @override
  String get settingsSectionGeneral => 'General';

  @override
  String get settingsSectionFeatures => 'Features';

  @override
  String get settingsSectionAbout => 'About';

  @override
  String get settingsEnterpriseInfo => 'Enterprise Info';

  @override
  String get settingsProfile => 'Profile';

  @override
  String get settingsAccountSecurity => 'Account Security';

  @override
  String get settingsNotification => 'Notifications';

  @override
  String get settingsDisplay => 'Display';

  @override
  String get settingsFriendPrivacy => 'Privacy';

  @override
  String get settingsChat => 'Chat';

  @override
  String get settingsChatHistory => 'Chat History';

  @override
  String get settingsAbout => 'About StartLink';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsTimezone => 'Timezone';

  @override
  String get settingsAutoTranslate => 'Auto Translate';

  @override
  String get settingsNetworkSwitch => 'Network';

  @override
  String get enterpriseInfoTitle => 'Enterprise Info';

  @override
  String get enterpriseName => 'Name';

  @override
  String get enterpriseDescription => 'Description';

  @override
  String get enterpriseUpdateSuccess => 'Updated successfully';

  @override
  String get enterpriseUpdateFailed => 'Update failed, please try again';

  @override
  String get enterpriseLeave => 'Leave Enterprise';

  @override
  String get enterpriseLeaveConfirm =>
      'Are you sure you want to leave this enterprise?';

  @override
  String get enterpriseLeaveSuccess => 'Left enterprise';

  @override
  String get enterpriseLeaveFailed => 'Failed to leave, please try again';

  @override
  String get enterpriseLeaveOwnerError =>
      'Owner cannot leave directly. Please transfer ownership first.';

  @override
  String get enterpriseMemberCount => 'Members';

  @override
  String get enterpriseCreatedAt => 'Created';

  @override
  String get enterpriseCode => 'Enterprise Code';

  @override
  String get enterpriseInviteMembers => 'Invite Members';

  @override
  String get enterpriseCopyInviteCode => 'Copy Invite Code';

  @override
  String get enterpriseInviteCodeCopied => 'Invite code copied';

  @override
  String get groupCreateTitle => 'New Group';

  @override
  String get groupNameHint => 'Enter group name';

  @override
  String get groupCreateSuccess => 'Group created';

  @override
  String get groupCreateFailed => 'Failed to create group';

  @override
  String get groupSettings => 'Group Settings';

  @override
  String get groupName => 'Group Name';

  @override
  String get groupAvatar => 'Group Avatar';

  @override
  String get groupAnnouncement => 'Announcement';

  @override
  String get groupMembers => 'Members';

  @override
  String get groupAddMember => 'Add Members';

  @override
  String get groupRemoveMember => 'Remove Member';

  @override
  String get groupRemoveMemberConfirm => 'Remove this member?';

  @override
  String get groupSetAdmin => 'Set as Admin';

  @override
  String get groupRemoveAdmin => 'Remove Admin';

  @override
  String get groupTransferOwner => 'Transfer Ownership';

  @override
  String get groupTransferOwnerConfirm =>
      'Transfer group ownership to this member?';

  @override
  String get groupTransferOwnerSuccess => 'Ownership transferred';

  @override
  String get groupTransferOwnerFailed => 'Transfer failed, please try again';

  @override
  String get groupLeave => 'Leave Group';

  @override
  String get groupLeaveConfirm => 'Leave this group?';

  @override
  String get groupLeaveSuccess => 'Left group';

  @override
  String get groupLeaveFailed => 'Failed to leave, please try again';

  @override
  String get groupDissolve => 'Dissolve Group';

  @override
  String get groupDissolveConfirm =>
      'Dissolve this group? All members will be removed.';

  @override
  String get groupDissolveSuccess => 'Group dissolved';

  @override
  String get groupDissolveFailed => 'Failed to dissolve, please try again';

  @override
  String get groupQrCode => 'Group QR Code';

  @override
  String get groupMuteAll => 'Mute All';

  @override
  String get groupMuteAllOn => 'Enable Mute All';

  @override
  String get groupMuteAllOff => 'Disable Mute All';

  @override
  String get groupAllowMemberInvite => 'Allow member invites';

  @override
  String get groupAllowMemberModifyTitle =>
      'Allow members to change group name';

  @override
  String get groupAllowMemberAtAll => 'Allow members to @All';

  @override
  String get groupAllowMemberViewMemberList =>
      'Allow members to view member list';

  @override
  String get groupAllowQrCodeJoin => 'Allow QR code join';

  @override
  String get groupRequireApproval => 'Require approval to join';

  @override
  String get groupAllowMemberAddFriend => 'Allow members to add each other';

  @override
  String get groupRoleOwner => 'Owner';

  @override
  String get groupRoleAdmin => 'Admin';

  @override
  String get groupRoleMember => 'Member';

  @override
  String get groupNoMembers => 'No members';

  @override
  String get groupNoAnnouncements => 'No announcements';

  @override
  String get groupCreateAnnouncement => 'Post Announcement';

  @override
  String get groupEditAnnouncement => 'Edit Announcement';

  @override
  String get groupDeleteAnnouncement => 'Delete Announcement';

  @override
  String get groupDeleteAnnouncementConfirm => 'Delete this announcement?';

  @override
  String get groupAnnouncementTitle => 'Title';

  @override
  String get groupAnnouncementContent => 'Content';

  @override
  String get groupAnnouncementPin => 'Pin Announcement';

  @override
  String groupMemberCount(int count) {
    return '$count members';
  }

  @override
  String groupSelectedCount(int count) {
    return '$count selected';
  }

  @override
  String get groupJoinRequestApprove => 'Approve';

  @override
  String get groupJoinRequestReject => 'Reject';

  @override
  String get groupJoinRequests => 'Join Requests';

  @override
  String get groupNoJoinRequests => 'No join requests';

  @override
  String get groupReadReceipts => 'Read Receipts';

  @override
  String groupReadCount(int count) {
    return '$count read';
  }

  @override
  String groupUnreadCount(int count) {
    return '$count unread';
  }

  @override
  String get friendAddTitle => 'Add Contact';

  @override
  String get friendSearchHint => 'Phone / Email / StartLink ID';

  @override
  String get friendRequestSent => 'Friend request sent';

  @override
  String get friendRequestFailed => 'Failed to send, please try again';

  @override
  String get friendAlreadyFriend => 'Already contacts';

  @override
  String get friendNewFriendsTitle => 'New Friends';

  @override
  String get friendNoRequests => 'No friend requests';

  @override
  String get friendAccept => 'Accept';

  @override
  String get friendReject => 'Decline';

  @override
  String get friendAccepted => 'Accepted';

  @override
  String get friendRejected => 'Declined';

  @override
  String get friendDeleteConfirm => 'Remove this contact?';

  @override
  String get friendDeleteSuccess => 'Contact removed';

  @override
  String get friendDeleteFailed => 'Failed to remove, please try again';

  @override
  String get friendRemarkName => 'Nickname';

  @override
  String get friendGroupName => 'Group';

  @override
  String get friendSendMessage => 'Message';

  @override
  String get friendMatchTypeLppId => 'Matched by StartLink ID';

  @override
  String get friendMatchTypeMobile => 'Matched by phone';

  @override
  String get friendMatchTypeEmail => 'Matched by email';

  @override
  String get friendSearchEmpty => 'No users found';

  @override
  String get friendAddMessage => 'I\'d like to add you as a contact';

  @override
  String get friendBlockConfirm => 'Block this user?';

  @override
  String get friendUnblockConfirm => 'Unblock this user?';

  @override
  String get friendBlockSuccess => 'Blocked';

  @override
  String get friendUnblockSuccess => 'Unblocked';

  @override
  String get profilePageTitle => 'Profile';

  @override
  String get profilePageSendMessage => 'Message';

  @override
  String get profilePageAddFriend => 'Add Friend';

  @override
  String get profilePageAlreadyFriend => 'Already Friends';

  @override
  String get profilePageBlocked => 'Blocked';

  @override
  String get profilePageBlock => 'Block';

  @override
  String get profilePageUnblock => 'Unblock';

  @override
  String get profilePageHidden => 'This user has hidden their profile';

  @override
  String get profilePageFriendsOnly =>
      'This user only shows profile to friends';

  @override
  String get profilePageLppId => 'StartLink ID';

  @override
  String get profilePageRemarkName => 'Nickname';

  @override
  String get profilePageEditRemark => 'Edit Nickname';

  @override
  String get profilePageSaveRemarkSuccess => 'Nickname saved';

  @override
  String get profilePageSaveRemarkFailed => 'Failed to save, please try again';

  @override
  String get searchTitle => 'Search';

  @override
  String get searchHint => 'Search by phone, email or StartLink ID';

  @override
  String get searchNoResults => 'No results found';

  @override
  String get searchMessages => 'Messages';

  @override
  String get searchUsers => 'Users';

  @override
  String get searchFailed => 'Search failed, please try again';

  @override
  String get scanTitle => 'Scan';

  @override
  String get scanFailed => 'Recognition failed, please try again';

  @override
  String get scanInvalidQrCode => 'Invalid QR code';

  @override
  String get scanFlashOn => 'Turn on flashlight';

  @override
  String get scanFlashOff => 'Turn off flashlight';

  @override
  String get scanAlbum => 'Choose from album';

  @override
  String get favoritesTitle => 'Favorites';

  @override
  String get favoritesEmpty => 'No favorites yet';

  @override
  String get favoritesAll => 'All';

  @override
  String get favoritesText => 'Text';

  @override
  String get favoritesImage => 'Images';

  @override
  String get favoritesVideo => 'Videos';

  @override
  String get favoritesVoice => 'Voice';

  @override
  String get favoritesFile => 'Files';

  @override
  String get favoritesOther => 'Other';

  @override
  String get favoritesDeleteConfirm => 'Remove from favorites?';

  @override
  String get favoritesDeleteSuccess => 'Removed from favorites';

  @override
  String get favoritesDeleteFailed => 'Failed to remove';

  @override
  String get favoritesOriginalRecalled => 'Message recalled';

  @override
  String get favoritesViewOriginal => 'View Original';

  @override
  String get favoritesSearchHint => 'Search favorites';

  @override
  String get favoritesNoResults => 'No matching favorites';

  @override
  String get noticeTitle => 'Announcements';

  @override
  String get noticeEmpty => 'No announcements';

  @override
  String get noticeDetail => 'Announcement Detail';

  @override
  String get noticePublishedAt => 'Published';

  @override
  String get noticePriorityNormal => 'Normal';

  @override
  String get noticePriorityImportant => 'Important';

  @override
  String get noticePriorityUrgent => 'Urgent';

  @override
  String get organizationTitle => 'Organization';

  @override
  String get organizationEmpty => 'No department info';

  @override
  String get organizationMembers => 'Members';

  @override
  String get organizationDepartment => 'Department';

  @override
  String get organizationPosition => 'Position';

  @override
  String get organizationLeader => 'Leader';

  @override
  String get qrCodeTitle => 'My QR Code';

  @override
  String get qrCodeSave => 'Save to Album';

  @override
  String get qrCodeShare => 'Share';

  @override
  String get qrCodeSaveSuccess => 'Saved to album';

  @override
  String get qrCodeSaveFailed => 'Failed to save, please try again';

  @override
  String get qrCodeRefresh => 'Refresh QR Code';

  @override
  String get qrCodeExpired => 'QR code expired, please refresh';

  @override
  String get qrCodeScanToAdd => 'Scan to add me as a contact';

  @override
  String get spacePersonal => 'Personal';

  @override
  String get spaceEnterprise => 'Enterprise';

  @override
  String get spaceJoinByCode => 'Join by Enterprise Code';

  @override
  String get spaceJoinByInvite => 'Join by Invite Code';

  @override
  String get spaceEnterCode => 'Enter enterprise code';

  @override
  String get spaceEnterInviteCode => 'Enter invite code';

  @override
  String get spaceSearchEnterprise => 'Search Enterprise';

  @override
  String get spaceJoinRequestSent => 'Request submitted, awaiting approval';

  @override
  String get spaceJoinRequestPending => 'Approval pending';

  @override
  String get spaceJoinRequestApproved => 'Request approved';

  @override
  String get spaceJoinRequestRejected => 'Request rejected';

  @override
  String get spaceAlreadyMember => 'You are already a member';

  @override
  String get spaceAutoApproved => 'Approved automatically. Welcome!';

  @override
  String get spacePendingApprovalHint =>
      'Registration successful. Your request to join has been submitted.';

  @override
  String get spaceNoSpaces => 'No spaces';

  @override
  String get spaceInviteExpired => 'Invite code expired';

  @override
  String get spaceInviteTargetMismatch =>
      'This invite code is not for your account';

  @override
  String get spaceAcceptInviteSuccess => 'Successfully joined enterprise';

  @override
  String get spaceAcceptInviteFailed => 'Failed to join, please try again';

  @override
  String get spaceTenantSelectTitle => 'Select Space';

  @override
  String get spaceTenantSelectHint => 'Choose a space to enter';

  @override
  String get spaceEnterPersonal => 'Enter Personal Space';

  @override
  String get spaceEnterEnterprise => 'Enter Enterprise Space';

  @override
  String get aboutTitle => 'About StartLink';

  @override
  String get aboutVersion => 'Version';

  @override
  String get aboutTerms => 'Terms of Service';

  @override
  String get aboutPrivacy => 'Privacy Policy';

  @override
  String get aboutOpenSource => 'Open Source Licenses';

  @override
  String get aboutCheckUpdate => 'Check for Updates';

  @override
  String get aboutLatestVersion => 'Already up to date';

  @override
  String get aboutUpdateAvailable => 'Update Available';

  @override
  String get aboutUpdateNow => 'Update Now';

  @override
  String get aboutUpdateLater => 'Later';

  @override
  String get notificationTitle => 'Notifications';

  @override
  String get notificationGlobalMute => 'Do Not Disturb';

  @override
  String get notificationSound => 'Sound';

  @override
  String get notificationVibration => 'Vibration';

  @override
  String get notificationPreview => 'Message Preview';

  @override
  String get notificationDndStart => 'DND Start Time';

  @override
  String get notificationDndEnd => 'DND End Time';

  @override
  String get blacklistTitle => 'Blocked';

  @override
  String get blacklistEmpty => 'No blocked users';

  @override
  String get blacklistRemove => 'Unblock';

  @override
  String get blacklistRemoveConfirm => 'Unblock this user?';

  @override
  String get feedbackTitle => 'Feedback';

  @override
  String get feedbackTypeComplaint => 'Complaint';

  @override
  String get feedbackTypeSuggestion => 'Suggestion';

  @override
  String get feedbackTypeBug => 'Bug Report';

  @override
  String get feedbackContent => 'Description';

  @override
  String get feedbackContentHint =>
      'Please describe your issue or suggestion in detail';

  @override
  String get feedbackContact => 'Contact (optional)';

  @override
  String get feedbackSubmit => 'Submit';

  @override
  String get feedbackSuccess => 'Feedback submitted. Thank you!';

  @override
  String get feedbackFailed => 'Submission failed, please try again';

  @override
  String get networkTitle => 'Network';

  @override
  String get networkAutoSelect => 'Auto';

  @override
  String get networkManual => 'Manual';

  @override
  String get timezoneTitle => 'Timezone';

  @override
  String get timezoneAuto => 'Follow System';

  @override
  String get autoTranslateTitle => 'Auto Translate';

  @override
  String get autoTranslateEnabled => 'Enable Auto Translate';

  @override
  String get autoTranslateLanguage => 'Target Language';

  @override
  String get displayTitle => 'Display';

  @override
  String get displayFontSize => 'Font Size';

  @override
  String get displayChatBackground => 'Chat Background';

  @override
  String get displayDarkMode => 'Appearance';

  @override
  String get displayDarkModeSystem => 'Follow System';

  @override
  String get displayDarkModeSystemHint =>
      'Automatically switch based on system setting';

  @override
  String get displayDarkModeOff => 'Light';

  @override
  String get displayDarkModeOffHint => 'Always use light theme';

  @override
  String get displayDarkModeOn => 'Dark';

  @override
  String get displayDarkModeOnHint => 'Always use dark theme';

  @override
  String get chatSettingsTitle => 'Chat';

  @override
  String get chatHistoryTitle => 'Chat History';

  @override
  String get chatHistoryClear => 'Clear All History';

  @override
  String get chatHistoryClearConfirm =>
      'Clear all chat history? This cannot be undone.';

  @override
  String get chatHistoryClearSuccess => 'Chat history cleared';

  @override
  String get accountSecurityTitle => 'Account Security';

  @override
  String get accountSecurityChangePassword => 'Change Password';

  @override
  String get accountSecurityChangeMobile => 'Change Phone';

  @override
  String get accountSecurityChangeEmail => 'Change Email';

  @override
  String get accountSecurityLoggedDevices => 'Logged-in Devices';

  @override
  String get accountSecurityDeactivate => 'Deactivate Account';

  @override
  String get accountSecurityDeactivateConfirm =>
      'All data will be permanently deleted after 7 days. Deactivate?';

  @override
  String get loggedDevicesTitle => 'Logged-in Devices';

  @override
  String get loggedDevicesCurrent => 'This Device';

  @override
  String get loggedDevicesRevoke => 'Sign Out';

  @override
  String get loggedDevicesRevokeConfirm => 'Sign out from this device?';

  @override
  String get loggedDevicesRevokeSuccess => 'Signed out from device';

  @override
  String get loggedDevicesRevokeFailed => 'Failed, please try again';

  @override
  String get loggedDevicesLastActive => 'Last active';

  @override
  String get loggedDevicesTypeIos => 'iOS';

  @override
  String get loggedDevicesTypeAndroid => 'Android';

  @override
  String get loggedDevicesTypeWeb => 'Web';

  @override
  String get loggedDevicesTypeDesktop => 'Desktop';

  @override
  String get loggedDevicesTypeUnknown => 'Unknown Device';

  @override
  String get privacySettingsTitle => 'Privacy';

  @override
  String get privacySearchableByMobile => 'Allow search by phone number';

  @override
  String get privacySearchableByLppId => 'Allow search by StartLink ID';

  @override
  String get privacyAllowFriendRequest => 'Allow friend requests';

  @override
  String get privacyProfileVisibility => 'Profile Visibility';

  @override
  String get privacyEveryone => 'Everyone';

  @override
  String get privacyFriendsOfFriends => 'Friends of friends';

  @override
  String get privacyNobody => 'Nobody';

  @override
  String get privacyFriendsOnly => 'Friends only';

  @override
  String get privacySaveSuccess => 'Settings saved';

  @override
  String get privacySaveFailed => 'Failed to save, please try again';

  @override
  String get fontSizeTitle => 'Font Size';

  @override
  String get fontSizeSmall => 'Small';

  @override
  String get fontSizeNormal => 'Normal';

  @override
  String get fontSizeLarge => 'Large';

  @override
  String get fontSizeExtraLarge => 'Extra Large';

  @override
  String get fontSizePreview => 'Preview';

  @override
  String get chatBackgroundTitle => 'Chat Background';

  @override
  String get chatBackgroundDefault => 'Default';

  @override
  String get chatBackgroundCustom => 'Custom';

  @override
  String get chatBackgroundReset => 'Reset to Default';

  @override
  String get termsTitle => 'Terms of Service';

  @override
  String get privacyPolicyTitle => 'Privacy Policy';

  @override
  String get recentContactsTitle => 'Recent';

  @override
  String get recentContactsEmpty => 'No recent contacts';

  @override
  String get inviteFriendsTitle => 'Invite Friends';

  @override
  String get inviteFriendsCopyLink => 'Copy Invite Link';

  @override
  String get inviteFriendsLinkCopied => 'Invite link copied';

  @override
  String get imageViewerTitle => 'Photo';

  @override
  String get imageViewerSave => 'Save to Album';

  @override
  String get imageViewerSaveSuccess => 'Saved to album';

  @override
  String get imageViewerSaveFailed => 'Failed to save, please try again';

  @override
  String get customerServiceTitle => 'Service Desk';

  @override
  String get customerServiceQueue => 'Queued';

  @override
  String get customerServiceActive => 'Active';

  @override
  String get customerServiceClaim => 'Accept';

  @override
  String get customerServiceTakeover => 'Take Over';

  @override
  String get customerServiceClose => 'End Service';

  @override
  String get customerServiceCloseConfirm => 'End this service session?';

  @override
  String get customerServiceNoQueue => 'No queued sessions';

  @override
  String get customerServiceNoActive => 'No active sessions';

  @override
  String get customerServiceVisitor => 'Visitor';

  @override
  String get customerServiceCustomer => 'Customer';

  @override
  String get customerServiceAssignedTo => 'Assigned to';

  @override
  String get customerServiceTransferConversation => 'Transfer Chat';

  @override
  String get marketingToolbar => 'Marketing Tools';

  @override
  String get callIncoming => 'Incoming Call';

  @override
  String get callOutgoing => 'Outgoing Call';

  @override
  String get callAccept => 'Accept';

  @override
  String get callReject => 'Decline';

  @override
  String get callHangup => 'End';

  @override
  String get callMissed => 'Missed Call';

  @override
  String get callDuration => 'Duration';

  @override
  String get callAudio => 'Voice Call';

  @override
  String get callVideo => 'Video Call';

  @override
  String get callConnecting => 'Connecting...';

  @override
  String get callRinging => 'Ringing...';

  @override
  String get callEnded => 'Call ended';

  @override
  String get callFailed => 'Call failed';

  @override
  String get callRejected => 'Call declined';

  @override
  String get callTimeout => 'No answer';

  @override
  String get callCancelled => 'Cancelled';

  @override
  String get pendingJoinRequestsTitle => 'New Applications';

  @override
  String get pendingJoinRequestsEmpty => 'No applications';

  @override
  String get pendingJoinRequestApprove => 'Approve';

  @override
  String get pendingJoinRequestReject => 'Reject';

  @override
  String get pendingJoinRequestApproveSuccess => 'Approved';

  @override
  String get pendingJoinRequestRejectSuccess => 'Rejected';

  @override
  String get pendingJoinRequestFailed => 'Operation failed, please try again';

  @override
  String get myCustomersTitle => 'My Customers';

  @override
  String get myCustomersEmpty => 'No customers';

  @override
  String get groupListTitle => 'Groups';

  @override
  String get groupListEmpty => 'No groups';

  @override
  String get addFriendTitle => 'Add Contact';

  @override
  String get addFriendSearchHint => 'Phone / Email / StartLink ID';

  @override
  String addFriendLppIdLabel(String lppId) {
    return 'StartLink ID: $lppId';
  }

  @override
  String get addFriendButton => 'Add';

  @override
  String get addFriendCannotAddSelf => 'You can\'t add yourself';

  @override
  String get addFriendUnsupportedUser =>
      'This user can\'t be added. You can message them directly.';

  @override
  String get addFriendMessageHint => 'Enter a message';

  @override
  String get addFriendSendRequest => 'Send Request';

  @override
  String get joinCompanyTitle => 'Join Enterprise';

  @override
  String get joinCompanyCodeHint => 'Enter enterprise code';

  @override
  String get joinCompanySearchHint => 'Search enterprise name';

  @override
  String get joinCompanyApply => 'Apply to Join';

  @override
  String get joinCompanyApplySuccess => 'Application submitted';

  @override
  String get joinCompanyApplyFailed => 'Failed to apply, please try again';

  @override
  String get joinCompanyAutoApproved => 'Approved automatically. Welcome!';

  @override
  String get joinCompanyPending => 'Application submitted, awaiting approval';

  @override
  String get joinCompanyInviteCodeHint => 'Enter invite code';

  @override
  String get joinCompanyAcceptInvite => 'Accept Invite';

  @override
  String get joinCompanyNoResults => 'No enterprises found';

  @override
  String joinCompanyMemberCount(int count) {
    return '$count members';
  }

  @override
  String get timezoneNameHawaii => 'Hawaii';

  @override
  String get timezoneNameAlaska => 'Alaska';

  @override
  String get timezoneNamePacificTime => 'Pacific Time';

  @override
  String get timezoneNameMountainTime => 'Mountain Time';

  @override
  String get timezoneNameCentralTime => 'Central Time';

  @override
  String get timezoneNameEasternTime => 'Eastern Time';

  @override
  String get timezoneNameAtlanticTime => 'Atlantic Time';

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
  String get timezoneNameBangkokHanoiJakarta => 'Bangkok/Hanoi/Jakarta';

  @override
  String get timezoneNameBeijingShanghaiHongKongTaipei =>
      'Beijing/Shanghai/Hong Kong/Taipei';

  @override
  String get timezoneNameTokyoSeoul => 'Tokyo/Seoul';

  @override
  String get timezoneNameAdelaide => 'Adelaide';

  @override
  String get timezoneNameSydneyMelbourne => 'Sydney/Melbourne';

  @override
  String get timezoneNameSolomonIslands => 'Solomon Islands';

  @override
  String get timezoneNameAucklandFiji => 'Auckland/Fiji';

  @override
  String get networkSmartSelectBestRoute => 'Smart select best route';

  @override
  String get networkTesting => 'Testing...';

  @override
  String get networkTestingShort => 'Testing';

  @override
  String networkLatencyMs(int ms) {
    return 'Latency ${ms}ms';
  }

  @override
  String get networkConnectionMode => 'Connection mode';

  @override
  String get networkDirectMode => 'Direct mode';

  @override
  String get networkProxyMode => 'Proxy mode';

  @override
  String get networkDirectModeDesc => 'Connect directly to the server';

  @override
  String get networkProxyModeDesc => 'Connect through a proxy server';

  @override
  String get networkDirectRoutes => 'Direct routes';

  @override
  String get networkProxyRoutes => 'Proxy routes';

  @override
  String get networkTestAll => 'Test all';

  @override
  String get networkChinaTelecom => 'China Telecom';

  @override
  String get networkChinaUnicom => 'China Unicom';

  @override
  String get networkChinaMobile => 'China Mobile';

  @override
  String get networkHongKongNode => 'Hong Kong node';

  @override
  String get networkSingaporeNode => 'Singapore node';

  @override
  String get networkJapanNode => 'Japan node';

  @override
  String get networkUnitedStatesNode => 'United States node';

  @override
  String get networkHint =>
      'Tips:\n• Direct mode: faster and suitable for domestic use\n• Proxy mode: more stable for cross-border communication\n• Tap the refresh icon to test a single route latency';
}
