import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';

class LegalDocumentData {
  final String appBarTitle;
  final List<LegalDocumentBlock> blocks;

  const LegalDocumentData({required this.appBarTitle, required this.blocks});
}

class LegalDocumentBlock {
  final String text;

  const LegalDocumentBlock(this.text);
}

const termsLegalDocumentZh = LegalDocumentData(
  appBarTitle: '用户协议',
  blocks: [
    LegalDocumentBlock(r'''微界用户服务协议'''),
    LegalDocumentBlock(r'''最近更新日期：2026年07月01日'''),
    LegalDocumentBlock(r'''生效日期：2026年07月01日'''),
    LegalDocumentBlock(
        r'''欢迎您使用微界软件及相关服务。本协议由您与微界的运营主体湖南鸿斯科技有限公司共同订立。请您在注册、登录或使用微界前仔细阅读并充分理解本协议，特别是涉及服务规则、用户内容、账号注销、责任限制、未成年人保护和争议解决的条款。您点击同意、注册、登录或继续使用微界，即表示您已阅读、理解并同意接受本协议。'''),
    LegalDocumentBlock(r'''一、服务性质与适用范围'''),
    LegalDocumentBlock(
        r'''1.1 微界是一款面向个人、企业和客服协作场景的即时通讯与客户服务工具。当前服务包括账号注册登录、好友与群组、应用内通讯录、文字/语音/图片/视频/文件消息、音视频通话、位置消息展示、扫码、收藏、定时消息、通知提醒、企业空间、在线客服工作台、客户资料、快捷回复、公告/广播、设置与反馈等功能。'''),
    LegalDocumentBlock(
        r'''1.2 微界支持移动端（iOS、Android）和桌面端使用。不同端、不同系统版本、不同账号角色或企业空间配置下，可用功能、权限申请和展示方式可能存在差异。某一端未展示或未开放的功能，不构成我们在该端已经提供该功能的承诺。'''),
    LegalDocumentBlock(
        r'''1.3 我们会持续优化服务，也可能因系统维护、版本升级、安全风控、法律法规要求或业务调整，对部分功能进行变更、中断、限制或终止。涉及您重要权益的重大变化，我们将通过应用内公告、弹窗、站内信、推送或其他合理方式提示。'''),
    LegalDocumentBlock(
        r'''1.4 用户协议和隐私政策会在注册、登录、设置、关于或其他便于访问的位置提供。涉及个人信息处理规则、敏感权限、账号注销、未成年人保护等重要事项时，我们会以醒目方式提示；依法需要单独同意的，我们会另行取得您的同意。'''),
    LegalDocumentBlock(r'''二、账号注册、登录与安全'''),
    LegalDocumentBlock(
        r'''2.1 您可通过手机号、邮箱、微界号、验证码、密码或我们支持的其他方式注册、登录微界。您应提供真实、准确、完整、有效的信息，并在信息变化时及时更新。'''),
    LegalDocumentBlock(
        r'''2.2 您应妥善保管账号、密码、验证码、设备和登录凭证。因您主动泄露、保管不善、使用弱密码、在非官方环境登录或受第三方欺诈导致的损失，由您自行承担；但我们将依法配合处理安全事件。'''),
    LegalDocumentBlock(
        r'''2.3 您不得出售、出租、出借、转让、共享账号，不得冒用他人身份，不得以自动化、批量注册、撞库、恶意验证等方式破坏账号体系。'''),
    LegalDocumentBlock(
        r'''2.4 如我们发现账号存在异常登录、被盗、违法违规使用、侵害他人权益或危害平台安全的风险，我们有权采取安全验证、限制登录、限制功能、冻结、注销或其他合理措施。'''),
    LegalDocumentBlock(r'''三、账号注销与数据删除'''),
    LegalDocumentBlock(
        r'''3.1 您可以在移动端通过“设置—账号与安全—注销账号”，或在桌面端通过“账号安全—注销账户”发起账号注销申请。该入口是账号删除的主要入口；本协议末尾联系方式仅用于您无法登录、无法访问应用内入口或需要人工协助的特殊情形，不作为替代应用内注销入口的强制流程。'''),
    LegalDocumentBlock(
        r'''3.2 为保护账号安全，注销前我们可能要求您完成身份验证、安全状态检查、验证码确认或风险确认。当前注销流程设有7天冷静期；冷静期内您可按页面提示重新登录并撤销注销。冷静期结束后，账号将按规则进入删除或匿名化处理流程。'''),
    LegalDocumentBlock(
        r'''3.3 账号注销后，与账号直接关联的个人资料、登录凭证、好友关系、企业空间关系、设备登录状态等将被删除或匿名化处理；依法需要留存的审计、安全、投诉、争议、日志等记录，将在法定或必要期限内保存，并仅用于合规、安全、争议处理或履行法定义务。'''),
    LegalDocumentBlock(
        r'''3.4 对由我们委托处理方处理且与账号直接关联的个人信息，我们会按合同和法律要求通知或要求其删除、匿名化或停止处理。由于备份、日志归档、灾备恢复等安全机制产生的副本，会在合理周期内覆盖、删除或匿名化，期间我们会限制访问和用途。'''),
    LegalDocumentBlock(r'''四、用户内容与通讯规则'''),
    LegalDocumentBlock(
        r'''4.1 您通过微界发送、上传、分享或保存的文字、图片、语音、视频、文件、头像、昵称、签名、群公告、客服沟通、反馈投诉等内容，均由您自行负责。您应确保相关内容来源合法，不侵犯他人的肖像权、名誉权、隐私权、知识产权、商业秘密或其他合法权益。'''),
    LegalDocumentBlock(
        r'''4.2 您不得利用微界制作、复制、发布、传播或存储违法违规、有害、侵权、欺诈、骚扰、垃圾营销、低俗色情、暴力恐怖、赌博诈骗、侵犯未成年人权益、恶意引流、恶意软件、虚假信息或危害网络安全、公共秩序和社会公德的内容。'''),
    LegalDocumentBlock(
        r'''4.3 对通讯互动和客服服务，我们会依法设置必要的投诉举报、屏蔽拉黑、风控识别和处置机制。您可以通过应用内投诉、举报、拉黑、删除、退出群聊、联系客服等方式处理不适内容或用户。'''),
    LegalDocumentBlock(
        r'''4.4 为履行法律法规、平台治理、用户投诉处理、安全风控和权益保护义务，我们有权依法对涉嫌违法违规或侵权内容采取提醒、限制传播、限制账号功能、暂停或终止服务、保存证据、向主管机关报告等措施。'''),
    LegalDocumentBlock(r'''五、客户服务与企业空间'''),
    LegalDocumentBlock(
        r'''5.1 如您作为企业成员、客服人员、客户或访客使用企业空间或在线客服功能，您理解并同意，相关企业、客服团队或您所属组织可能根据其管理权限查看、分配、处理与业务相关的会话、客户资料、服务记录、快捷回复、公告/广播和协作信息。'''),
    LegalDocumentBlock(
        r'''5.2 企业或组织对其员工、客服人员、客户资料和业务数据的管理，应遵守适用法律法规和其自行向相关人员作出的告知、授权与管理规则。我们将按平台规则和服务合同提供技术服务。'''),
    LegalDocumentBlock(
        r'''5.3 如果您代表企业或组织使用微界，应确保您有权上传、处理或授权我们处理与该企业、组织、客户或员工有关的信息，并已按适用法律向相关人员完成必要告知和授权。'''),
    LegalDocumentBlock(r'''六、权限、隐私与个人信息保护'''),
    LegalDocumentBlock(
        r'''6.1 我们非常重视个人信息保护。关于我们如何收集、使用、存储、共享和保护您的个人信息，以及您如何行使访问、更正、删除、撤回授权、注销账号等权利，请阅读《微界个人信息保护政策》。'''),
    LegalDocumentBlock(
        r'''6.2 微界会根据具体功能向系统申请相机、麦克风、相册/媒体、文件、位置、通知、网络、存储、扫码、角标等权限。我们会在您触发相关功能时申请权限，不会因您未使用相关功能而强制要求开启非必要权限。您可以拒绝或关闭非必要权限；拒绝后仅影响对应功能，不影响您使用不依赖该权限的其他功能。'''),
    LegalDocumentBlock(
        r'''6.3 我们不会因您拒绝与当前功能无关的非必要权限而拒绝提供基础服务，也不会将个人信息出售给任何第三方。'''),
    LegalDocumentBlock(
        r'''6.4 对精确位置、音视频通话内容、语音、图片、视频、文件、未成年人信息、账号密码或验证信息等可能构成敏感个人信息的内容，我们仅在实现具体功能、保障安全、处理争议或履行法定义务所必需的范围内处理，并会通过权限弹窗、功能说明、单独同意或其他合理方式提示。'''),
    LegalDocumentBlock(r'''七、软件使用限制'''),
    LegalDocumentBlock(
        r'''7.1 未经我们书面许可，您不得对微界进行反向工程、反向编译、反汇编、破解、篡改、绕过安全措施、删除权利声明、复制商业化使用或以其他方式侵害软件权利。'''),
    LegalDocumentBlock(
        r'''7.2 您不得使用插件、外挂、爬虫、模拟器批量脚本、自动化程序、抓包篡改、批量导出等方式干扰微界正常运行、获取非授权数据或影响其他用户体验。'''),
    LegalDocumentBlock(
        r'''7.3 您不得利用微界从事危害网络安全、破坏系统、绕过风控、攻击接口、批量注册、刷量、营销骚扰、诈骗、洗钱或其他违法违规活动。'''),
    LegalDocumentBlock(r'''八、知识产权'''),
    LegalDocumentBlock(
        r'''8.1 微界的软件、代码、界面、图标、商标、标识、产品名称、文案、图片、音视频、交互设计、技术架构及相关资料的知识产权归湖南鸿斯科技有限公司或相应权利人所有。未经许可，您不得复制、修改、传播、出租、出售、反向工程或用于商业目的。'''),
    LegalDocumentBlock(
        r'''8.2 您对自己依法享有权利的原创内容保留相应权利。为实现内容发送、展示、同步、存储、备份、投诉处理、安全风控和服务优化，您授予我们在提供微界服务所必需范围内，对该内容进行存储、传输、展示、格式转换、压缩、缓存和必要技术处理的权利。'''),
    LegalDocumentBlock(r'''九、未成年人保护'''),
    LegalDocumentBlock(
        r'''9.1 微界不主动面向未满14周岁的儿童提供服务。未满18周岁的未成年人使用微界，应在父母或其他监护人的指导和同意下进行。监护人应关注未成年人使用网络、通讯、社交和客服服务的安全。'''),
    LegalDocumentBlock(
        r'''9.2 如我们发现未成年人使用行为不符合相关法律法规、平台规则或监护人要求，我们有权依法采取限制功能、删除信息、注销账号或其他保护措施。监护人如认为未成年人账号或信息需要处理，可通过本协议末尾联系方式联系我们。'''),
    LegalDocumentBlock(r'''十、服务风险与责任限制'''),
    LegalDocumentBlock(
        r'''10.1 互联网服务可能受到网络故障、运营商线路、系统维护、设备兼容、恶意攻击、不可抗力或法律政策变化影响。我们将尽力保障服务连续性和安全性，但不承诺服务永不中断或完全无错误。'''),
    LegalDocumentBlock(
        r'''10.2 您通过微界接收或发送的信息、文件、链接、二维码、联系人资料、客服建议等，应自行判断真实性、合法性和安全性。对用户自行发布内容、第三方链接或非我们可控原因造成的损失，我们将在法律允许范围内承担相应责任。'''),
    LegalDocumentBlock(r'''10.3 本协议不排除或限制法律规定不得排除或限制的责任。'''),
    LegalDocumentBlock(r'''十一、协议变更与通知'''),
    LegalDocumentBlock(
        r'''11.1 我们可能根据法律法规、监管要求、产品功能、业务模式或安全需要修订本协议。重大变更将通过应用内公告、弹窗、推送、站内信或其他合理方式提示您。'''),
    LegalDocumentBlock(
        r'''11.2 如您不同意修订后的协议，您可以停止使用微界或申请注销账号；如您继续使用微界，视为您接受修订后的协议。对于依法需要重新取得同意或单独同意的变更，我们会按法律要求处理。'''),
    LegalDocumentBlock(r'''十二、法律适用、争议解决与联系方式'''),
    LegalDocumentBlock(
        r'''12.1 本协议的订立、履行、解释和争议解决适用中华人民共和国法律。因本协议或微界服务引起的争议，双方应友好协商；协商不成的，任何一方可向湖南鸿斯科技有限公司住所地有管辖权的人民法院提起诉讼。'''),
    LegalDocumentBlock(
        r'''12.2 如您对本协议、平台规则、账号、内容、投诉或服务有疑问，可通过以下方式联系我们：联系邮箱：postmaster@startlig.com；联系电话：17570846793；公司名称：湖南鸿斯科技有限公司；统一社会信用代码：91430100MAE5UXKE2R；联系地址：湖南省衡阳市蒸湘区呆鹰岭镇中平村湛塘组46号。'''),
  ],
);

const privacyLegalDocumentZh = LegalDocumentData(
  appBarTitle: '隐私政策',
  blocks: [
    LegalDocumentBlock(r'''微界个人信息保护政策（隐私政策）'''),
    LegalDocumentBlock(r'''最近更新日期：2026年07月01日'''),
    LegalDocumentBlock(r'''生效日期：2026年07月01日'''),
    LegalDocumentBlock(
        r'''湖南鸿斯科技有限公司（以下简称“我们”）是微界软件及相关服务的运营者。我们深知个人信息对您的重要性，并将按照合法、正当、必要、诚信、目的明确、公开透明、最小必要、安全保障和用户可控的原则处理您的个人信息。'''),
    LegalDocumentBlock(
        r'''请您在注册、登录或使用微界前仔细阅读并理解本政策。我们会在应用内以容易访问的方式提供本政策，并在应用商店、官网或其他上架平台按要求提供隐私政策链接。您点击同意、注册、登录或继续使用微界，即表示您已阅读并同意本政策；依法需要单独同意或明示同意的事项，我们会另行取得您的同意。'''),
    LegalDocumentBlock(r'''一、适用范围'''),
    LegalDocumentBlock(
        r'''1.1 本政策适用于微界移动端（iOS、Android）、桌面端以及我们通过接口、客服、企业空间或其他形态向您提供的微界服务。'''),
    LegalDocumentBlock(
        r'''1.2 本政策不适用于第三方独立向您提供的产品或服务。您通过微界访问第三方链接、网页或其他第三方能力时，请同时阅读第三方的隐私政策。'''),
    LegalDocumentBlock(
        r'''1.3 本政策所称个人信息，是以电子或者其他方式记录的与已识别或者可识别的自然人有关的各种信息，不包括匿名化处理后的信息；敏感个人信息是指一旦泄露或者非法使用，容易导致自然人人格尊严受到侵害或者人身、财产安全受到危害的个人信息。'''),
    LegalDocumentBlock(r'''二、我们收集哪些个人信息'''),
    LegalDocumentBlock(
        r'''2.1 账号注册与登录信息：当您注册、登录或使用账号安全功能时，我们可能收集手机号、邮箱、微界号、登录名、密码或密码摘要、验证码、头像、昵称、性别、生日、所在地、个性签名、登录状态、账号状态、注销状态、设备登录记录等信息，用于创建账号、身份验证、账号找回、安全保护和多端同步。'''),
    LegalDocumentBlock(
        r'''2.2 应用内通讯录与关系信息：当您完善资料、添加好友、加入企业空间、创建或加入群组时，我们可能收集头像、昵称、备注、标签、好友关系、黑名单、群组信息、群昵称、群公告、成员身份、企业空间、角色权限、客服归属关系等信息，用于好友、群聊、企业协作和客户服务。微界当前不申请系统通讯录权限。'''),
    LegalDocumentBlock(
        r'''2.3 通讯与互动信息：当您发送或接收消息、进行音视频通话、收藏、转发、投诉举报或使用在线客服时，我们会处理文字、图片、语音、视频、文件、位置消息内容、名片、表情、消息时间、发送状态、已读状态、撤回/重试记录、会话ID、群组ID、客服会话、服务记录、投诉材料等信息，用于实现消息传输、同步、展示、历史记录、客服处理、争议处理和安全风控。'''),
    LegalDocumentBlock(
        r'''2.4 媒体、文件与相册信息：当您选择头像、发送图片/视频/文件、拍摄照片或视频、保存图片、生成缩略图或打开文件时，我们会根据您主动选择或授权处理相册、媒体文件、文件名、文件大小、文件类型、缩略图、上传下载状态等信息。我们不会在未授权或非必要场景下读取您的全部相册或文件。'''),
    LegalDocumentBlock(
        r'''2.5 相机、麦克风与扫码信息：当您拍摄头像、发送拍摄内容、录制语音、进行音视频通话或扫码加好友/入群/加入企业时，我们会在您授权后调用相机、麦克风和扫码能力，处理拍摄画面、录音、通话音视频流、二维码内容和相关识别结果。'''),
    LegalDocumentBlock(
        r'''2.6 位置信息：当您主动使用已开放的位置相关功能时，我们会在您授权后获取粗略位置或精确位置。位置信息属于敏感个人信息；拒绝授权仅会影响位置相关功能，不影响基础通讯功能。'''),
    LegalDocumentBlock(
        r'''2.7 通知、设备与网络信息：为发送消息提醒、角标、来电提示、安全风控和服务稳定运行，我们可能处理通知授权状态、本地通知内容、设备登记ID、设备型号、操作系统版本、应用版本、网络类型、IP地址、设备语言、时区、崩溃日志、性能日志、诊断日志、接口错误码、连接状态等信息。'''),
    LegalDocumentBlock(
        r'''2.8 本地存储信息：为保持登录状态、消息草稿、设置项、缓存、媒体预览和离线体验，我们会在您的设备本地保存必要数据，例如访问令牌、刷新令牌、用户设置、会话缓存、消息缓存、媒体缓存、诊断缓存等。您可以通过系统设置、应用设置或账号注销等方式清理部分信息。'''),
    LegalDocumentBlock(
        r'''2.9 反馈、客服与争议处理信息：当您通过帮助与反馈、投诉建议、客服邮箱、电话或其他渠道联系我们时，我们可能收集您提交的问题描述、联系方式、截图、日志、账号信息、设备信息、沟通记录和处理结果，用于核实身份、定位问题、回复请求、处理投诉和留存必要证据。'''),
    LegalDocumentBlock(
        r'''2.10 我们不会因您拒绝与当前功能无关的非必要个人信息或系统权限而拒绝提供基础通讯服务；但如果某项信息是实现您主动使用的具体功能所必需，您拒绝提供后该功能可能无法正常使用。'''),
    LegalDocumentBlock(r'''三、系统权限调用说明'''),
    LegalDocumentBlock(
        r'''3.1 相机权限：用于拍摄头像、拍摄并发送图片/视频、扫码识别二维码、音视频通话画面采集。拒绝后无法使用拍摄、扫码或视频采集功能。'''),
    LegalDocumentBlock(
        r'''3.2 麦克风权限：用于语音消息、语音输入、音视频通话、拍摄视频时录音。拒绝后无法使用录音、语音通话或视频录音功能。'''),
    LegalDocumentBlock(
        r'''3.3 相册/照片/媒体/文件权限：用于选择头像、选择并发送图片/视频/音频/文件、保存图片或读取您主动选择的文件。拒绝后无法从相册或文件中选择内容，但可继续使用文字消息等功能。'''),
    LegalDocumentBlock(
        r'''3.4 位置权限：仅用于您主动使用已开放的位置相关功能。我们不会因您拒绝位置权限而拒绝提供基础通讯服务。'''),
    LegalDocumentBlock(
        r'''3.5 通知、角标和振动权限：用于新消息、客服会话、来电、系统提醒、未读角标和振动提示。您可在系统设置或应用设置中关闭。'''),
    LegalDocumentBlock(
        r'''3.6 网络与网络状态权限：用于连接服务器、发送消息、上传下载媒体、实时连接、检测网络状态和提升弱网体验。'''),
    LegalDocumentBlock(
        r'''3.7 存储权限（Android 12及以下或特定系统场景）：用于读取或保存您主动选择的图片、视频、音频和文件；Android 13及以上系统将按图片、视频、音频等媒体类型分别申请。'''),
    LegalDocumentBlock(
        r'''3.8 后台刷新/处理能力：用于必要的登录状态维护、消息同步、通知登记、缓存清理或系统允许范围内的任务处理。我们不会在后台采集与功能无关的敏感信息。'''),
    LegalDocumentBlock(
        r'''3.9 我们通常会在您触发相关功能时申请权限，不会在未发生对应业务场景时强制要求开启相机、麦克风、位置、相册/媒体等非基础权限。您可以在系统设置中管理或撤回上述权限。撤回授权不会影响撤回前基于授权已经进行的处理，但可能导致对应功能不可用。'''),
    LegalDocumentBlock(r'''四、我们如何使用个人信息'''),
    LegalDocumentBlock(
        r'''4.1 提供、维护和实现微界当前功能，包括注册登录、账号安全、消息发送与同步、好友与群组、音视频通话、文件传输、企业空间、在线客服、通知提醒、资料展示、投诉举报和客户支持。'''),
    LegalDocumentBlock(
        r'''4.2 保障账号、服务和通信安全，包括身份验证、登录风控、异常检测、防欺诈、防垃圾信息、防骚扰、防攻击、防恶意注册、接口安全、内容安全和争议证据留存。'''),
    LegalDocumentBlock(
        r'''4.3 改善产品和服务质量，包括故障排查、性能分析、兼容性优化、弱网优化、崩溃修复、客服响应和用户体验改进。我们会尽量使用去标识化或匿名化数据进行统计分析。'''),
    LegalDocumentBlock(
        r'''4.4 履行法律法规、监管要求、司法或行政机关要求，以及处理投诉、举报、纠纷、审计、安全事件和保护用户、我们或公众的合法权益。'''),
    LegalDocumentBlock(
        r'''4.5 我们不会将您的个人信息出售给任何第三方，也不会在未经您同意的情况下将个人信息用于与微界当前服务无关的目的。'''),
    LegalDocumentBlock(r'''五、本地缓存和类似技术'''),
    LegalDocumentBlock(
        r'''5.1 我们可能使用Token、本地缓存、数据库、日志标识、设备登记ID或类似技术，用于保持登录状态、记住设置、保障安全、统计服务质量、缓存消息和提升访问体验。'''),
    LegalDocumentBlock(
        r'''5.2 移动端和桌面端会使用操作系统能力和项目依赖组件来实现相机/相册/文件选择、扫码、已开放的位置相关能力、音视频通话、通知、角标、本地存储、网络连接、崩溃诊断等当前功能。我们仅在实现对应功能的必要范围内调用这些能力。'''),
    LegalDocumentBlock(
        r'''5.3 您可以通过系统设置、应用设置、清理缓存、退出登录、删除本地数据或注销账号等方式管理部分本地信息。为保障账号安全、消息同步和故障排查，部分必要缓存和日志可能在合理期限内保留。'''),
    LegalDocumentBlock(r'''六、委托处理、共享、转让和公开披露'''),
    LegalDocumentBlock(
        r'''6.1 委托处理：为提供服务器托管、云存储、内容安全、消息通知、音视频通话、已开放的位置相关能力、客服支持、数据安全、验证码、日志诊断等当前服务，我们可能委托合作方处理必要个人信息。我们会与合作方约定处理目的、期限、方式、信息类型、保护措施和双方责任，并监督其按照约定处理信息。'''),
    LegalDocumentBlock(
        r'''6.2 第三方 SDK、组件或合作方清单：如果当前版本通过第三方 SDK、开源组件或合作方实现音视频通话、图片/视频/文件选择、位置能力、扫码识别、本地通知、崩溃诊断、内容安全、验证码、云存储等能力，我们会按应用商店和监管要求，在隐私政策、应用内页面、官网或上架材料中列明其名称、处理目的、处理方式、个人信息类型、官网或隐私政策链接。您也可以通过本政策联系方式向我们索取当前版本的第三方信息共享或委托处理清单。'''),
    LegalDocumentBlock(
        r'''6.3 共享：除本政策说明、您主动选择或法律法规要求外，我们不会与第三方共享您的个人信息。确需共享时，我们会遵循最小必要原则，依法取得您的同意或单独同意，并要求接收方承担保密和安全保护义务。'''),
    LegalDocumentBlock(
        r'''6.4 企业空间和客服场景共享：当您加入企业空间、接受在线客服或作为客服人员处理会话时，相关企业、客服团队或您所属组织可能基于业务权限访问与该空间或服务相关的信息。请您注意企业或组织自身的管理规则。'''),
    LegalDocumentBlock(
        r'''6.5 转让：如发生合并、分立、收购、资产转让、破产清算或类似交易，涉及个人信息转让的，我们会要求新的持有方继续受本政策约束；否则将要求其重新征得您的同意。'''),
    LegalDocumentBlock(
        r'''6.6 公开披露：我们原则上不会公开披露您的个人信息。确需公开披露时，将在符合法律法规并取得您的单独同意后进行；但法律法规、司法或行政机关依法要求的除外。'''),
    LegalDocumentBlock(r'''七、征得授权同意的例外'''),
    LegalDocumentBlock(
        r'''根据法律法规，在以下情形中处理您的个人信息可能无需另行取得您的同意：为订立、履行您作为一方当事人的合同所必需；为履行法定职责或法定义务所必需；为应对突发公共卫生事件，或紧急情况下保护自然人的生命健康和财产安全所必需；在合理范围内处理您自行公开或其他已经合法公开的个人信息；为公共利益实施新闻报道、舆论监督等行为在合理范围内处理个人信息；法律法规规定的其他情形。'''),
    LegalDocumentBlock(r'''八、敏感个人信息处理'''),
    LegalDocumentBlock(
        r'''8.1 在使用微界过程中，精确位置、音视频通话内容、语音、图片、视频、文件、未成年人信息、账号密码或验证信息等可能构成敏感个人信息。'''),
    LegalDocumentBlock(
        r'''8.2 我们仅在实现特定功能、保障账号安全、履行法律义务或处理争议所必需的范围内处理敏感个人信息，并会在具体场景中通过权限弹窗、功能说明、单独同意或其他合理方式告知您。拒绝提供敏感个人信息可能导致对应功能无法使用，但不影响其他不依赖该信息的功能。'''),
    LegalDocumentBlock(
        r'''8.3 对精确位置、麦克风、相机、相册/媒体、文件、音视频通话等敏感权限，我们会尽量在您主动触发相关功能时申请，并说明用途。您可以通过系统权限管理撤回授权；撤回后我们将停止基于该权限继续采集相应信息。'''),
    LegalDocumentBlock(r'''九、信息存储地点和期限'''),
    LegalDocumentBlock(
        r'''9.1 存储地点：我们在中华人民共和国境内运营过程中收集和产生的个人信息，原则上存储于中华人民共和国境内。若因业务需要向境外提供个人信息，我们将按照法律法规要求进行安全评估、认证、合同约束或其他合规措施，并依法告知您、取得您的单独同意。'''),
    LegalDocumentBlock(
        r'''9.2 存储期限：我们仅在实现处理目的所必需的最短期限内保存您的个人信息。账号信息通常保存至账号注销或服务终止后必要期限；消息和媒体信息按用户使用、同步、备份和法律要求保存；日志和安全记录按安全、审计、争议处理和法律要求保存；超过必要期限后，我们将删除或匿名化处理。'''),
    LegalDocumentBlock(
        r'''9.3 账号注销：您提交账号注销并经过7天冷静期后，我们会删除或匿名化与账号直接关联的个人信息；依法需要留存的安全、审计、投诉、争议或监管记录，将在必要期限内保存，并限制访问和用途。'''),
    LegalDocumentBlock(
        r'''9.4 对备份、灾备、日志归档中的个人信息，我们会在保证系统安全和业务连续性的前提下，通过定期覆盖、到期删除、匿名化或访问限制等方式处理。备份中的信息在恢复前不会作为日常业务数据使用。'''),
    LegalDocumentBlock(r'''十、您的个人信息权利'''),
    LegalDocumentBlock(
        r'''10.1 访问和复制：您可以在应用内查看个人资料、账号信息、好友/群组、设置、消息记录和部分服务记录。无法自行访问的，可通过本政策联系方式向我们申请。'''),
    LegalDocumentBlock(
        r'''10.2 更正和补充：当您发现个人信息不准确或不完整时，可以在个人资料、账号设置或相关功能中修改，也可以联系我们协助处理。'''),
    LegalDocumentBlock(
        r'''10.3 删除：在法律法规规定情形下，您可以请求删除个人信息，包括处理目的已实现或无法实现、我们停止提供服务、保存期限届满、您撤回同意、我们违反法律法规或约定处理信息等情形。'''),
    LegalDocumentBlock(
        r'''10.4 撤回同意和关闭权限：您可以通过系统权限设置、应用设置、通知设置、隐私设置或联系我们撤回部分授权。撤回后我们将不再处理相应个人信息，但不影响撤回前已进行处理的效力。'''),
    LegalDocumentBlock(
        r'''10.5 注销账号和删除账号数据：移动端路径为“设置—账号与安全—注销账号”，桌面端路径为“账号安全—注销账户”。在 Google Play 等要求提供应用外账号删除入口的平台上，我们会在应用商店开发者信息或官网提供可公开访问的账号删除请求网页，并在上架资料中填写该网页地址；本政策联系邮箱用于无法登录、无法访问删除入口或需要人工协助的特殊情形。注销完成后，我们将按本政策删除或匿名化账号数据。'''),
    LegalDocumentBlock(
        r'''10.6 解释说明和投诉举报：您有权要求我们解释个人信息处理规则以及投诉举报个人信息处理问题。我们将在验证您的身份后尽快处理，一般情况下将在15个工作日内回复。'''),
    LegalDocumentBlock(
        r'''10.7 如果您的请求涉及复制个人信息、转移个人信息、删除账号、删除大量数据或影响他人权益，我们可能要求您补充身份验证或请求说明，以保障账号与数据安全。'''),
    LegalDocumentBlock(
        r'''10.8 在以下情形中，我们可能无法响应您的请求：与国家安全、公共安全、刑事侦查、行政执法、司法程序、重大公共利益直接相关；有充分证据表明您存在主观恶意或滥用权利；响应请求将严重损害您、其他个人或组织的合法权益；涉及商业秘密；法律法规规定的其他情形。'''),
    LegalDocumentBlock(r'''十一、未成年人个人信息保护'''),
    LegalDocumentBlock(
        r'''11.1 微界不主动面向未满14周岁的儿童提供服务。未满18周岁的未成年人使用微界，应在父母或其他监护人的同意和指导下进行。'''),
    LegalDocumentBlock(
        r'''11.2 如我们发现未满14周岁的儿童在未取得监护人同意的情况下使用微界或提供个人信息，我们将依法采取删除、限制、注销等措施。监护人如发现儿童个人信息被处理，可通过本政策联系方式联系我们。'''),
    LegalDocumentBlock(
        r'''11.3 监护人要求访问、更正、删除未成年人个人信息或注销相关账号的，我们会在核验监护关系和账号归属后依法处理。'''),
    LegalDocumentBlock(r'''十二、信息安全保护'''),
    LegalDocumentBlock(
        r'''12.1 我们会采取符合行业通行水平的安全措施保护个人信息，包括 HTTPS/TLS 加密传输、访问控制、权限隔离、身份验证、日志审计、数据备份、敏感信息加密或脱敏、安全监测和应急响应。'''),
    LegalDocumentBlock(
        r'''12.2 请您妥善保管账号、密码、验证码和设备，不要向他人泄露。互联网环境并非绝对安全，如发生个人信息安全事件，我们将按照法律法规要求及时告知事件情况、影响、处置措施、风险建议和补救措施。'''),
    LegalDocumentBlock(
        r'''12.3 我们会对员工、受托处理方和合作方采取必要的权限控制、保密义务和安全审计措施，防止个人信息被未经授权访问、披露、篡改、丢失或滥用。'''),
    LegalDocumentBlock(r'''十三、政策更新'''),
    LegalDocumentBlock(
        r'''13.1 我们可能因法律法规、监管要求、产品功能、业务模式、个人信息处理目的、处理方式、共享对象或联系方式变化而更新本政策。'''),
    LegalDocumentBlock(
        r'''13.2 对于重大变更，我们会通过应用内弹窗、公告、推送、站内信或其他合理方式提醒您。未经您明确同意，我们不会削减您按照本政策享有的权利。依法需要重新取得同意或单独同意的，我们会按要求处理。'''),
    LegalDocumentBlock(r'''十四、如何联系我们'''),
    LegalDocumentBlock(
        r'''如您对本政策、个人信息保护、账号注销、数据删除、权限使用、投诉举报、第三方信息共享清单、儿童个人信息保护或应用商店数据安全声明有任何疑问、意见或请求，可通过以下方式联系我们。我们将在验证您的身份后及时处理，一般情况下将在15个工作日内回复。'''),
    LegalDocumentBlock(r'''公司名称：湖南鸿斯科技有限公司'''),
    LegalDocumentBlock(r'''English Name: Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(r'''统一社会信用代码：91430100MAE5UXKE2R'''),
    LegalDocumentBlock(r'''法定代表人：刘武帝'''),
    LegalDocumentBlock(r'''联系人：刘武帝'''),
    LegalDocumentBlock(r'''企业地址：长沙经济技术开发区茶塘路6号1#厂房101室4层'''),
    LegalDocumentBlock(r'''联系地址：湖南省衡阳市蒸湘区呆鹰岭镇中平村湛塘组46号'''),
    LegalDocumentBlock(r'''邮编：410000'''),
    LegalDocumentBlock(r'''联系邮箱：postmaster@startlig.com'''),
    LegalDocumentBlock(r'''联系电话：17570846793'''),
    LegalDocumentBlock(
        r'''如果您对我们的回复不满意，特别是认为我们的个人信息处理行为损害了您的合法权益，您还可以向有管辖权的人民法院提起诉讼，或向相关监管部门进行投诉举报。'''),
  ],
);

const termsLegalDocumentZhTw = LegalDocumentData(
  appBarTitle: '使用者協議',
  blocks: [
    LegalDocumentBlock(r'''微界使用者服務協議'''),
    LegalDocumentBlock(r'''最近更新日期：2026年07月01日'''),
    LegalDocumentBlock(r'''生效日期：2026年07月01日'''),
    LegalDocumentBlock(
        r'''Welcome to Weijie software and related services. These Terms are entered into between you and Hunan Hongsi Technology Co., Ltd. Please read them carefully before registration, login, or use, especially the clauses on service rules, user content, account deletion, liability limits, minors, and dispute resolution. By tapping Agree, registering, logging in, or continuing to use the service, you confirm that you have read, understood, and accepted these Terms.'''),
    LegalDocumentBlock(r'''1. Service Scope'''),
    LegalDocumentBlock(
        r'''Weijie is an instant messaging and customer-service collaboration tool for individuals, enterprises, and support teams. Current features include account registration and login, friends and groups, in-app contacts, text, voice, image, video, and file messages, audio/video calls, location message display, QR-code scanning, favorites, scheduled messages, notifications, enterprise spaces, online customer-service workspace, customer profiles, quick replies, announcements/broadcasts, settings, and feedback.'''),
    LegalDocumentBlock(
        r'''Weijie supports mobile clients (iOS and Android) and desktop clients. Available features, permission prompts, and display methods may differ by client, operating-system version, account role, or enterprise-space configuration. A feature not displayed or enabled on one client does not mean that we have promised to provide it on that client.'''),
    LegalDocumentBlock(
        r'''We may optimize, change, suspend, restrict, or terminate part of the services for maintenance, upgrades, security, legal requirements, or business adjustments. For material changes affecting your important rights, we will notify you by in-app announcement, pop-up, message, push notification, or another reasonable method.'''),
    LegalDocumentBlock(
        r'''These Terms and the Privacy Policy will be provided in registration, login, settings, about, or other easy-to-access locations. Important matters such as personal-information processing, sensitive permissions, account deletion, and minors protection will be highlighted. Where separate consent is required by law, we will obtain it separately.'''),
    LegalDocumentBlock(r'''2. Account Registration, Login, and Security'''),
    LegalDocumentBlock(
        r'''You may register or log in through mobile number, email, Weijie ID, verification code, password, or other supported methods. You must provide true, accurate, complete, and valid information and keep it updated.'''),
    LegalDocumentBlock(
        r'''You are responsible for keeping your account, password, verification code, device, and login credentials secure. Losses caused by your disclosure, poor custody, weak password, login in unofficial environments, or third-party fraud are borne by you, while we will handle security incidents as required by law.'''),
    LegalDocumentBlock(
        r'''You must not sell, rent, lend, transfer, or share your account, impersonate others, or damage the account system through automation, batch registration, credential stuffing, malicious verification, or similar methods.'''),
    LegalDocumentBlock(
        r'''If we find abnormal login, account theft, illegal use, infringement of others' rights, or platform-security risk, we may take reasonable measures including security verification, login restriction, function restriction, freezing, cancellation, or account deletion.'''),
    LegalDocumentBlock(r'''3. Account Deletion and Data Deletion'''),
    LegalDocumentBlock(
        r'''You may request account deletion in the mobile client through Settings - Account and Security - Delete Account, or in the desktop client through Account Security - Delete Account. These in-app entries are the primary deletion channels. The contact methods at the end of these Terms are fallback channels only when you cannot log in, cannot access the in-app entry, or need manual assistance.'''),
    LegalDocumentBlock(
        r'''To protect account security, we may require identity verification, security-status checks, verification-code confirmation, or risk confirmation before deletion. The current process includes a 7-day cooling-off period. During the cooling-off period, you may log in again as instructed and cancel the deletion request. After the period ends, the account will enter deletion or anonymization according to the rules.'''),
    LegalDocumentBlock(
        r'''After account deletion, personal profiles, login credentials, friend relationships, enterprise-space relationships, device login status, and other information directly associated with the account will be deleted or anonymized. Audit, security, complaint, dispute, log, or other records that must be retained by law or necessity will be kept only for compliance, security, dispute handling, or legal obligations.'''),
    LegalDocumentBlock(
        r'''For personal information processed by entrusted processors and directly associated with the account, we will notify or require them to delete, anonymize, or stop processing as required by contract and law. Copies generated by backup, log archive, or disaster-recovery mechanisms will be overwritten, deleted, or anonymized within a reasonable cycle, with access and use restricted during that period.'''),
    LegalDocumentBlock(r'''4. User Content and Communication Rules'''),
    LegalDocumentBlock(
        r'''You are responsible for text, images, voice, videos, files, avatars, nicknames, signatures, group announcements, customer-service communications, feedback, complaints, and other content you send, upload, share, or save through Weijie. You must ensure that the content source is lawful and does not infringe portrait rights, reputation rights, privacy, intellectual property, trade secrets, or other lawful rights.'''),
    LegalDocumentBlock(
        r'''You must not use Weijie to create, copy, publish, transmit, or store illegal, harmful, infringing, fraudulent, harassing, spam-marketing, obscene, violent, terrorist, gambling, scam, minor-harming, malicious-traffic, malware, false-information, network-security-risk, public-order-harming, or immoral content.'''),
    LegalDocumentBlock(
        r'''For communications and customer service, we will provide necessary complaint, report, block, blacklist, risk-identification, and handling mechanisms. You may handle inappropriate content or users through in-app complaint, report, block, deletion, leaving a group, or contacting customer service.'''),
    LegalDocumentBlock(
        r'''To comply with laws, platform governance, complaint handling, security risk control, and rights protection, we may lawfully take measures against suspected illegal, non-compliant, or infringing content, including reminders, distribution restriction, account-function restriction, suspension or termination of service, evidence preservation, and reporting to competent authorities.'''),
    LegalDocumentBlock(r'''5. Customer Service and Enterprise Spaces'''),
    LegalDocumentBlock(
        r'''If you use enterprise spaces or online customer-service features as an enterprise member, service agent, customer, or visitor, you understand that the relevant enterprise, support team, or your organization may view, assign, and process business-related conversations, customer profiles, service records, quick replies, announcements/broadcasts, and collaboration information according to its permissions.'''),
    LegalDocumentBlock(
        r'''Enterprises or organizations must comply with applicable laws and their own notice, authorization, and management rules when managing employees, service agents, customer profiles, and business data. We provide technical services according to platform rules and service contracts.'''),
    LegalDocumentBlock(
        r'''If you use Weijie on behalf of an enterprise or organization, you must ensure that you are authorized to upload, process, or authorize us to process information relating to that enterprise, organization, customers, or employees, and that necessary notices and authorizations have been completed under applicable law.'''),
    LegalDocumentBlock(r'''6. Privacy and Permissions'''),
    LegalDocumentBlock(
        r'''We value personal-information protection. Please read the Weijie Privacy Policy to understand how we collect, use, store, share, and protect your personal information, and how you may exercise rights such as access, correction, deletion, withdrawal of authorization, and account deletion.'''),
    LegalDocumentBlock(
        r'''Weijie may request system permissions such as camera, microphone, photos/media, files, location, notifications, network, storage, QR-code scanning, and badges according to the specific feature. We usually request permissions when you trigger the relevant feature and do not require unnecessary permissions for features you do not use.'''),
    LegalDocumentBlock(
        r'''You may refuse or disable non-essential permissions. Refusal affects only the corresponding feature and does not affect other features that do not rely on that permission. We will not refuse basic services merely because you decline non-essential permissions unrelated to the current feature, and we do not sell personal information to any third party.'''),
    LegalDocumentBlock(
        r'''Precise location, audio/video-call content, voice, images, videos, files, minors' information, account passwords, and verification information may constitute sensitive personal information. We process them only when necessary for specific features, security, dispute handling, or legal obligations, and we will provide prompts or obtain separate consent where appropriate.'''),
    LegalDocumentBlock(
        r'''7. Software Use Restrictions and Intellectual Property'''),
    LegalDocumentBlock(
        r'''Without our written permission, you must not reverse engineer, decompile, disassemble, crack, tamper with, bypass security measures, remove rights notices, copy for commercial use, or otherwise infringe Weijie software rights.'''),
    LegalDocumentBlock(
        r'''You must not use plug-ins, add-ons, crawlers, emulator batch scripts, automation programs, packet tampering, batch export, or similar methods to interfere with Weijie, obtain unauthorized data, or affect other users' experience.'''),
    LegalDocumentBlock(
        r'''The software, code, interface, icons, trademarks, logos, product names, text, images, audio/video, interaction design, technical architecture, and related materials of Weijie belong to Hunan Hongsi Technology Co., Ltd. or relevant rights holders. Your original content remains yours, but you grant us the necessary rights to store, transmit, display, convert, compress, cache, and technically process it for service delivery, synchronization, backup, complaint handling, security, and optimization.'''),
    LegalDocumentBlock(r'''8. Minors Protection'''),
    LegalDocumentBlock(
        r'''Weijie is not actively directed to children under 14. Minors under 18 should use Weijie with the consent and guidance of parents or other guardians. Guardians should pay attention to minors' safety when using networking, communication, social, and customer-service functions.'''),
    LegalDocumentBlock(
        r'''If we find that a minor's use does not comply with laws, platform rules, or guardian requirements, we may lawfully restrict functions, delete information, delete the account, or take other protective measures. Guardians may contact us through the methods at the end of these Terms.'''),
    LegalDocumentBlock(r'''9. Service Risks and Liability'''),
    LegalDocumentBlock(
        r'''Internet services may be affected by network failures, carrier lines, system maintenance, device compatibility, malicious attacks, force majeure, or changes in law and policy. We will make reasonable efforts to maintain continuity and security, but we do not promise that the service will never be interrupted or error-free.'''),
    LegalDocumentBlock(
        r'''You should judge the authenticity, legality, and security of information, files, links, QR codes, contact profiles, and customer-service suggestions received or sent through Weijie. These Terms do not exclude or limit liabilities that cannot be excluded or limited by law.'''),
    LegalDocumentBlock(
        r'''10. Changes, Law, Dispute Resolution, and Contact'''),
    LegalDocumentBlock(
        r'''We may revise these Terms according to laws, regulatory requirements, product features, business models, or security needs. If you disagree with revised Terms, you may stop using Weijie or request account deletion. Continued use means acceptance, except where the law requires renewed or separate consent.'''),
    LegalDocumentBlock(
        r'''The formation, performance, interpretation, and dispute resolution of these Terms are governed by the laws of the People's Republic of China. Disputes should first be resolved through friendly negotiation; if negotiation fails, either party may file a lawsuit with a competent people's court at the domicile of Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(
        r'''Contact: postmaster@startlig.com; phone: 17570846793; company: Hunan Hongsi Technology Co., Ltd.; Unified Social Credit Code: 91430100MAE5UXKE2R; address: No. 46, Zhantang Group, Zhongping Village, Daiyingling Town, Zhengxiang District, Hengyang, Hunan, China.'''),
  ],
);

const privacyLegalDocumentZhTw = LegalDocumentData(
  appBarTitle: '隱私政策',
  blocks: [
    LegalDocumentBlock(r'''微界個人資料保護政策（隱私政策）'''),
    LegalDocumentBlock(r'''最近更新日期：2026年07月01日'''),
    LegalDocumentBlock(r'''生效日期：2026年07月01日'''),
    LegalDocumentBlock(
        r'''Hunan Hongsi Technology Co., Ltd. is the operator of Weijie software and related services. We understand the importance of personal information and process it under the principles of lawfulness, legitimacy, necessity, good faith, purpose limitation, openness, transparency, minimum necessity, security, and user control.'''),
    LegalDocumentBlock(
        r'''Please read this Policy carefully before registration, login, or use. We provide this Policy in the app and, where required by app stores or listing platforms, through a public privacy-policy link. By tapping Agree, registering, logging in, or continuing to use Weijie, you confirm that you have read and agreed to this Policy. Where separate or express consent is required by law, we will obtain it separately.'''),
    LegalDocumentBlock(r'''1. Scope'''),
    LegalDocumentBlock(
        r'''This Policy applies to Weijie mobile clients (iOS and Android), desktop clients, and Weijie services provided through APIs, customer service, enterprise spaces, or other forms.'''),
    LegalDocumentBlock(
        r'''This Policy does not apply to products or services independently provided by third parties. When you access third-party links, pages, or capabilities through Weijie, please read their privacy policies as well.'''),
    LegalDocumentBlock(
        r'''Personal information means information recorded electronically or otherwise that relates to an identified or identifiable natural person, excluding anonymized information. Sensitive personal information means information that, once leaked or illegally used, may easily harm personal dignity or personal/property safety.'''),
    LegalDocumentBlock(r'''2. Information We Collect'''),
    LegalDocumentBlock(
        r'''Account registration and login information: mobile number, email, Weijie ID, login name, password or password digest, verification code, avatar, nickname, gender, birthday, location shown in profile, signature, login status, account status, deletion status, and device login records, for account creation, authentication, recovery, security, and multi-client synchronization.'''),
    LegalDocumentBlock(
        r'''In-app contacts and relationship information: avatar, nickname, remarks, tags, friend relationships, blacklist, group information, group nickname, group announcements, member identity, enterprise spaces, roles and permissions, and customer-service ownership, for friends, groups, enterprise collaboration, and customer service. Weijie currently does not request system contacts permission.'''),
    LegalDocumentBlock(
        r'''Communication and interaction information: text, images, voice, videos, files, location-message content, business cards, emojis, message time, sending status, read status, recall/retry records, conversation IDs, group IDs, customer-service conversations, service records, and complaint materials, for message transmission, synchronization, display, history, service handling, disputes, and security risk control.'''),
    LegalDocumentBlock(
        r'''Media, files, and photo-library information: when you choose an avatar, send images, videos, or files, take photos or videos, save images, generate thumbnails, or open files, we process the photos, media files, file names, file sizes, file types, thumbnails, upload/download status, and other information you select or authorize. We do not read your entire photo library or files without authorization or necessity.'''),
    LegalDocumentBlock(
        r'''Camera, microphone, and QR-code scanning information: after authorization, we call camera, microphone, and scanning capabilities for avatar shooting, sending captured content, voice recording, audio/video calls, and QR-code friend, group, or enterprise joining.'''),
    LegalDocumentBlock(
        r'''Location information: when you actively use available location-related features, we may obtain approximate or precise location after your authorization. Location is sensitive personal information. Refusal affects only location-related features and not basic communication.'''),
    LegalDocumentBlock(
        r'''Notification, device, and network information: notification authorization status, local notification content, device registration ID, device model, operating-system version, app version, network type, IP address, device language, time zone, crash logs, performance logs, diagnostic logs, API error codes, and connection status, for message alerts, badges, call prompts, security, and stable operation.'''),
    LegalDocumentBlock(
        r'''Local storage information: access tokens, refresh tokens, user settings, conversation caches, message caches, media caches, diagnostic caches, and similar necessary local data to maintain login status, drafts, settings, previews, and offline experience.'''),
    LegalDocumentBlock(
        r'''Feedback, support, and dispute information: issue descriptions, contact methods, screenshots, logs, account information, device information, communications, and handling results you submit through feedback, complaints, support email, phone, or other channels.'''),
    LegalDocumentBlock(
        r'''We will not refuse basic communication services merely because you decline non-essential personal information or permissions unrelated to the current feature. If information is necessary for a feature you actively use, refusal may make that feature unavailable.'''),
    LegalDocumentBlock(r'''3. System Permissions'''),
    LegalDocumentBlock(
        r'''Camera: used for avatar shooting, taking and sending images/videos, QR-code scanning, and video collection for audio/video calls.'''),
    LegalDocumentBlock(
        r'''Microphone: used for voice messages, voice input, audio/video calls, and audio recording during video capture.'''),
    LegalDocumentBlock(
        r'''Photos/media/files: used for choosing avatars, selecting and sending images, videos, audio, or files, saving images, or reading files you actively select.'''),
    LegalDocumentBlock(
        r'''Location: used only for available location-related features you actively use. We do not refuse basic communication because you decline location permission.'''),
    LegalDocumentBlock(
        r'''Notifications, badges, and vibration: used for new messages, customer-service conversations, calls, system reminders, unread badges, and vibration alerts. You may disable them in system or app settings.'''),
    LegalDocumentBlock(
        r'''Network and network status: used for connecting to servers, sending messages, uploading/downloading media, real-time connections, detecting network status, and improving weak-network experience.'''),
    LegalDocumentBlock(
        r'''Storage on Android 12 and earlier or specific system scenarios: used to read or save images, videos, audio, and files you actively select. On Android 13 and later, permissions are requested by media type where applicable.'''),
    LegalDocumentBlock(
        r'''Background refresh or processing: used for necessary login-state maintenance, message synchronization, notification registration, cache cleanup, or tasks allowed by the operating system. We do not collect unrelated sensitive information in the background.'''),
    LegalDocumentBlock(
        r'''Permissions are usually requested when you trigger the relevant feature. You may manage or withdraw permissions in system settings. Withdrawal does not affect processing already performed based on prior authorization, but the corresponding feature may become unavailable.'''),
    LegalDocumentBlock(r'''4. How We Use Personal Information'''),
    LegalDocumentBlock(
        r'''We use personal information to provide, maintain, and implement current Weijie features, including registration/login, account security, message sending and synchronization, friends and groups, audio/video calls, file transfer, enterprise spaces, online customer service, notifications, profile display, complaints/reports, and support.'''),
    LegalDocumentBlock(
        r'''We use information to protect account, service, and communication security, including identity verification, login risk control, anomaly detection, anti-fraud, anti-spam, anti-harassment, anti-attack, anti-malicious registration, API security, content safety, and dispute evidence retention.'''),
    LegalDocumentBlock(
        r'''We use information to improve product and service quality, including troubleshooting, performance analysis, compatibility optimization, weak-network optimization, crash fixing, support response, and user-experience improvement. We try to use de-identified or anonymized data for statistics and analysis.'''),
    LegalDocumentBlock(
        r'''We use information to comply with laws, regulatory requirements, judicial or administrative requests, and to handle complaints, reports, disputes, audits, security incidents, and protection of lawful rights of users, us, or the public.'''),
    LegalDocumentBlock(
        r'''We do not sell personal information and do not use it for purposes unrelated to current Weijie services without your consent.'''),
    LegalDocumentBlock(r'''5. Local Cache and Similar Technologies'''),
    LegalDocumentBlock(
        r'''We may use tokens, local caches, databases, log identifiers, device registration IDs, or similar technologies to keep login status, remember settings, protect security, analyze service quality, cache messages, and improve access experience.'''),
    LegalDocumentBlock(
        r'''Mobile and desktop clients use operating-system capabilities and project dependencies for camera/photo/file selection, QR-code scanning, available location-related capabilities, audio/video calls, notifications, badges, local storage, network connections, and crash diagnostics. We call these capabilities only as necessary for the corresponding feature.'''),
    LegalDocumentBlock(
        r'''You may manage part of local information through system settings, app settings, cache cleanup, logout, local-data deletion, or account deletion. Some necessary caches and logs may be retained for account security, message synchronization, and troubleshooting within a reasonable period.'''),
    LegalDocumentBlock(
        r'''6. Entrusted Processing, Sharing, Transfer, and Disclosure'''),
    LegalDocumentBlock(
        r'''Entrusted processing: to provide server hosting, cloud storage, content safety, message notifications, audio/video calls, available location-related capabilities, customer support, data security, verification codes, and log diagnostics, we may entrust partners to process necessary personal information. We will agree on processing purpose, period, method, information types, protection measures, and responsibilities, and supervise processing as agreed.'''),
    LegalDocumentBlock(
        r'''Third-party SDKs, components, or partner list: if the current version uses third-party SDKs, open-source components, or partners for audio/video calls, image/video/file selection, location capabilities, QR-code recognition, local notifications, crash diagnostics, content safety, verification codes, cloud storage, or similar capabilities, we will list their names, purposes, processing methods, information types, official websites, or privacy-policy links in this Policy, in-app pages, official website, or listing materials as required by app stores and regulators. You may also request the current sharing or entrusted-processing list through the contact methods in this Policy.'''),
    LegalDocumentBlock(
        r'''Sharing: except as described in this Policy, chosen by you, or required by law, we do not share personal information with third parties. When sharing is necessary, we follow the minimum-necessary principle, obtain consent or separate consent where required, and require the recipient to protect confidentiality and security.'''),
    LegalDocumentBlock(
        r'''Enterprise-space and customer-service scenarios: when you join an enterprise space, receive online customer service, or handle conversations as a service agent, the relevant enterprise, support team, or your organization may access information related to that space or service according to business permissions.'''),
    LegalDocumentBlock(
        r'''Transfer: in a merger, division, acquisition, asset transfer, bankruptcy liquidation, or similar transaction involving personal information, we will require the new holder to continue complying with this Policy; otherwise, it must obtain your consent again.'''),
    LegalDocumentBlock(
        r'''Public disclosure: we generally do not publicly disclose personal information. If disclosure is necessary, it will be conducted in compliance with laws and after obtaining your separate consent, except where law, judicial, or administrative authorities require otherwise.'''),
    LegalDocumentBlock(r'''7. Exceptions to Consent'''),
    LegalDocumentBlock(
        r'''Under laws and regulations, processing may not require separate consent where it is necessary for entering into or performing a contract to which you are a party; necessary for statutory duties or obligations; necessary for public-health emergencies or to protect life, health, and property in emergencies; reasonably processing information disclosed by you or otherwise lawfully disclosed; reasonably processing for public-interest news reporting or public-opinion supervision; or other circumstances provided by law.'''),
    LegalDocumentBlock(r'''8. Sensitive Personal Information'''),
    LegalDocumentBlock(
        r'''During use of Weijie, precise location, audio/video-call content, voice, images, videos, files, minors' information, account passwords, and verification information may constitute sensitive personal information.'''),
    LegalDocumentBlock(
        r'''We process sensitive personal information only when necessary for specific features, account security, legal obligations, or dispute handling, and will notify you through permission prompts, feature explanations, separate consent, or other reasonable methods. Refusal may make the corresponding feature unavailable but does not affect features that do not rely on that information.'''),
    LegalDocumentBlock(
        r'''For sensitive permissions such as precise location, microphone, camera, photos/media, files, and audio/video calls, we try to request permission only when you actively trigger the relevant feature and explain the purpose. You may withdraw authorization through system permission management.'''),
    LegalDocumentBlock(r'''9. Storage Location and Retention Period'''),
    LegalDocumentBlock(
        r'''Personal information collected and generated in the People's Republic of China is generally stored within China. If cross-border provision is needed for business reasons, we will complete security assessment, certification, contractual measures, or other compliance measures as required by law, notify you, and obtain separate consent where required.'''),
    LegalDocumentBlock(
        r'''We retain personal information only for the shortest period necessary to achieve the processing purpose. Account information is usually retained until account deletion or a necessary period after service termination; messages and media are retained according to user use, synchronization, backup, and legal requirements; logs and security records are retained according to security, audit, dispute, and legal requirements. After the necessary period, we delete or anonymize the information.'''),
    LegalDocumentBlock(
        r'''After you submit account deletion and the 7-day cooling-off period ends, we delete or anonymize personal information directly associated with the account. Security, audit, complaint, dispute, or regulatory records required by law or necessity will be retained only for the necessary period with access and use restricted.'''),
    LegalDocumentBlock(
        r'''For backup, disaster-recovery, and log-archive copies, we process personal information through periodic overwrite, deletion upon expiry, anonymization, or access restriction while maintaining system security and business continuity. Backup information is not used as daily business data before restoration.'''),
    LegalDocumentBlock(r'''10. Your Rights'''),
    LegalDocumentBlock(
        r'''Access and copy: you may view profiles, account information, friends/groups, settings, message records, and some service records in the app. For information that cannot be accessed by yourself, you may contact us.'''),
    LegalDocumentBlock(
        r'''Correction and supplement: when personal information is inaccurate or incomplete, you may modify it in profile, account settings, or related features, or contact us for assistance.'''),
    LegalDocumentBlock(
        r'''Deletion: you may request deletion in circumstances provided by law, including where the processing purpose has been achieved or cannot be achieved, we stop providing services, retention expires, you withdraw consent, or we process information in violation of law or agreement.'''),
    LegalDocumentBlock(
        r'''Withdrawal and permissions: you may withdraw part of authorization through system permissions, app settings, notification settings, privacy settings, or by contacting us. After withdrawal, we will no longer process the corresponding information, but prior processing remains valid.'''),
    LegalDocumentBlock(
        r'''Account deletion and account-data deletion: mobile path is Settings - Account and Security - Delete Account; desktop path is Account Security - Delete Account. On platforms such as Google Play that require an external account-deletion entry, we will provide a publicly accessible deletion-request web page in app-store developer information or on the official website and fill in that URL in listing materials. The contact email is for cases where you cannot log in, cannot access the deletion entry, or need manual assistance.'''),
    LegalDocumentBlock(
        r'''Explanation, complaint, and report: you may request an explanation of personal-information processing rules and complain or report personal-information issues. After verifying identity, we will respond as soon as possible, generally within 15 working days.'''),
    LegalDocumentBlock(
        r'''If your request involves copying or transferring personal information, deleting an account, deleting large amounts of data, or affecting others' rights, we may require additional identity verification or request details to protect account and data security.'''),
    LegalDocumentBlock(
        r'''We may be unable to respond where the request is directly related to national security, public security, criminal investigation, administrative law enforcement, judicial proceedings, or major public interests; there is sufficient evidence of malicious or abusive requests; response would seriously harm lawful rights of you, others, or organizations; trade secrets are involved; or laws provide otherwise.'''),
    LegalDocumentBlock(r'''11. Minors' Personal Information'''),
    LegalDocumentBlock(
        r'''Weijie is not actively directed to children under 14. Minors under 18 should use Weijie with the consent and guidance of parents or other guardians.'''),
    LegalDocumentBlock(
        r'''If we find that a child under 14 uses Weijie or provides personal information without guardian consent, we will lawfully delete, restrict, delete the account, or take other measures. Guardians may contact us to handle children's personal information.'''),
    LegalDocumentBlock(
        r'''Requests by guardians to access, correct, delete minors' personal information, or delete related accounts will be handled after we verify guardianship and account ownership.'''),
    LegalDocumentBlock(r'''12. Information Security'''),
    LegalDocumentBlock(
        r'''We take industry-standard security measures such as HTTPS/TLS encrypted transmission, access control, permission isolation, identity verification, log audit, data backup, encryption or desensitization of sensitive information, security monitoring, and emergency response.'''),
    LegalDocumentBlock(
        r'''Please keep your account, password, verification code, and device secure. The internet is not absolutely secure. If a personal-information security incident occurs, we will notify you as required by law of the incident, impact, handling measures, risk suggestions, and remedial measures.'''),
    LegalDocumentBlock(
        r'''We apply necessary permission control, confidentiality obligations, and security audits to employees, entrusted processors, and partners to prevent unauthorized access, disclosure, alteration, loss, or misuse of personal information.'''),
    LegalDocumentBlock(r'''13. Policy Updates'''),
    LegalDocumentBlock(
        r'''We may update this Policy due to laws, regulations, regulatory requirements, product features, business models, processing purposes, processing methods, sharing recipients, or contact-method changes.'''),
    LegalDocumentBlock(
        r'''For material changes, we will notify you through in-app pop-up, announcement, push notification, message, or another reasonable method. We will not reduce your rights under this Policy without your express consent. Where renewed or separate consent is required by law, we will handle it accordingly.'''),
    LegalDocumentBlock(r'''14. Contact Us'''),
    LegalDocumentBlock(
        r'''If you have questions, comments, or requests about this Policy, personal-information protection, account deletion, data deletion, permission use, complaints/reports, third-party sharing list, children's information protection, or app-store data-safety statements, contact us. After verifying your identity, we will respond promptly, generally within 15 working days.'''),
    LegalDocumentBlock(r'''Company: Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(r'''Email: postmaster@startlig.com'''),
    LegalDocumentBlock(r'''Phone: 17570846793'''),
    LegalDocumentBlock(r'''Unified Social Credit Code: 91430100MAE5UXKE2R'''),
    LegalDocumentBlock(
        r'''Address: No. 46, Zhantang Group, Zhongping Village, Daiyingling Town, Zhengxiang District, Hengyang, Hunan, China.'''),
  ],
);

const termsLegalDocumentEn = LegalDocumentData(
  appBarTitle: 'Terms of Service',
  blocks: [
    LegalDocumentBlock(r'''Weijie Terms of Service'''),
    LegalDocumentBlock(r'''Last updated: July 1, 2026'''),
    LegalDocumentBlock(r'''Effective date: July 1, 2026'''),
    LegalDocumentBlock(
        r'''Welcome to Weijie software and related services. These Terms are entered into between you and Hunan Hongsi Technology Co., Ltd. Please read them carefully before registration, login, or use, especially the clauses on service rules, user content, account deletion, liability limits, minors, and dispute resolution. By tapping Agree, registering, logging in, or continuing to use the service, you confirm that you have read, understood, and accepted these Terms.'''),
    LegalDocumentBlock(r'''1. Service Scope'''),
    LegalDocumentBlock(
        r'''Weijie is an instant messaging and customer-service collaboration tool for individuals, enterprises, and support teams. Current features include account registration and login, friends and groups, in-app contacts, text, voice, image, video, and file messages, audio/video calls, location message display, QR-code scanning, favorites, scheduled messages, notifications, enterprise spaces, online customer-service workspace, customer profiles, quick replies, announcements/broadcasts, settings, and feedback.'''),
    LegalDocumentBlock(
        r'''Weijie supports mobile clients (iOS and Android) and desktop clients. Available features, permission prompts, and display methods may differ by client, operating-system version, account role, or enterprise-space configuration. A feature not displayed or enabled on one client does not mean that we have promised to provide it on that client.'''),
    LegalDocumentBlock(
        r'''We may optimize, change, suspend, restrict, or terminate part of the services for maintenance, upgrades, security, legal requirements, or business adjustments. For material changes affecting your important rights, we will notify you by in-app announcement, pop-up, message, push notification, or another reasonable method.'''),
    LegalDocumentBlock(
        r'''These Terms and the Privacy Policy will be provided in registration, login, settings, about, or other easy-to-access locations. Important matters such as personal-information processing, sensitive permissions, account deletion, and minors protection will be highlighted. Where separate consent is required by law, we will obtain it separately.'''),
    LegalDocumentBlock(r'''2. Account Registration, Login, and Security'''),
    LegalDocumentBlock(
        r'''You may register or log in through mobile number, email, Weijie ID, verification code, password, or other supported methods. You must provide true, accurate, complete, and valid information and keep it updated.'''),
    LegalDocumentBlock(
        r'''You are responsible for keeping your account, password, verification code, device, and login credentials secure. Losses caused by your disclosure, poor custody, weak password, login in unofficial environments, or third-party fraud are borne by you, while we will handle security incidents as required by law.'''),
    LegalDocumentBlock(
        r'''You must not sell, rent, lend, transfer, or share your account, impersonate others, or damage the account system through automation, batch registration, credential stuffing, malicious verification, or similar methods.'''),
    LegalDocumentBlock(
        r'''If we find abnormal login, account theft, illegal use, infringement of others' rights, or platform-security risk, we may take reasonable measures including security verification, login restriction, function restriction, freezing, cancellation, or account deletion.'''),
    LegalDocumentBlock(r'''3. Account Deletion and Data Deletion'''),
    LegalDocumentBlock(
        r'''You may request account deletion in the mobile client through Settings - Account and Security - Delete Account, or in the desktop client through Account Security - Delete Account. These in-app entries are the primary deletion channels. The contact methods at the end of these Terms are fallback channels only when you cannot log in, cannot access the in-app entry, or need manual assistance.'''),
    LegalDocumentBlock(
        r'''To protect account security, we may require identity verification, security-status checks, verification-code confirmation, or risk confirmation before deletion. The current process includes a 7-day cooling-off period. During the cooling-off period, you may log in again as instructed and cancel the deletion request. After the period ends, the account will enter deletion or anonymization according to the rules.'''),
    LegalDocumentBlock(
        r'''After account deletion, personal profiles, login credentials, friend relationships, enterprise-space relationships, device login status, and other information directly associated with the account will be deleted or anonymized. Audit, security, complaint, dispute, log, or other records that must be retained by law or necessity will be kept only for compliance, security, dispute handling, or legal obligations.'''),
    LegalDocumentBlock(
        r'''For personal information processed by entrusted processors and directly associated with the account, we will notify or require them to delete, anonymize, or stop processing as required by contract and law. Copies generated by backup, log archive, or disaster-recovery mechanisms will be overwritten, deleted, or anonymized within a reasonable cycle, with access and use restricted during that period.'''),
    LegalDocumentBlock(r'''4. User Content and Communication Rules'''),
    LegalDocumentBlock(
        r'''You are responsible for text, images, voice, videos, files, avatars, nicknames, signatures, group announcements, customer-service communications, feedback, complaints, and other content you send, upload, share, or save through Weijie. You must ensure that the content source is lawful and does not infringe portrait rights, reputation rights, privacy, intellectual property, trade secrets, or other lawful rights.'''),
    LegalDocumentBlock(
        r'''You must not use Weijie to create, copy, publish, transmit, or store illegal, harmful, infringing, fraudulent, harassing, spam-marketing, obscene, violent, terrorist, gambling, scam, minor-harming, malicious-traffic, malware, false-information, network-security-risk, public-order-harming, or immoral content.'''),
    LegalDocumentBlock(
        r'''For communications and customer service, we will provide necessary complaint, report, block, blacklist, risk-identification, and handling mechanisms. You may handle inappropriate content or users through in-app complaint, report, block, deletion, leaving a group, or contacting customer service.'''),
    LegalDocumentBlock(
        r'''To comply with laws, platform governance, complaint handling, security risk control, and rights protection, we may lawfully take measures against suspected illegal, non-compliant, or infringing content, including reminders, distribution restriction, account-function restriction, suspension or termination of service, evidence preservation, and reporting to competent authorities.'''),
    LegalDocumentBlock(r'''5. Customer Service and Enterprise Spaces'''),
    LegalDocumentBlock(
        r'''If you use enterprise spaces or online customer-service features as an enterprise member, service agent, customer, or visitor, you understand that the relevant enterprise, support team, or your organization may view, assign, and process business-related conversations, customer profiles, service records, quick replies, announcements/broadcasts, and collaboration information according to its permissions.'''),
    LegalDocumentBlock(
        r'''Enterprises or organizations must comply with applicable laws and their own notice, authorization, and management rules when managing employees, service agents, customer profiles, and business data. We provide technical services according to platform rules and service contracts.'''),
    LegalDocumentBlock(
        r'''If you use Weijie on behalf of an enterprise or organization, you must ensure that you are authorized to upload, process, or authorize us to process information relating to that enterprise, organization, customers, or employees, and that necessary notices and authorizations have been completed under applicable law.'''),
    LegalDocumentBlock(r'''6. Privacy and Permissions'''),
    LegalDocumentBlock(
        r'''We value personal-information protection. Please read the Weijie Privacy Policy to understand how we collect, use, store, share, and protect your personal information, and how you may exercise rights such as access, correction, deletion, withdrawal of authorization, and account deletion.'''),
    LegalDocumentBlock(
        r'''Weijie may request system permissions such as camera, microphone, photos/media, files, location, notifications, network, storage, QR-code scanning, and badges according to the specific feature. We usually request permissions when you trigger the relevant feature and do not require unnecessary permissions for features you do not use.'''),
    LegalDocumentBlock(
        r'''You may refuse or disable non-essential permissions. Refusal affects only the corresponding feature and does not affect other features that do not rely on that permission. We will not refuse basic services merely because you decline non-essential permissions unrelated to the current feature, and we do not sell personal information to any third party.'''),
    LegalDocumentBlock(
        r'''Precise location, audio/video-call content, voice, images, videos, files, minors' information, account passwords, and verification information may constitute sensitive personal information. We process them only when necessary for specific features, security, dispute handling, or legal obligations, and we will provide prompts or obtain separate consent where appropriate.'''),
    LegalDocumentBlock(
        r'''7. Software Use Restrictions and Intellectual Property'''),
    LegalDocumentBlock(
        r'''Without our written permission, you must not reverse engineer, decompile, disassemble, crack, tamper with, bypass security measures, remove rights notices, copy for commercial use, or otherwise infringe Weijie software rights.'''),
    LegalDocumentBlock(
        r'''You must not use plug-ins, add-ons, crawlers, emulator batch scripts, automation programs, packet tampering, batch export, or similar methods to interfere with Weijie, obtain unauthorized data, or affect other users' experience.'''),
    LegalDocumentBlock(
        r'''The software, code, interface, icons, trademarks, logos, product names, text, images, audio/video, interaction design, technical architecture, and related materials of Weijie belong to Hunan Hongsi Technology Co., Ltd. or relevant rights holders. Your original content remains yours, but you grant us the necessary rights to store, transmit, display, convert, compress, cache, and technically process it for service delivery, synchronization, backup, complaint handling, security, and optimization.'''),
    LegalDocumentBlock(r'''8. Minors Protection'''),
    LegalDocumentBlock(
        r'''Weijie is not actively directed to children under 14. Minors under 18 should use Weijie with the consent and guidance of parents or other guardians. Guardians should pay attention to minors' safety when using networking, communication, social, and customer-service functions.'''),
    LegalDocumentBlock(
        r'''If we find that a minor's use does not comply with laws, platform rules, or guardian requirements, we may lawfully restrict functions, delete information, delete the account, or take other protective measures. Guardians may contact us through the methods at the end of these Terms.'''),
    LegalDocumentBlock(r'''9. Service Risks and Liability'''),
    LegalDocumentBlock(
        r'''Internet services may be affected by network failures, carrier lines, system maintenance, device compatibility, malicious attacks, force majeure, or changes in law and policy. We will make reasonable efforts to maintain continuity and security, but we do not promise that the service will never be interrupted or error-free.'''),
    LegalDocumentBlock(
        r'''You should judge the authenticity, legality, and security of information, files, links, QR codes, contact profiles, and customer-service suggestions received or sent through Weijie. These Terms do not exclude or limit liabilities that cannot be excluded or limited by law.'''),
    LegalDocumentBlock(
        r'''10. Changes, Law, Dispute Resolution, and Contact'''),
    LegalDocumentBlock(
        r'''We may revise these Terms according to laws, regulatory requirements, product features, business models, or security needs. If you disagree with revised Terms, you may stop using Weijie or request account deletion. Continued use means acceptance, except where the law requires renewed or separate consent.'''),
    LegalDocumentBlock(
        r'''The formation, performance, interpretation, and dispute resolution of these Terms are governed by the laws of the People's Republic of China. Disputes should first be resolved through friendly negotiation; if negotiation fails, either party may file a lawsuit with a competent people's court at the domicile of Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(
        r'''Contact: postmaster@startlig.com; phone: 17570846793; company: Hunan Hongsi Technology Co., Ltd.; Unified Social Credit Code: 91430100MAE5UXKE2R; address: No. 46, Zhantang Group, Zhongping Village, Daiyingling Town, Zhengxiang District, Hengyang, Hunan, China.'''),
  ],
);

const privacyLegalDocumentEn = LegalDocumentData(
  appBarTitle: 'Privacy Policy',
  blocks: [
    LegalDocumentBlock(
        r'''Weijie Personal Information Protection Policy (Privacy Policy)'''),
    LegalDocumentBlock(r'''Last updated: July 1, 2026'''),
    LegalDocumentBlock(r'''Effective date: July 1, 2026'''),
    LegalDocumentBlock(
        r'''Hunan Hongsi Technology Co., Ltd. is the operator of Weijie software and related services. We understand the importance of personal information and process it under the principles of lawfulness, legitimacy, necessity, good faith, purpose limitation, openness, transparency, minimum necessity, security, and user control.'''),
    LegalDocumentBlock(
        r'''Please read this Policy carefully before registration, login, or use. We provide this Policy in the app and, where required by app stores or listing platforms, through a public privacy-policy link. By tapping Agree, registering, logging in, or continuing to use Weijie, you confirm that you have read and agreed to this Policy. Where separate or express consent is required by law, we will obtain it separately.'''),
    LegalDocumentBlock(r'''1. Scope'''),
    LegalDocumentBlock(
        r'''This Policy applies to Weijie mobile clients (iOS and Android), desktop clients, and Weijie services provided through APIs, customer service, enterprise spaces, or other forms.'''),
    LegalDocumentBlock(
        r'''This Policy does not apply to products or services independently provided by third parties. When you access third-party links, pages, or capabilities through Weijie, please read their privacy policies as well.'''),
    LegalDocumentBlock(
        r'''Personal information means information recorded electronically or otherwise that relates to an identified or identifiable natural person, excluding anonymized information. Sensitive personal information means information that, once leaked or illegally used, may easily harm personal dignity or personal/property safety.'''),
    LegalDocumentBlock(r'''2. Information We Collect'''),
    LegalDocumentBlock(
        r'''Account registration and login information: mobile number, email, Weijie ID, login name, password or password digest, verification code, avatar, nickname, gender, birthday, location shown in profile, signature, login status, account status, deletion status, and device login records, for account creation, authentication, recovery, security, and multi-client synchronization.'''),
    LegalDocumentBlock(
        r'''In-app contacts and relationship information: avatar, nickname, remarks, tags, friend relationships, blacklist, group information, group nickname, group announcements, member identity, enterprise spaces, roles and permissions, and customer-service ownership, for friends, groups, enterprise collaboration, and customer service. Weijie currently does not request system contacts permission.'''),
    LegalDocumentBlock(
        r'''Communication and interaction information: text, images, voice, videos, files, location-message content, business cards, emojis, message time, sending status, read status, recall/retry records, conversation IDs, group IDs, customer-service conversations, service records, and complaint materials, for message transmission, synchronization, display, history, service handling, disputes, and security risk control.'''),
    LegalDocumentBlock(
        r'''Media, files, and photo-library information: when you choose an avatar, send images, videos, or files, take photos or videos, save images, generate thumbnails, or open files, we process the photos, media files, file names, file sizes, file types, thumbnails, upload/download status, and other information you select or authorize. We do not read your entire photo library or files without authorization or necessity.'''),
    LegalDocumentBlock(
        r'''Camera, microphone, and QR-code scanning information: after authorization, we call camera, microphone, and scanning capabilities for avatar shooting, sending captured content, voice recording, audio/video calls, and QR-code friend, group, or enterprise joining.'''),
    LegalDocumentBlock(
        r'''Location information: when you actively use available location-related features, we may obtain approximate or precise location after your authorization. Location is sensitive personal information. Refusal affects only location-related features and not basic communication.'''),
    LegalDocumentBlock(
        r'''Notification, device, and network information: notification authorization status, local notification content, device registration ID, device model, operating-system version, app version, network type, IP address, device language, time zone, crash logs, performance logs, diagnostic logs, API error codes, and connection status, for message alerts, badges, call prompts, security, and stable operation.'''),
    LegalDocumentBlock(
        r'''Local storage information: access tokens, refresh tokens, user settings, conversation caches, message caches, media caches, diagnostic caches, and similar necessary local data to maintain login status, drafts, settings, previews, and offline experience.'''),
    LegalDocumentBlock(
        r'''Feedback, support, and dispute information: issue descriptions, contact methods, screenshots, logs, account information, device information, communications, and handling results you submit through feedback, complaints, support email, phone, or other channels.'''),
    LegalDocumentBlock(
        r'''We will not refuse basic communication services merely because you decline non-essential personal information or permissions unrelated to the current feature. If information is necessary for a feature you actively use, refusal may make that feature unavailable.'''),
    LegalDocumentBlock(r'''3. System Permissions'''),
    LegalDocumentBlock(
        r'''Camera: used for avatar shooting, taking and sending images/videos, QR-code scanning, and video collection for audio/video calls.'''),
    LegalDocumentBlock(
        r'''Microphone: used for voice messages, voice input, audio/video calls, and audio recording during video capture.'''),
    LegalDocumentBlock(
        r'''Photos/media/files: used for choosing avatars, selecting and sending images, videos, audio, or files, saving images, or reading files you actively select.'''),
    LegalDocumentBlock(
        r'''Location: used only for available location-related features you actively use. We do not refuse basic communication because you decline location permission.'''),
    LegalDocumentBlock(
        r'''Notifications, badges, and vibration: used for new messages, customer-service conversations, calls, system reminders, unread badges, and vibration alerts. You may disable them in system or app settings.'''),
    LegalDocumentBlock(
        r'''Network and network status: used for connecting to servers, sending messages, uploading/downloading media, real-time connections, detecting network status, and improving weak-network experience.'''),
    LegalDocumentBlock(
        r'''Storage on Android 12 and earlier or specific system scenarios: used to read or save images, videos, audio, and files you actively select. On Android 13 and later, permissions are requested by media type where applicable.'''),
    LegalDocumentBlock(
        r'''Background refresh or processing: used for necessary login-state maintenance, message synchronization, notification registration, cache cleanup, or tasks allowed by the operating system. We do not collect unrelated sensitive information in the background.'''),
    LegalDocumentBlock(
        r'''Permissions are usually requested when you trigger the relevant feature. You may manage or withdraw permissions in system settings. Withdrawal does not affect processing already performed based on prior authorization, but the corresponding feature may become unavailable.'''),
    LegalDocumentBlock(r'''4. How We Use Personal Information'''),
    LegalDocumentBlock(
        r'''We use personal information to provide, maintain, and implement current Weijie features, including registration/login, account security, message sending and synchronization, friends and groups, audio/video calls, file transfer, enterprise spaces, online customer service, notifications, profile display, complaints/reports, and support.'''),
    LegalDocumentBlock(
        r'''We use information to protect account, service, and communication security, including identity verification, login risk control, anomaly detection, anti-fraud, anti-spam, anti-harassment, anti-attack, anti-malicious registration, API security, content safety, and dispute evidence retention.'''),
    LegalDocumentBlock(
        r'''We use information to improve product and service quality, including troubleshooting, performance analysis, compatibility optimization, weak-network optimization, crash fixing, support response, and user-experience improvement. We try to use de-identified or anonymized data for statistics and analysis.'''),
    LegalDocumentBlock(
        r'''We use information to comply with laws, regulatory requirements, judicial or administrative requests, and to handle complaints, reports, disputes, audits, security incidents, and protection of lawful rights of users, us, or the public.'''),
    LegalDocumentBlock(
        r'''We do not sell personal information and do not use it for purposes unrelated to current Weijie services without your consent.'''),
    LegalDocumentBlock(r'''5. Local Cache and Similar Technologies'''),
    LegalDocumentBlock(
        r'''We may use tokens, local caches, databases, log identifiers, device registration IDs, or similar technologies to keep login status, remember settings, protect security, analyze service quality, cache messages, and improve access experience.'''),
    LegalDocumentBlock(
        r'''Mobile and desktop clients use operating-system capabilities and project dependencies for camera/photo/file selection, QR-code scanning, available location-related capabilities, audio/video calls, notifications, badges, local storage, network connections, and crash diagnostics. We call these capabilities only as necessary for the corresponding feature.'''),
    LegalDocumentBlock(
        r'''You may manage part of local information through system settings, app settings, cache cleanup, logout, local-data deletion, or account deletion. Some necessary caches and logs may be retained for account security, message synchronization, and troubleshooting within a reasonable period.'''),
    LegalDocumentBlock(
        r'''6. Entrusted Processing, Sharing, Transfer, and Disclosure'''),
    LegalDocumentBlock(
        r'''Entrusted processing: to provide server hosting, cloud storage, content safety, message notifications, audio/video calls, available location-related capabilities, customer support, data security, verification codes, and log diagnostics, we may entrust partners to process necessary personal information. We will agree on processing purpose, period, method, information types, protection measures, and responsibilities, and supervise processing as agreed.'''),
    LegalDocumentBlock(
        r'''Third-party SDKs, components, or partner list: if the current version uses third-party SDKs, open-source components, or partners for audio/video calls, image/video/file selection, location capabilities, QR-code recognition, local notifications, crash diagnostics, content safety, verification codes, cloud storage, or similar capabilities, we will list their names, purposes, processing methods, information types, official websites, or privacy-policy links in this Policy, in-app pages, official website, or listing materials as required by app stores and regulators. You may also request the current sharing or entrusted-processing list through the contact methods in this Policy.'''),
    LegalDocumentBlock(
        r'''Sharing: except as described in this Policy, chosen by you, or required by law, we do not share personal information with third parties. When sharing is necessary, we follow the minimum-necessary principle, obtain consent or separate consent where required, and require the recipient to protect confidentiality and security.'''),
    LegalDocumentBlock(
        r'''Enterprise-space and customer-service scenarios: when you join an enterprise space, receive online customer service, or handle conversations as a service agent, the relevant enterprise, support team, or your organization may access information related to that space or service according to business permissions.'''),
    LegalDocumentBlock(
        r'''Transfer: in a merger, division, acquisition, asset transfer, bankruptcy liquidation, or similar transaction involving personal information, we will require the new holder to continue complying with this Policy; otherwise, it must obtain your consent again.'''),
    LegalDocumentBlock(
        r'''Public disclosure: we generally do not publicly disclose personal information. If disclosure is necessary, it will be conducted in compliance with laws and after obtaining your separate consent, except where law, judicial, or administrative authorities require otherwise.'''),
    LegalDocumentBlock(r'''7. Exceptions to Consent'''),
    LegalDocumentBlock(
        r'''Under laws and regulations, processing may not require separate consent where it is necessary for entering into or performing a contract to which you are a party; necessary for statutory duties or obligations; necessary for public-health emergencies or to protect life, health, and property in emergencies; reasonably processing information disclosed by you or otherwise lawfully disclosed; reasonably processing for public-interest news reporting or public-opinion supervision; or other circumstances provided by law.'''),
    LegalDocumentBlock(r'''8. Sensitive Personal Information'''),
    LegalDocumentBlock(
        r'''During use of Weijie, precise location, audio/video-call content, voice, images, videos, files, minors' information, account passwords, and verification information may constitute sensitive personal information.'''),
    LegalDocumentBlock(
        r'''We process sensitive personal information only when necessary for specific features, account security, legal obligations, or dispute handling, and will notify you through permission prompts, feature explanations, separate consent, or other reasonable methods. Refusal may make the corresponding feature unavailable but does not affect features that do not rely on that information.'''),
    LegalDocumentBlock(
        r'''For sensitive permissions such as precise location, microphone, camera, photos/media, files, and audio/video calls, we try to request permission only when you actively trigger the relevant feature and explain the purpose. You may withdraw authorization through system permission management.'''),
    LegalDocumentBlock(r'''9. Storage Location and Retention Period'''),
    LegalDocumentBlock(
        r'''Personal information collected and generated in the People's Republic of China is generally stored within China. If cross-border provision is needed for business reasons, we will complete security assessment, certification, contractual measures, or other compliance measures as required by law, notify you, and obtain separate consent where required.'''),
    LegalDocumentBlock(
        r'''We retain personal information only for the shortest period necessary to achieve the processing purpose. Account information is usually retained until account deletion or a necessary period after service termination; messages and media are retained according to user use, synchronization, backup, and legal requirements; logs and security records are retained according to security, audit, dispute, and legal requirements. After the necessary period, we delete or anonymize the information.'''),
    LegalDocumentBlock(
        r'''After you submit account deletion and the 7-day cooling-off period ends, we delete or anonymize personal information directly associated with the account. Security, audit, complaint, dispute, or regulatory records required by law or necessity will be retained only for the necessary period with access and use restricted.'''),
    LegalDocumentBlock(
        r'''For backup, disaster-recovery, and log-archive copies, we process personal information through periodic overwrite, deletion upon expiry, anonymization, or access restriction while maintaining system security and business continuity. Backup information is not used as daily business data before restoration.'''),
    LegalDocumentBlock(r'''10. Your Rights'''),
    LegalDocumentBlock(
        r'''Access and copy: you may view profiles, account information, friends/groups, settings, message records, and some service records in the app. For information that cannot be accessed by yourself, you may contact us.'''),
    LegalDocumentBlock(
        r'''Correction and supplement: when personal information is inaccurate or incomplete, you may modify it in profile, account settings, or related features, or contact us for assistance.'''),
    LegalDocumentBlock(
        r'''Deletion: you may request deletion in circumstances provided by law, including where the processing purpose has been achieved or cannot be achieved, we stop providing services, retention expires, you withdraw consent, or we process information in violation of law or agreement.'''),
    LegalDocumentBlock(
        r'''Withdrawal and permissions: you may withdraw part of authorization through system permissions, app settings, notification settings, privacy settings, or by contacting us. After withdrawal, we will no longer process the corresponding information, but prior processing remains valid.'''),
    LegalDocumentBlock(
        r'''Account deletion and account-data deletion: mobile path is Settings - Account and Security - Delete Account; desktop path is Account Security - Delete Account. On platforms such as Google Play that require an external account-deletion entry, we will provide a publicly accessible deletion-request web page in app-store developer information or on the official website and fill in that URL in listing materials. The contact email is for cases where you cannot log in, cannot access the deletion entry, or need manual assistance.'''),
    LegalDocumentBlock(
        r'''Explanation, complaint, and report: you may request an explanation of personal-information processing rules and complain or report personal-information issues. After verifying identity, we will respond as soon as possible, generally within 15 working days.'''),
    LegalDocumentBlock(
        r'''If your request involves copying or transferring personal information, deleting an account, deleting large amounts of data, or affecting others' rights, we may require additional identity verification or request details to protect account and data security.'''),
    LegalDocumentBlock(
        r'''We may be unable to respond where the request is directly related to national security, public security, criminal investigation, administrative law enforcement, judicial proceedings, or major public interests; there is sufficient evidence of malicious or abusive requests; response would seriously harm lawful rights of you, others, or organizations; trade secrets are involved; or laws provide otherwise.'''),
    LegalDocumentBlock(r'''11. Minors' Personal Information'''),
    LegalDocumentBlock(
        r'''Weijie is not actively directed to children under 14. Minors under 18 should use Weijie with the consent and guidance of parents or other guardians.'''),
    LegalDocumentBlock(
        r'''If we find that a child under 14 uses Weijie or provides personal information without guardian consent, we will lawfully delete, restrict, delete the account, or take other measures. Guardians may contact us to handle children's personal information.'''),
    LegalDocumentBlock(
        r'''Requests by guardians to access, correct, delete minors' personal information, or delete related accounts will be handled after we verify guardianship and account ownership.'''),
    LegalDocumentBlock(r'''12. Information Security'''),
    LegalDocumentBlock(
        r'''We take industry-standard security measures such as HTTPS/TLS encrypted transmission, access control, permission isolation, identity verification, log audit, data backup, encryption or desensitization of sensitive information, security monitoring, and emergency response.'''),
    LegalDocumentBlock(
        r'''Please keep your account, password, verification code, and device secure. The internet is not absolutely secure. If a personal-information security incident occurs, we will notify you as required by law of the incident, impact, handling measures, risk suggestions, and remedial measures.'''),
    LegalDocumentBlock(
        r'''We apply necessary permission control, confidentiality obligations, and security audits to employees, entrusted processors, and partners to prevent unauthorized access, disclosure, alteration, loss, or misuse of personal information.'''),
    LegalDocumentBlock(r'''13. Policy Updates'''),
    LegalDocumentBlock(
        r'''We may update this Policy due to laws, regulations, regulatory requirements, product features, business models, processing purposes, processing methods, sharing recipients, or contact-method changes.'''),
    LegalDocumentBlock(
        r'''For material changes, we will notify you through in-app pop-up, announcement, push notification, message, or another reasonable method. We will not reduce your rights under this Policy without your express consent. Where renewed or separate consent is required by law, we will handle it accordingly.'''),
    LegalDocumentBlock(r'''14. Contact Us'''),
    LegalDocumentBlock(
        r'''If you have questions, comments, or requests about this Policy, personal-information protection, account deletion, data deletion, permission use, complaints/reports, third-party sharing list, children's information protection, or app-store data-safety statements, contact us. After verifying your identity, we will respond promptly, generally within 15 working days.'''),
    LegalDocumentBlock(r'''Company: Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(r'''Email: postmaster@startlig.com'''),
    LegalDocumentBlock(r'''Phone: 17570846793'''),
    LegalDocumentBlock(r'''Unified Social Credit Code: 91430100MAE5UXKE2R'''),
    LegalDocumentBlock(
        r'''Address: No. 46, Zhantang Group, Zhongping Village, Daiyingling Town, Zhengxiang District, Hengyang, Hunan, China.'''),
  ],
);

const termsLegalDocumentJa = LegalDocumentData(
  appBarTitle: '利用規約',
  blocks: [
    LegalDocumentBlock(r'''Weijie利用規約'''),
    LegalDocumentBlock(r'''最終更新日：2026年07月01日'''),
    LegalDocumentBlock(r'''発効日：2026年07月01日'''),
    LegalDocumentBlock(
        r'''Weijie ソフトウェアおよび関連サービスをご利用いただきありがとうございます。本規約は、お客様と運営主体である Hunan Hongsi Technology Co., Ltd. との間で成立します。登録、ログインまたは利用の前に、サービスルール、ユーザーコンテンツ、アカウント削除、責任制限、未成年者保護、紛争解決に関する条項をよくお読みください。同意、登録、ログインまたは継続利用により、本規約を理解し同意したものとみなされます。'''),
    LegalDocumentBlock(r'''1. サービスの範囲'''),
    LegalDocumentBlock(
        r'''Weijie は、個人、企業、カスタマーサポートの協業に向けたインスタントメッセージングおよび顧客対応ツールです。現在の機能には、アカウント登録・ログイン、友だち・グループ、アプリ内連絡先、文字・音声・画像・動画・ファイルメッセージ、音声/ビデオ通話、位置メッセージの表示、QR コードスキャン、お気に入り、予約メッセージ、通知、企業スペース、オンライン客服ワークスペース、顧客情報、クイック返信、告知/一斉配信、設定、フィードバックが含まれます。'''),
    LegalDocumentBlock(
        r'''Weijie は iOS、Android、デスクトップ端末で利用できます。端末、OS バージョン、アカウント権限、企業スペース設定により、利用可能な機能、権限要求、表示方法は異なる場合があります。ある端末で表示または提供されない機能は、その端末で提供を約束したことを意味しません。'''),
    LegalDocumentBlock(
        r'''保守、アップグレード、安全対策、法令対応、事業調整のため、一部機能を変更、中断、制限または終了することがあります。重要な権利に影響する変更は、アプリ内通知、ポップアップ、メッセージ、プッシュ通知など合理的な方法でお知らせします。'''),
    LegalDocumentBlock(r'''2. アカウントと安全管理'''),
    LegalDocumentBlock(
        r'''お客様は、携帯番号、メールアドレス、Weijie ID、認証コード、パスワード、その他当社が対応する方法で登録・ログインできます。提供する情報は真実、正確、完全かつ有効でなければならず、変更があれば速やかに更新してください。'''),
    LegalDocumentBlock(
        r'''アカウント、パスワード、認証コード、端末、ログイン資格情報はお客様自身で適切に管理してください。漏えい、管理不備、弱いパスワード、非公式環境でのログイン、第三者の詐欺により発生した損失はお客様が負担しますが、当社は法令に従い安全事故の対応に協力します。'''),
    LegalDocumentBlock(
        r'''アカウントの売買、貸与、譲渡、共有、他人へのなりすまし、自動化・大量登録・認証情報攻撃・悪意ある認証などによるアカウント体系の破壊は禁止します。異常ログイン、盗用、違法利用、権利侵害または安全リスクがある場合、当社は認証、ログイン制限、機能制限、凍結、削除など合理的措置を講じることができます。'''),
    LegalDocumentBlock(r'''3. アカウント削除とデータ削除'''),
    LegalDocumentBlock(
        r'''モバイル端末では「設定 - アカウントと安全 - アカウント削除」、デスクトップ端末では「アカウント安全 - アカウント削除」から削除申請ができます。これらのアプリ内入口が主要な削除手段です。本規約末尾の連絡先は、ログインできない、入口にアクセスできない、または手動支援が必要な場合の補助手段です。'''),
    LegalDocumentBlock(
        r'''安全保護のため、削除前に本人確認、安全状態確認、認証コード確認、リスク確認を求めることがあります。現在の手続きには 7 日間のクーリング期間があります。期間中は案内に従って再ログインし、削除申請を取り消すことができます。期間終了後、アカウントは規則に従い削除または匿名化されます。'''),
    LegalDocumentBlock(
        r'''削除後、アカウントに直接関連するプロフィール、ログイン資格、友だち関係、企業スペース関係、端末ログイン状態などは削除または匿名化されます。法令上または必要上保存すべき監査、安全、苦情、紛争、ログ記録は、コンプライアンス、安全、紛争処理または法的義務のために限り保存されます。委託処理先には契約と法令に従い削除、匿名化または処理停止を求めます。バックアップ、ログアーカイブ、災害復旧の複製は合理的期間内に上書き、削除または匿名化し、その間アクセスと用途を制限します。'''),
    LegalDocumentBlock(r'''4. ユーザーコンテンツと通信ルール'''),
    LegalDocumentBlock(
        r'''お客様が Weijie を通じて送信、アップロード、共有または保存する文字、画像、音声、動画、ファイル、アバター、ニックネーム、署名、グループ公告、客服会話、フィードバック、苦情などの内容については、お客様が責任を負います。内容の出所が合法であり、肖像権、名誉権、プライバシー、知的財産権、営業秘密その他の権利を侵害しないことを確認してください。'''),
    LegalDocumentBlock(
        r'''違法、有害、権利侵害、詐欺、嫌がらせ、スパムマーケティング、わいせつ、暴力・テロ、賭博・詐欺、未成年者の権利侵害、悪意ある誘導、マルウェア、虚偽情報、ネットワーク安全リスク、公序良俗に反する内容を作成、複製、公開、送信または保存してはなりません。'''),
    LegalDocumentBlock(
        r'''通信および客服サービスについて、当社は必要な苦情、通報、ブロック、ブラックリスト、リスク識別、処理の仕組みを提供します。不適切な内容やユーザーには、アプリ内の苦情、通報、ブロック、削除、グループ退出、客服連絡などで対応できます。'''),
    LegalDocumentBlock(
        r'''法令遵守、プラットフォーム管理、苦情処理、安全リスク管理、権利保護のため、違法・規約違反・権利侵害の疑いがある内容について、当社は注意喚起、配信制限、アカウント機能制限、サービス停止・終了、証拠保全、主管機関への報告などを行うことができます。'''),
    LegalDocumentBlock(r'''5. 企業スペースとオンライン客服'''),
    LegalDocumentBlock(
        r'''企業メンバー、客服担当、顧客または訪問者として企業スペースやオンライン客服機能を利用する場合、関係する企業、客服チームまたは所属組織が、権限に基づき業務関連の会話、顧客情報、サービス記録、クイック返信、告知/一斉配信、協業情報を閲覧、割当、処理することがあります。'''),
    LegalDocumentBlock(
        r'''企業または組織は、従業員、客服担当、顧客情報、業務データを管理する際、適用法令および自ら行った通知、同意、管理ルールを遵守する必要があります。お客様が企業または組織を代表して利用する場合、関連情報をアップロード、処理または当社に処理を委託する権限を有し、必要な通知と同意を完了していることを保証してください。'''),
    LegalDocumentBlock(r'''6. プライバシーと権限'''),
    LegalDocumentBlock(
        r'''当社は個人情報保護を重視します。収集、利用、保存、共有、保護の方法、およびアクセス、訂正、削除、同意撤回、アカウント削除などの権利については、Weijie プライバシーポリシーをご確認ください。'''),
    LegalDocumentBlock(
        r'''Weijie は具体的な機能に応じて、カメラ、マイク、写真/メディア、ファイル、位置情報、通知、ネットワーク、ストレージ、QR コードスキャン、バッジなどのシステム権限を求めることがあります。通常、該当機能を起動した時点で権限を求め、利用していない機能に不要な権限を強制しません。'''),
    LegalDocumentBlock(
        r'''お客様は不要な権限を拒否または無効化できます。拒否しても対応機能にのみ影響し、当該権限に依存しない他の機能には影響しません。当社は現在の機能と無関係な不要権限を拒否したことのみを理由に基本サービスを拒否せず、個人情報を第三者に販売しません。'''),
    LegalDocumentBlock(
        r'''正確な位置情報、音声/ビデオ通話内容、音声、画像、動画、ファイル、未成年者情報、パスワード、認証情報などはセンシティブな個人情報に該当する場合があります。当社は具体的機能、安全確保、紛争処理、法的義務に必要な範囲でのみ処理し、必要に応じて権限ポップアップ、機能説明、個別同意などで提示します。'''),
    LegalDocumentBlock(r'''7. ソフトウェア利用制限と知的財産'''),
    LegalDocumentBlock(
        r'''当社の書面による許可なく、Weijie に対するリバースエンジニアリング、逆コンパイル、逆アセンブル、クラッキング、改ざん、安全措置の回避、権利表示の削除、商用複製などは禁止します。プラグイン、外部ツール、クローラー、自動化プログラム、パケット改ざん、大量エクスポートなどによりサービスを妨害し、非承認データを取得し、他のユーザー体験に影響を与えてはなりません。'''),
    LegalDocumentBlock(
        r'''Weijie のソフトウェア、コード、画面、アイコン、商標、ロゴ、製品名、文言、画像、音声動画、インタラクション設計、技術構成および関連資料の知的財産権は、Hunan Hongsi Technology Co., Ltd. または権利者に帰属します。'''),
    LegalDocumentBlock(
        r'''お客様が権利を有するオリジナルコンテンツの権利はお客様に帰属します。サービス提供、送信、表示、同期、保存、バックアップ、苦情処理、安全管理、最適化に必要な範囲で、当社に保存、送信、表示、形式変換、圧縮、キャッシュおよび必要な技術処理を行う権利を付与します。'''),
    LegalDocumentBlock(r'''8. 未成年者保護'''),
    LegalDocumentBlock(
        r'''Weijie は 14 歳未満の児童を主な対象として提供していません。18 歳未満の未成年者は、親権者またはその他の保護者の同意と指導のもとで利用してください。保護者は、未成年者のネットワーク、通信、ソーシャル、客服サービス利用の安全に注意してください。'''),
    LegalDocumentBlock(
        r'''未成年者の利用が法令、プラットフォームルールまたは保護者の要求に適合しないと判断した場合、当社は機能制限、情報削除、アカウント削除その他の保護措置を講じることができます。'''),
    LegalDocumentBlock(r'''9. サービスリスクと責任'''),
    LegalDocumentBlock(
        r'''インターネットサービスは、通信障害、回線、システム保守、端末互換性、悪意ある攻撃、不可抗力、法令・政策変更の影響を受けることがあります。当社は継続性と安全性の確保に努めますが、サービスが常に中断なく、完全にエラーがないことを保証しません。'''),
    LegalDocumentBlock(
        r'''Weijie で受信または送信する情報、ファイル、リンク、QR コード、連絡先情報、客服提案について、お客様は真実性、合法性、安全性を自ら判断してください。本規約は、法令上排除または制限できない責任を排除または制限するものではありません。'''),
    LegalDocumentBlock(r'''10. 変更、準拠法、紛争解決、連絡先'''),
    LegalDocumentBlock(
        r'''当社は、法令、監督要求、製品機能、事業モデル、安全上の必要に応じて本規約を改定することがあります。改定後の規約に同意しない場合、Weijie の利用を停止するかアカウント削除を申請できます。継続利用した場合、法令上再同意または個別同意が必要な場合を除き、改定後の規約に同意したものとみなされます。'''),
    LegalDocumentBlock(
        r'''本規約の成立、履行、解釈および紛争解決には中華人民共和国法が適用されます。紛争は友好的協議により解決し、協議が成立しない場合、いずれの当事者も Hunan Hongsi Technology Co., Ltd. の住所地を管轄する人民法院に訴訟を提起できます。'''),
    LegalDocumentBlock(
        r'''連絡先：postmaster@startlig.com、電話：17570846793、会社名：Hunan Hongsi Technology Co., Ltd.、統一社会信用コード：91430100MAE5UXKE2R、住所：中国湖南省衡陽市蒸湘区呆鷹嶺鎮中平村湛塘組46号。'''),
  ],
);

const privacyLegalDocumentJa = LegalDocumentData(
  appBarTitle: 'プライバシーポリシー',
  blocks: [
    LegalDocumentBlock(r'''Weijie個人情報保護方針（プライバシーポリシー）'''),
    LegalDocumentBlock(r'''最終更新日：2026年07月01日'''),
    LegalDocumentBlock(r'''発効日：2026年07月01日'''),
    LegalDocumentBlock(
        r'''Hunan Hongsi Technology Co., Ltd. は Weijie ソフトウェアおよび関連サービスの運営者です。当社は個人情報の重要性を理解し、適法、正当、必要、誠実、目的明確、公開透明、最小必要、安全確保、ユーザー制御の原則に従って個人情報を処理します。'''),
    LegalDocumentBlock(
        r'''登録、ログインまたは利用の前に本ポリシーをよくお読みください。当社はアプリ内で本ポリシーを容易に確認できるようにし、アプリストア、公式サイトまたは上架プラットフォームの要求に応じてプライバシーポリシーリンクを提供します。同意、登録、ログインまたは継続利用により、本ポリシーを読んで同意したものとみなされます。法令上、個別同意または明示同意が必要な事項については、別途取得します。'''),
    LegalDocumentBlock(r'''1. 適用範囲'''),
    LegalDocumentBlock(
        r'''本ポリシーは、Weijie の iOS、Android、デスクトップ端末、および API、客服、企業スペースその他の形態で提供される Weijie サービスに適用されます。第三者が独立して提供する製品またはサービスには適用されません。第三者リンク、ページまたは機能を利用する場合は、当該第三者のプライバシーポリシーもご確認ください。'''),
    LegalDocumentBlock(
        r'''本ポリシーにおける個人情報とは、電子的またはその他の方法で記録され、識別済みまたは識別可能な自然人に関する情報をいい、匿名化された情報を含みません。センシティブな個人情報とは、漏えいまたは違法利用により人格尊厳や人身・財産の安全を害するおそれが高い情報をいいます。'''),
    LegalDocumentBlock(r'''2. 収集する情報'''),
    LegalDocumentBlock(
        r'''アカウント登録・ログイン情報：携帯番号、メールアドレス、Weijie ID、ログイン名、パスワードまたはパスワード要約、認証コード、アバター、ニックネーム、性別、誕生日、プロフィール上の所在地、署名、ログイン状態、アカウント状態、削除状態、端末ログイン記録などを、アカウント作成、本人確認、復旧、安全保護、多端末同期のために処理します。'''),
    LegalDocumentBlock(
        r'''アプリ内連絡先と関係情報：アバター、ニックネーム、備考、タグ、友だち関係、ブラックリスト、グループ情報、グループ内ニックネーム、グループ公告、メンバー身份、企業スペース、役割権限、客服帰属関係などを、友だち、グループ、企業協業、客服サービスのために処理します。Weijie は現在、システム連絡先権限を要求しません。'''),
    LegalDocumentBlock(
        r'''通信とインタラクション情報：文字、画像、音声、動画、ファイル、位置メッセージ内容、名刺、絵文字、送信時刻、送信状態、既読状態、取消/再試行記録、会話 ID、グループ ID、客服会話、サービス記録、苦情資料などを、メッセージ送信、同期、表示、履歴、客服処理、紛争処理、安全管理のために処理します。'''),
    LegalDocumentBlock(
        r'''メディア、ファイル、写真情報：アバター選択、画像/動画/ファイル送信、写真または動画撮影、画像保存、サムネイル生成、ファイル閲覧の際、お客様が選択または許可した写真、メディアファイル、ファイル名、サイズ、種類、サムネイル、アップロード/ダウンロード状態などを処理します。許可または必要性なく写真ライブラリやファイル全体を読み取りません。'''),
    LegalDocumentBlock(
        r'''カメラ、マイク、QR コード情報：アバター撮影、撮影内容の送信、音声録音、音声/ビデオ通話、QR コードによる友だち追加、グループ参加、企業参加のため、許可後にカメラ、マイク、スキャン機能を利用します。'''),
    LegalDocumentBlock(
        r'''位置情報：お客様が利用可能な位置関連機能を能動的に使用する場合、許可後に概略位置または正確な位置を取得することがあります。位置情報はセンシティブな個人情報です。拒否しても基本通信機能には影響しません。'''),
    LegalDocumentBlock(
        r'''通知、端末、ネットワーク情報：通知許可状態、ローカル通知内容、端末登録 ID、端末モデル、OS バージョン、アプリバージョン、ネットワーク種別、IP アドレス、言語、タイムゾーン、クラッシュログ、性能ログ、診断ログ、API エラーコード、接続状態などを、メッセージ通知、バッジ、着信提示、安全、安定運用のために処理します。'''),
    LegalDocumentBlock(
        r'''ローカル保存情報：ログイン状態、下書き、設定、プレビュー、オフライン体験のため、アクセストークン、リフレッシュトークン、ユーザー設定、会話キャッシュ、メッセージキャッシュ、メディアキャッシュ、診断キャッシュなど必要な情報を端末内に保存します。'''),
    LegalDocumentBlock(
        r'''フィードバック、客服、紛争情報：ヘルプ、苦情、サポートメール、電話等を通じて提出された問題説明、連絡先、スクリーンショット、ログ、アカウント情報、端末情報、やり取り、処理結果を、本人確認、問題定位、回答、苦情処理、証拠保存のために処理します。'''),
    LegalDocumentBlock(
        r'''現在の機能と無関係な不要な個人情報または権限を拒否したことのみを理由に、基本通信サービスを拒否しません。ただし、お客様が能動的に利用する特定機能に必要な情報を拒否した場合、その機能は利用できないことがあります。'''),
    LegalDocumentBlock(r'''3. システム権限'''),
    LegalDocumentBlock(
        r'''カメラは、アバター撮影、画像/動画の撮影・送信、QR コード識別、音声/ビデオ通話の映像取得に使用します。マイクは、音声メッセージ、音声入力、音声/ビデオ通話、動画撮影時の録音に使用します。写真/メディア/ファイル権限は、アバター選択、画像・動画・音声・ファイルの選択送信、画像保存、選択ファイルの読み取りに使用します。'''),
    LegalDocumentBlock(
        r'''位置権限は、お客様が能動的に使用する利用可能な位置関連機能にのみ使用します。通知、バッジ、振動は、新規メッセージ、客服会話、着信、システム通知、未読バッジ、振動提示に使用します。ネットワークおよびネットワーク状態は、サーバー接続、メッセージ送信、メディアのアップロード/ダウンロード、リアルタイム接続、ネットワーク検知、弱ネットワーク体験改善に使用します。'''),
    LegalDocumentBlock(
        r'''Android 12 以下または特定システム場面のストレージ権限は、お客様が選択した画像、動画、音声、ファイルの読み取りまたは保存に使用します。Android 13 以降では、適用される場合、メディア種別ごとに権限を求めます。バックグラウンド更新/処理は、ログイン維持、メッセージ同期、通知登録、キャッシュ整理など OS が許可する必要な処理に使用し、機能と無関係なセンシティブ情報を収集しません。'''),
    LegalDocumentBlock(
        r'''権限は通常、該当機能を起動した時点で求めます。システム設定で管理または撤回できます。撤回はそれ以前の許可に基づく処理の効力に影響しませんが、対応機能が利用できなくなる場合があります。'''),
    LegalDocumentBlock(r'''4. 利用目的'''),
    LegalDocumentBlock(
        r'''個人情報は、登録・ログイン、アカウント安全、メッセージ送信と同期、友だち・グループ、音声/ビデオ通話、ファイル転送、企業スペース、オンライン客服、通知、プロフィール表示、苦情通報、サポートなど Weijie の現在の機能を提供、維持、実現するために使用します。'''),
    LegalDocumentBlock(
        r'''アカウント、サービス、通信の安全確保のため、本人確認、ログインリスク管理、異常検知、不正防止、スパム防止、嫌がらせ防止、攻撃防止、悪意ある登録防止、API 安全、内容安全、紛争証拠保存に使用します。'''),
    LegalDocumentBlock(
        r'''製品とサービス品質改善のため、障害調査、性能分析、互換性最適化、弱ネットワーク最適化、クラッシュ修正、客服応答、ユーザー体験改善に使用します。統計分析ではできる限り非識別化または匿名化データを使用します。'''),
    LegalDocumentBlock(
        r'''法令、監督要求、司法または行政機関の要求、苦情、通報、紛争、監査、安全事件、ユーザー・当社・公衆の権利保護のために使用します。'''),
    LegalDocumentBlock(
        r'''当社は個人情報を販売せず、お客様の同意なく Weijie の現在のサービスと無関係な目的に使用しません。'''),
    LegalDocumentBlock(r'''5. 委託処理、共有、譲渡、公開'''),
    LegalDocumentBlock(
        r'''サーバーホスティング、クラウドストレージ、内容安全、メッセージ通知、音声/ビデオ通話、利用可能な位置関連機能、客服支援、データ安全、認証コード、ログ診断などのため、必要な個人情報の処理を協力先に委託することがあります。当社は処理目的、期間、方法、情報種類、保護措置、責任を定め、約定に従った処理を監督します。'''),
    LegalDocumentBlock(
        r'''現在のバージョンで第三者 SDK、オープンソースコンポーネントまたは協力先を利用して音声/ビデオ通話、画像/動画/ファイル選択、位置機能、QR コード認識、ローカル通知、クラッシュ診断、内容安全、認証コード、クラウドストレージなどを実現する場合、アプリストアおよび監督要求に従い、名称、目的、処理方法、個人情報種類、公式サイトまたはプライバシーポリシーリンクを、本ポリシー、アプリ内ページ、公式サイトまたは上架資料に掲載します。現在の共有・委託処理リストは本ポリシーの連絡先から請求できます。'''),
    LegalDocumentBlock(
        r'''本ポリシーに記載された場合、お客様が能動的に選択した場合、または法令で要求される場合を除き、個人情報を第三者と共有しません。共有が必要な場合は最小必要原則に従い、必要に応じて同意または個別同意を取得し、受領者に秘密保持と安全保護義務を課します。'''),
    LegalDocumentBlock(
        r'''企業スペースや客服場面では、企業、客服チームまたは所属組織が業務権限に基づき関連情報へアクセスすることがあります。合併、分割、買収、資産譲渡、破産清算等で個人情報が移転される場合、新しい保有者に本ポリシーの遵守を求め、遵守しない場合は改めて同意を取得させます。'''),
    LegalDocumentBlock(
        r'''原則として個人情報を公開しません。公開が必要な場合は、法令に適合し個別同意を得たうえで行います。ただし、法令、司法または行政機関の要求がある場合を除きます。'''),
    LegalDocumentBlock(r'''6. 同意の例外とセンシティブ情報'''),
    LegalDocumentBlock(
        r'''法令により、契約の締結・履行に必要な場合、法定職責または義務の履行に必要な場合、緊急時に生命健康または財産安全を保護するために必要な場合、本人が公開したまたは合法的に公開された情報を合理的範囲で処理する場合、公共利益の報道・世論監督のため合理的範囲で処理する場合、その他法令で定める場合には、別途同意を要しないことがあります。'''),
    LegalDocumentBlock(
        r'''正確な位置情報、音声/ビデオ通話内容、音声、画像、動画、ファイル、未成年者情報、パスワード、認証情報はセンシティブな個人情報に該当する場合があります。当社は特定機能、アカウント安全、法的義務、紛争処理に必要な場合のみ処理し、権限ポップアップ、機能説明、個別同意等でお知らせします。拒否すると対応機能が利用できない場合がありますが、当該情報に依存しない機能には影響しません。'''),
    LegalDocumentBlock(r'''7. 保存場所と期間'''),
    LegalDocumentBlock(
        r'''中華人民共和国国内で収集・生成した個人情報は、原則として中国国内に保存します。事業上、国外提供が必要な場合、法令に従い安全評価、認証、契約措置その他のコンプライアンス措置を行い、通知し、必要に応じて個別同意を取得します。'''),
    LegalDocumentBlock(
        r'''個人情報は処理目的の達成に必要な最短期間のみ保存します。アカウント情報は通常、アカウント削除またはサービス終了後の必要期間まで、メッセージとメディアは利用、同期、バックアップ、法令要求に応じて、ログと安全記録は安全、監査、紛争処理、法令要求に応じて保存します。必要期間を超えた場合、削除または匿名化します。'''),
    LegalDocumentBlock(
        r'''アカウント削除を申請し 7 日間のクーリング期間が終了した後、アカウントに直接関連する個人情報を削除または匿名化します。法令上または必要上保存すべき安全、監査、苦情、紛争、監督記録は必要期間のみ保存し、アクセスと用途を制限します。バックアップ、災害復旧、ログアーカイブ内の情報は、システム安全と継続性を維持しつつ、定期上書き、期限到来削除、匿名化、アクセス制限により処理します。'''),
    LegalDocumentBlock(r'''8. お客様の権利'''),
    LegalDocumentBlock(
        r'''お客様は、アプリ内でプロフィール、アカウント情報、友だち/グループ、設定、メッセージ記録、一部サービス記録を確認できます。自分でアクセスできない情報については、当社に申請できます。情報が不正確または不完全な場合、プロフィール、アカウント設定、関連機能で修正するか、当社に連絡して補助を求めることができます。'''),
    LegalDocumentBlock(
        r'''法令で定める場合、処理目的が達成または達成不能になった、当社がサービス提供を停止した、保存期間が満了した、同意を撤回した、当社が法令または約定に違反して処理したなどの理由により、個人情報の削除を求めることができます。'''),
    LegalDocumentBlock(
        r'''システム権限、アプリ設定、通知設定、プライバシー設定、または当社への連絡により、一部の同意を撤回できます。撤回後、当社は対応する個人情報を処理しませんが、撤回前の処理の効力には影響しません。'''),
    LegalDocumentBlock(
        r'''アカウント削除とデータ削除：モバイル端末では「設定 - アカウントと安全 - アカウント削除」、デスクトップ端末では「アカウント安全 - アカウント削除」です。Google Play などアプリ外削除入口を求めるプラットフォームでは、アプリストア開発者情報または公式サイトに公開アクセス可能な削除申請ページを提供し、上架資料に当該 URL を記入します。連絡メールは、ログイン不可、削除入口アクセス不可、手動支援が必要な場合に使用します。'''),
    LegalDocumentBlock(
        r'''個人情報処理ルールの説明、苦情、通報を求めることができます。当社は本人確認後、できるだけ速やかに、通常 15 営業日以内に回答します。コピー、移転、アカウント削除、大量データ削除、他者権利への影響がある場合、安全のため追加本人確認または説明を求めることがあります。'''),
    LegalDocumentBlock(
        r'''国家安全、公共安全、刑事捜査、行政執法、司法手続、重大公共利益に直接関係する場合、悪意または権利濫用の十分な証拠がある場合、対応によりお客様、他者または組織の権利を重大に害する場合、営業秘密に関係する場合、その他法令で定める場合、請求に応じられないことがあります。'''),
    LegalDocumentBlock(r'''9. 未成年者の個人情報'''),
    LegalDocumentBlock(
        r'''Weijie は 14 歳未満の児童を主な対象として提供していません。18 歳未満の未成年者は、親権者またはその他の保護者の同意と指導のもとで利用してください。14 歳未満の児童が保護者の同意なく利用または個人情報を提供していることを発見した場合、当社は削除、制限、アカウント削除などの措置を講じます。保護者は本ポリシーの連絡先から当社へ連絡できます。'''),
    LegalDocumentBlock(
        r'''保護者が未成年者の個人情報のアクセス、訂正、削除または関連アカウント削除を求める場合、当社は保護者関係とアカウント帰属を確認したうえで法令に従い処理します。'''),
    LegalDocumentBlock(r'''10. 情報安全'''),
    LegalDocumentBlock(
        r'''当社は、HTTPS/TLS 暗号化通信、アクセス制御、権限分離、本人確認、ログ監査、データバックアップ、センシティブ情報の暗号化または脱識別化、安全監視、緊急対応など、業界一般水準の安全措置を講じます。'''),
    LegalDocumentBlock(
        r'''アカウント、パスワード、認証コード、端末を適切に管理し、他人に漏らさないでください。インターネット環境は絶対に安全ではありません。個人情報安全事故が発生した場合、当社は法令に従い事故状況、影響、対応措置、リスク助言、救済措置を通知します。'''),
    LegalDocumentBlock(
        r'''従業員、委託処理先、協力先に対して必要な権限管理、秘密保持義務、安全監査を実施し、個人情報の不正アクセス、開示、改ざん、紛失、濫用を防止します。'''),
    LegalDocumentBlock(r'''11. 更新と連絡先'''),
    LegalDocumentBlock(
        r'''当社は法令、監督要求、製品機能、事業モデル、処理目的、処理方法、共有先、連絡先の変更により本ポリシーを更新することがあります。重要な変更については、アプリ内ポップアップ、公告、プッシュ通知、メッセージその他合理的な方法でお知らせします。法令上、再同意または個別同意が必要な場合は、その要求に従います。'''),
    LegalDocumentBlock(
        r'''本ポリシー、個人情報保護、アカウント削除、データ削除、権限利用、苦情通報、第三者共有リスト、児童個人情報保護、アプリストアのデータ安全表示についてご質問、意見または請求がある場合は、当社にご連絡ください。本人確認後、できるだけ速やかに、通常 15 営業日以内に回答します。'''),
    LegalDocumentBlock(r'''会社名：Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(r'''メール：postmaster@startlig.com'''),
    LegalDocumentBlock(r'''電話：17570846793'''),
    LegalDocumentBlock(r'''統一社会信用コード：91430100MAE5UXKE2R'''),
    LegalDocumentBlock(r'''住所：中国湖南省衡陽市蒸湘区呆鷹嶺鎮中平村湛塘組46号。'''),
  ],
);

const termsLegalDocumentKo = LegalDocumentData(
  appBarTitle: '서비스 이용약관',
  blocks: [
    LegalDocumentBlock(r'''Weijie 서비스 이용약관'''),
    LegalDocumentBlock(r'''최종 업데이트: 2026년 07월 01일'''),
    LegalDocumentBlock(r'''시행일: 2026년 07월 01일'''),
    LegalDocumentBlock(
        r'''Welcome to Weijie software and related services. These Terms are entered into between you and Hunan Hongsi Technology Co., Ltd. Please read them carefully before registration, login, or use, especially the clauses on service rules, user content, account deletion, liability limits, minors, and dispute resolution. By tapping Agree, registering, logging in, or continuing to use the service, you confirm that you have read, understood, and accepted these Terms.'''),
    LegalDocumentBlock(r'''1. Service Scope'''),
    LegalDocumentBlock(
        r'''Weijie is an instant messaging and customer-service collaboration tool for individuals, enterprises, and support teams. Current features include account registration and login, friends and groups, in-app contacts, text, voice, image, video, and file messages, audio/video calls, location message display, QR-code scanning, favorites, scheduled messages, notifications, enterprise spaces, online customer-service workspace, customer profiles, quick replies, announcements/broadcasts, settings, and feedback.'''),
    LegalDocumentBlock(
        r'''Weijie supports mobile clients (iOS and Android) and desktop clients. Available features, permission prompts, and display methods may differ by client, operating-system version, account role, or enterprise-space configuration. A feature not displayed or enabled on one client does not mean that we have promised to provide it on that client.'''),
    LegalDocumentBlock(
        r'''We may optimize, change, suspend, restrict, or terminate part of the services for maintenance, upgrades, security, legal requirements, or business adjustments. For material changes affecting your important rights, we will notify you by in-app announcement, pop-up, message, push notification, or another reasonable method.'''),
    LegalDocumentBlock(
        r'''These Terms and the Privacy Policy will be provided in registration, login, settings, about, or other easy-to-access locations. Important matters such as personal-information processing, sensitive permissions, account deletion, and minors protection will be highlighted. Where separate consent is required by law, we will obtain it separately.'''),
    LegalDocumentBlock(r'''2. Account Registration, Login, and Security'''),
    LegalDocumentBlock(
        r'''You may register or log in through mobile number, email, Weijie ID, verification code, password, or other supported methods. You must provide true, accurate, complete, and valid information and keep it updated.'''),
    LegalDocumentBlock(
        r'''You are responsible for keeping your account, password, verification code, device, and login credentials secure. Losses caused by your disclosure, poor custody, weak password, login in unofficial environments, or third-party fraud are borne by you, while we will handle security incidents as required by law.'''),
    LegalDocumentBlock(
        r'''You must not sell, rent, lend, transfer, or share your account, impersonate others, or damage the account system through automation, batch registration, credential stuffing, malicious verification, or similar methods.'''),
    LegalDocumentBlock(
        r'''If we find abnormal login, account theft, illegal use, infringement of others' rights, or platform-security risk, we may take reasonable measures including security verification, login restriction, function restriction, freezing, cancellation, or account deletion.'''),
    LegalDocumentBlock(r'''3. Account Deletion and Data Deletion'''),
    LegalDocumentBlock(
        r'''You may request account deletion in the mobile client through Settings - Account and Security - Delete Account, or in the desktop client through Account Security - Delete Account. These in-app entries are the primary deletion channels. The contact methods at the end of these Terms are fallback channels only when you cannot log in, cannot access the in-app entry, or need manual assistance.'''),
    LegalDocumentBlock(
        r'''To protect account security, we may require identity verification, security-status checks, verification-code confirmation, or risk confirmation before deletion. The current process includes a 7-day cooling-off period. During the cooling-off period, you may log in again as instructed and cancel the deletion request. After the period ends, the account will enter deletion or anonymization according to the rules.'''),
    LegalDocumentBlock(
        r'''After account deletion, personal profiles, login credentials, friend relationships, enterprise-space relationships, device login status, and other information directly associated with the account will be deleted or anonymized. Audit, security, complaint, dispute, log, or other records that must be retained by law or necessity will be kept only for compliance, security, dispute handling, or legal obligations.'''),
    LegalDocumentBlock(
        r'''For personal information processed by entrusted processors and directly associated with the account, we will notify or require them to delete, anonymize, or stop processing as required by contract and law. Copies generated by backup, log archive, or disaster-recovery mechanisms will be overwritten, deleted, or anonymized within a reasonable cycle, with access and use restricted during that period.'''),
    LegalDocumentBlock(r'''4. User Content and Communication Rules'''),
    LegalDocumentBlock(
        r'''You are responsible for text, images, voice, videos, files, avatars, nicknames, signatures, group announcements, customer-service communications, feedback, complaints, and other content you send, upload, share, or save through Weijie. You must ensure that the content source is lawful and does not infringe portrait rights, reputation rights, privacy, intellectual property, trade secrets, or other lawful rights.'''),
    LegalDocumentBlock(
        r'''You must not use Weijie to create, copy, publish, transmit, or store illegal, harmful, infringing, fraudulent, harassing, spam-marketing, obscene, violent, terrorist, gambling, scam, minor-harming, malicious-traffic, malware, false-information, network-security-risk, public-order-harming, or immoral content.'''),
    LegalDocumentBlock(
        r'''For communications and customer service, we will provide necessary complaint, report, block, blacklist, risk-identification, and handling mechanisms. You may handle inappropriate content or users through in-app complaint, report, block, deletion, leaving a group, or contacting customer service.'''),
    LegalDocumentBlock(
        r'''To comply with laws, platform governance, complaint handling, security risk control, and rights protection, we may lawfully take measures against suspected illegal, non-compliant, or infringing content, including reminders, distribution restriction, account-function restriction, suspension or termination of service, evidence preservation, and reporting to competent authorities.'''),
    LegalDocumentBlock(r'''5. Customer Service and Enterprise Spaces'''),
    LegalDocumentBlock(
        r'''If you use enterprise spaces or online customer-service features as an enterprise member, service agent, customer, or visitor, you understand that the relevant enterprise, support team, or your organization may view, assign, and process business-related conversations, customer profiles, service records, quick replies, announcements/broadcasts, and collaboration information according to its permissions.'''),
    LegalDocumentBlock(
        r'''Enterprises or organizations must comply with applicable laws and their own notice, authorization, and management rules when managing employees, service agents, customer profiles, and business data. We provide technical services according to platform rules and service contracts.'''),
    LegalDocumentBlock(
        r'''If you use Weijie on behalf of an enterprise or organization, you must ensure that you are authorized to upload, process, or authorize us to process information relating to that enterprise, organization, customers, or employees, and that necessary notices and authorizations have been completed under applicable law.'''),
    LegalDocumentBlock(r'''6. Privacy and Permissions'''),
    LegalDocumentBlock(
        r'''We value personal-information protection. Please read the Weijie Privacy Policy to understand how we collect, use, store, share, and protect your personal information, and how you may exercise rights such as access, correction, deletion, withdrawal of authorization, and account deletion.'''),
    LegalDocumentBlock(
        r'''Weijie may request system permissions such as camera, microphone, photos/media, files, location, notifications, network, storage, QR-code scanning, and badges according to the specific feature. We usually request permissions when you trigger the relevant feature and do not require unnecessary permissions for features you do not use.'''),
    LegalDocumentBlock(
        r'''You may refuse or disable non-essential permissions. Refusal affects only the corresponding feature and does not affect other features that do not rely on that permission. We will not refuse basic services merely because you decline non-essential permissions unrelated to the current feature, and we do not sell personal information to any third party.'''),
    LegalDocumentBlock(
        r'''Precise location, audio/video-call content, voice, images, videos, files, minors' information, account passwords, and verification information may constitute sensitive personal information. We process them only when necessary for specific features, security, dispute handling, or legal obligations, and we will provide prompts or obtain separate consent where appropriate.'''),
    LegalDocumentBlock(
        r'''7. Software Use Restrictions and Intellectual Property'''),
    LegalDocumentBlock(
        r'''Without our written permission, you must not reverse engineer, decompile, disassemble, crack, tamper with, bypass security measures, remove rights notices, copy for commercial use, or otherwise infringe Weijie software rights.'''),
    LegalDocumentBlock(
        r'''You must not use plug-ins, add-ons, crawlers, emulator batch scripts, automation programs, packet tampering, batch export, or similar methods to interfere with Weijie, obtain unauthorized data, or affect other users' experience.'''),
    LegalDocumentBlock(
        r'''The software, code, interface, icons, trademarks, logos, product names, text, images, audio/video, interaction design, technical architecture, and related materials of Weijie belong to Hunan Hongsi Technology Co., Ltd. or relevant rights holders. Your original content remains yours, but you grant us the necessary rights to store, transmit, display, convert, compress, cache, and technically process it for service delivery, synchronization, backup, complaint handling, security, and optimization.'''),
    LegalDocumentBlock(r'''8. Minors Protection'''),
    LegalDocumentBlock(
        r'''Weijie is not actively directed to children under 14. Minors under 18 should use Weijie with the consent and guidance of parents or other guardians. Guardians should pay attention to minors' safety when using networking, communication, social, and customer-service functions.'''),
    LegalDocumentBlock(
        r'''If we find that a minor's use does not comply with laws, platform rules, or guardian requirements, we may lawfully restrict functions, delete information, delete the account, or take other protective measures. Guardians may contact us through the methods at the end of these Terms.'''),
    LegalDocumentBlock(r'''9. Service Risks and Liability'''),
    LegalDocumentBlock(
        r'''Internet services may be affected by network failures, carrier lines, system maintenance, device compatibility, malicious attacks, force majeure, or changes in law and policy. We will make reasonable efforts to maintain continuity and security, but we do not promise that the service will never be interrupted or error-free.'''),
    LegalDocumentBlock(
        r'''You should judge the authenticity, legality, and security of information, files, links, QR codes, contact profiles, and customer-service suggestions received or sent through Weijie. These Terms do not exclude or limit liabilities that cannot be excluded or limited by law.'''),
    LegalDocumentBlock(
        r'''10. Changes, Law, Dispute Resolution, and Contact'''),
    LegalDocumentBlock(
        r'''We may revise these Terms according to laws, regulatory requirements, product features, business models, or security needs. If you disagree with revised Terms, you may stop using Weijie or request account deletion. Continued use means acceptance, except where the law requires renewed or separate consent.'''),
    LegalDocumentBlock(
        r'''The formation, performance, interpretation, and dispute resolution of these Terms are governed by the laws of the People's Republic of China. Disputes should first be resolved through friendly negotiation; if negotiation fails, either party may file a lawsuit with a competent people's court at the domicile of Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(
        r'''Contact: postmaster@startlig.com; phone: 17570846793; company: Hunan Hongsi Technology Co., Ltd.; Unified Social Credit Code: 91430100MAE5UXKE2R; address: No. 46, Zhantang Group, Zhongping Village, Daiyingling Town, Zhengxiang District, Hengyang, Hunan, China.'''),
  ],
);

const privacyLegalDocumentKo = LegalDocumentData(
  appBarTitle: '개인정보 처리방침',
  blocks: [
    LegalDocumentBlock(r'''Weijie 개인정보 보호정책(개인정보 처리방침)'''),
    LegalDocumentBlock(r'''최종 업데이트: 2026년 07월 01일'''),
    LegalDocumentBlock(r'''시행일: 2026년 07월 01일'''),
    LegalDocumentBlock(
        r'''Hunan Hongsi Technology Co., Ltd. is the operator of Weijie software and related services. We understand the importance of personal information and process it under the principles of lawfulness, legitimacy, necessity, good faith, purpose limitation, openness, transparency, minimum necessity, security, and user control.'''),
    LegalDocumentBlock(
        r'''Please read this Policy carefully before registration, login, or use. We provide this Policy in the app and, where required by app stores or listing platforms, through a public privacy-policy link. By tapping Agree, registering, logging in, or continuing to use Weijie, you confirm that you have read and agreed to this Policy. Where separate or express consent is required by law, we will obtain it separately.'''),
    LegalDocumentBlock(r'''1. Scope'''),
    LegalDocumentBlock(
        r'''This Policy applies to Weijie mobile clients (iOS and Android), desktop clients, and Weijie services provided through APIs, customer service, enterprise spaces, or other forms.'''),
    LegalDocumentBlock(
        r'''This Policy does not apply to products or services independently provided by third parties. When you access third-party links, pages, or capabilities through Weijie, please read their privacy policies as well.'''),
    LegalDocumentBlock(
        r'''Personal information means information recorded electronically or otherwise that relates to an identified or identifiable natural person, excluding anonymized information. Sensitive personal information means information that, once leaked or illegally used, may easily harm personal dignity or personal/property safety.'''),
    LegalDocumentBlock(r'''2. Information We Collect'''),
    LegalDocumentBlock(
        r'''Account registration and login information: mobile number, email, Weijie ID, login name, password or password digest, verification code, avatar, nickname, gender, birthday, location shown in profile, signature, login status, account status, deletion status, and device login records, for account creation, authentication, recovery, security, and multi-client synchronization.'''),
    LegalDocumentBlock(
        r'''In-app contacts and relationship information: avatar, nickname, remarks, tags, friend relationships, blacklist, group information, group nickname, group announcements, member identity, enterprise spaces, roles and permissions, and customer-service ownership, for friends, groups, enterprise collaboration, and customer service. Weijie currently does not request system contacts permission.'''),
    LegalDocumentBlock(
        r'''Communication and interaction information: text, images, voice, videos, files, location-message content, business cards, emojis, message time, sending status, read status, recall/retry records, conversation IDs, group IDs, customer-service conversations, service records, and complaint materials, for message transmission, synchronization, display, history, service handling, disputes, and security risk control.'''),
    LegalDocumentBlock(
        r'''Media, files, and photo-library information: when you choose an avatar, send images, videos, or files, take photos or videos, save images, generate thumbnails, or open files, we process the photos, media files, file names, file sizes, file types, thumbnails, upload/download status, and other information you select or authorize. We do not read your entire photo library or files without authorization or necessity.'''),
    LegalDocumentBlock(
        r'''Camera, microphone, and QR-code scanning information: after authorization, we call camera, microphone, and scanning capabilities for avatar shooting, sending captured content, voice recording, audio/video calls, and QR-code friend, group, or enterprise joining.'''),
    LegalDocumentBlock(
        r'''Location information: when you actively use available location-related features, we may obtain approximate or precise location after your authorization. Location is sensitive personal information. Refusal affects only location-related features and not basic communication.'''),
    LegalDocumentBlock(
        r'''Notification, device, and network information: notification authorization status, local notification content, device registration ID, device model, operating-system version, app version, network type, IP address, device language, time zone, crash logs, performance logs, diagnostic logs, API error codes, and connection status, for message alerts, badges, call prompts, security, and stable operation.'''),
    LegalDocumentBlock(
        r'''Local storage information: access tokens, refresh tokens, user settings, conversation caches, message caches, media caches, diagnostic caches, and similar necessary local data to maintain login status, drafts, settings, previews, and offline experience.'''),
    LegalDocumentBlock(
        r'''Feedback, support, and dispute information: issue descriptions, contact methods, screenshots, logs, account information, device information, communications, and handling results you submit through feedback, complaints, support email, phone, or other channels.'''),
    LegalDocumentBlock(
        r'''We will not refuse basic communication services merely because you decline non-essential personal information or permissions unrelated to the current feature. If information is necessary for a feature you actively use, refusal may make that feature unavailable.'''),
    LegalDocumentBlock(r'''3. System Permissions'''),
    LegalDocumentBlock(
        r'''Camera: used for avatar shooting, taking and sending images/videos, QR-code scanning, and video collection for audio/video calls.'''),
    LegalDocumentBlock(
        r'''Microphone: used for voice messages, voice input, audio/video calls, and audio recording during video capture.'''),
    LegalDocumentBlock(
        r'''Photos/media/files: used for choosing avatars, selecting and sending images, videos, audio, or files, saving images, or reading files you actively select.'''),
    LegalDocumentBlock(
        r'''Location: used only for available location-related features you actively use. We do not refuse basic communication because you decline location permission.'''),
    LegalDocumentBlock(
        r'''Notifications, badges, and vibration: used for new messages, customer-service conversations, calls, system reminders, unread badges, and vibration alerts. You may disable them in system or app settings.'''),
    LegalDocumentBlock(
        r'''Network and network status: used for connecting to servers, sending messages, uploading/downloading media, real-time connections, detecting network status, and improving weak-network experience.'''),
    LegalDocumentBlock(
        r'''Storage on Android 12 and earlier or specific system scenarios: used to read or save images, videos, audio, and files you actively select. On Android 13 and later, permissions are requested by media type where applicable.'''),
    LegalDocumentBlock(
        r'''Background refresh or processing: used for necessary login-state maintenance, message synchronization, notification registration, cache cleanup, or tasks allowed by the operating system. We do not collect unrelated sensitive information in the background.'''),
    LegalDocumentBlock(
        r'''Permissions are usually requested when you trigger the relevant feature. You may manage or withdraw permissions in system settings. Withdrawal does not affect processing already performed based on prior authorization, but the corresponding feature may become unavailable.'''),
    LegalDocumentBlock(r'''4. How We Use Personal Information'''),
    LegalDocumentBlock(
        r'''We use personal information to provide, maintain, and implement current Weijie features, including registration/login, account security, message sending and synchronization, friends and groups, audio/video calls, file transfer, enterprise spaces, online customer service, notifications, profile display, complaints/reports, and support.'''),
    LegalDocumentBlock(
        r'''We use information to protect account, service, and communication security, including identity verification, login risk control, anomaly detection, anti-fraud, anti-spam, anti-harassment, anti-attack, anti-malicious registration, API security, content safety, and dispute evidence retention.'''),
    LegalDocumentBlock(
        r'''We use information to improve product and service quality, including troubleshooting, performance analysis, compatibility optimization, weak-network optimization, crash fixing, support response, and user-experience improvement. We try to use de-identified or anonymized data for statistics and analysis.'''),
    LegalDocumentBlock(
        r'''We use information to comply with laws, regulatory requirements, judicial or administrative requests, and to handle complaints, reports, disputes, audits, security incidents, and protection of lawful rights of users, us, or the public.'''),
    LegalDocumentBlock(
        r'''We do not sell personal information and do not use it for purposes unrelated to current Weijie services without your consent.'''),
    LegalDocumentBlock(r'''5. Local Cache and Similar Technologies'''),
    LegalDocumentBlock(
        r'''We may use tokens, local caches, databases, log identifiers, device registration IDs, or similar technologies to keep login status, remember settings, protect security, analyze service quality, cache messages, and improve access experience.'''),
    LegalDocumentBlock(
        r'''Mobile and desktop clients use operating-system capabilities and project dependencies for camera/photo/file selection, QR-code scanning, available location-related capabilities, audio/video calls, notifications, badges, local storage, network connections, and crash diagnostics. We call these capabilities only as necessary for the corresponding feature.'''),
    LegalDocumentBlock(
        r'''You may manage part of local information through system settings, app settings, cache cleanup, logout, local-data deletion, or account deletion. Some necessary caches and logs may be retained for account security, message synchronization, and troubleshooting within a reasonable period.'''),
    LegalDocumentBlock(
        r'''6. Entrusted Processing, Sharing, Transfer, and Disclosure'''),
    LegalDocumentBlock(
        r'''Entrusted processing: to provide server hosting, cloud storage, content safety, message notifications, audio/video calls, available location-related capabilities, customer support, data security, verification codes, and log diagnostics, we may entrust partners to process necessary personal information. We will agree on processing purpose, period, method, information types, protection measures, and responsibilities, and supervise processing as agreed.'''),
    LegalDocumentBlock(
        r'''Third-party SDKs, components, or partner list: if the current version uses third-party SDKs, open-source components, or partners for audio/video calls, image/video/file selection, location capabilities, QR-code recognition, local notifications, crash diagnostics, content safety, verification codes, cloud storage, or similar capabilities, we will list their names, purposes, processing methods, information types, official websites, or privacy-policy links in this Policy, in-app pages, official website, or listing materials as required by app stores and regulators. You may also request the current sharing or entrusted-processing list through the contact methods in this Policy.'''),
    LegalDocumentBlock(
        r'''Sharing: except as described in this Policy, chosen by you, or required by law, we do not share personal information with third parties. When sharing is necessary, we follow the minimum-necessary principle, obtain consent or separate consent where required, and require the recipient to protect confidentiality and security.'''),
    LegalDocumentBlock(
        r'''Enterprise-space and customer-service scenarios: when you join an enterprise space, receive online customer service, or handle conversations as a service agent, the relevant enterprise, support team, or your organization may access information related to that space or service according to business permissions.'''),
    LegalDocumentBlock(
        r'''Transfer: in a merger, division, acquisition, asset transfer, bankruptcy liquidation, or similar transaction involving personal information, we will require the new holder to continue complying with this Policy; otherwise, it must obtain your consent again.'''),
    LegalDocumentBlock(
        r'''Public disclosure: we generally do not publicly disclose personal information. If disclosure is necessary, it will be conducted in compliance with laws and after obtaining your separate consent, except where law, judicial, or administrative authorities require otherwise.'''),
    LegalDocumentBlock(r'''7. Exceptions to Consent'''),
    LegalDocumentBlock(
        r'''Under laws and regulations, processing may not require separate consent where it is necessary for entering into or performing a contract to which you are a party; necessary for statutory duties or obligations; necessary for public-health emergencies or to protect life, health, and property in emergencies; reasonably processing information disclosed by you or otherwise lawfully disclosed; reasonably processing for public-interest news reporting or public-opinion supervision; or other circumstances provided by law.'''),
    LegalDocumentBlock(r'''8. Sensitive Personal Information'''),
    LegalDocumentBlock(
        r'''During use of Weijie, precise location, audio/video-call content, voice, images, videos, files, minors' information, account passwords, and verification information may constitute sensitive personal information.'''),
    LegalDocumentBlock(
        r'''We process sensitive personal information only when necessary for specific features, account security, legal obligations, or dispute handling, and will notify you through permission prompts, feature explanations, separate consent, or other reasonable methods. Refusal may make the corresponding feature unavailable but does not affect features that do not rely on that information.'''),
    LegalDocumentBlock(
        r'''For sensitive permissions such as precise location, microphone, camera, photos/media, files, and audio/video calls, we try to request permission only when you actively trigger the relevant feature and explain the purpose. You may withdraw authorization through system permission management.'''),
    LegalDocumentBlock(r'''9. Storage Location and Retention Period'''),
    LegalDocumentBlock(
        r'''Personal information collected and generated in the People's Republic of China is generally stored within China. If cross-border provision is needed for business reasons, we will complete security assessment, certification, contractual measures, or other compliance measures as required by law, notify you, and obtain separate consent where required.'''),
    LegalDocumentBlock(
        r'''We retain personal information only for the shortest period necessary to achieve the processing purpose. Account information is usually retained until account deletion or a necessary period after service termination; messages and media are retained according to user use, synchronization, backup, and legal requirements; logs and security records are retained according to security, audit, dispute, and legal requirements. After the necessary period, we delete or anonymize the information.'''),
    LegalDocumentBlock(
        r'''After you submit account deletion and the 7-day cooling-off period ends, we delete or anonymize personal information directly associated with the account. Security, audit, complaint, dispute, or regulatory records required by law or necessity will be retained only for the necessary period with access and use restricted.'''),
    LegalDocumentBlock(
        r'''For backup, disaster-recovery, and log-archive copies, we process personal information through periodic overwrite, deletion upon expiry, anonymization, or access restriction while maintaining system security and business continuity. Backup information is not used as daily business data before restoration.'''),
    LegalDocumentBlock(r'''10. Your Rights'''),
    LegalDocumentBlock(
        r'''Access and copy: you may view profiles, account information, friends/groups, settings, message records, and some service records in the app. For information that cannot be accessed by yourself, you may contact us.'''),
    LegalDocumentBlock(
        r'''Correction and supplement: when personal information is inaccurate or incomplete, you may modify it in profile, account settings, or related features, or contact us for assistance.'''),
    LegalDocumentBlock(
        r'''Deletion: you may request deletion in circumstances provided by law, including where the processing purpose has been achieved or cannot be achieved, we stop providing services, retention expires, you withdraw consent, or we process information in violation of law or agreement.'''),
    LegalDocumentBlock(
        r'''Withdrawal and permissions: you may withdraw part of authorization through system permissions, app settings, notification settings, privacy settings, or by contacting us. After withdrawal, we will no longer process the corresponding information, but prior processing remains valid.'''),
    LegalDocumentBlock(
        r'''Account deletion and account-data deletion: mobile path is Settings - Account and Security - Delete Account; desktop path is Account Security - Delete Account. On platforms such as Google Play that require an external account-deletion entry, we will provide a publicly accessible deletion-request web page in app-store developer information or on the official website and fill in that URL in listing materials. The contact email is for cases where you cannot log in, cannot access the deletion entry, or need manual assistance.'''),
    LegalDocumentBlock(
        r'''Explanation, complaint, and report: you may request an explanation of personal-information processing rules and complain or report personal-information issues. After verifying identity, we will respond as soon as possible, generally within 15 working days.'''),
    LegalDocumentBlock(
        r'''If your request involves copying or transferring personal information, deleting an account, deleting large amounts of data, or affecting others' rights, we may require additional identity verification or request details to protect account and data security.'''),
    LegalDocumentBlock(
        r'''We may be unable to respond where the request is directly related to national security, public security, criminal investigation, administrative law enforcement, judicial proceedings, or major public interests; there is sufficient evidence of malicious or abusive requests; response would seriously harm lawful rights of you, others, or organizations; trade secrets are involved; or laws provide otherwise.'''),
    LegalDocumentBlock(r'''11. Minors' Personal Information'''),
    LegalDocumentBlock(
        r'''Weijie is not actively directed to children under 14. Minors under 18 should use Weijie with the consent and guidance of parents or other guardians.'''),
    LegalDocumentBlock(
        r'''If we find that a child under 14 uses Weijie or provides personal information without guardian consent, we will lawfully delete, restrict, delete the account, or take other measures. Guardians may contact us to handle children's personal information.'''),
    LegalDocumentBlock(
        r'''Requests by guardians to access, correct, delete minors' personal information, or delete related accounts will be handled after we verify guardianship and account ownership.'''),
    LegalDocumentBlock(r'''12. Information Security'''),
    LegalDocumentBlock(
        r'''We take industry-standard security measures such as HTTPS/TLS encrypted transmission, access control, permission isolation, identity verification, log audit, data backup, encryption or desensitization of sensitive information, security monitoring, and emergency response.'''),
    LegalDocumentBlock(
        r'''Please keep your account, password, verification code, and device secure. The internet is not absolutely secure. If a personal-information security incident occurs, we will notify you as required by law of the incident, impact, handling measures, risk suggestions, and remedial measures.'''),
    LegalDocumentBlock(
        r'''We apply necessary permission control, confidentiality obligations, and security audits to employees, entrusted processors, and partners to prevent unauthorized access, disclosure, alteration, loss, or misuse of personal information.'''),
    LegalDocumentBlock(r'''13. Policy Updates'''),
    LegalDocumentBlock(
        r'''We may update this Policy due to laws, regulations, regulatory requirements, product features, business models, processing purposes, processing methods, sharing recipients, or contact-method changes.'''),
    LegalDocumentBlock(
        r'''For material changes, we will notify you through in-app pop-up, announcement, push notification, message, or another reasonable method. We will not reduce your rights under this Policy without your express consent. Where renewed or separate consent is required by law, we will handle it accordingly.'''),
    LegalDocumentBlock(r'''14. Contact Us'''),
    LegalDocumentBlock(
        r'''If you have questions, comments, or requests about this Policy, personal-information protection, account deletion, data deletion, permission use, complaints/reports, third-party sharing list, children's information protection, or app-store data-safety statements, contact us. After verifying your identity, we will respond promptly, generally within 15 working days.'''),
    LegalDocumentBlock(r'''Company: Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(r'''Email: postmaster@startlig.com'''),
    LegalDocumentBlock(r'''Phone: 17570846793'''),
    LegalDocumentBlock(r'''Unified Social Credit Code: 91430100MAE5UXKE2R'''),
    LegalDocumentBlock(
        r'''Address: No. 46, Zhantang Group, Zhongping Village, Daiyingling Town, Zhengxiang District, Hengyang, Hunan, China.'''),
  ],
);

const termsLegalDocumentVi = LegalDocumentData(
  appBarTitle: 'Điều khoản dịch vụ',
  blocks: [
    LegalDocumentBlock(r'''Điều khoản dịch vụ Weijie'''),
    LegalDocumentBlock(r'''Cập nhật lần cuối: 01/07/2026'''),
    LegalDocumentBlock(r'''Ngày có hiệu lực: 01/07/2026'''),
    LegalDocumentBlock(
        r'''Chào mừng bạn sử dụng phần mềm Weijie và các dịch vụ liên quan. Điều khoản này được giao kết giữa bạn và Hunan Hongsi Technology Co., Ltd. Vui lòng đọc kỹ trước khi đăng ký, đăng nhập hoặc sử dụng, đặc biệt là các điều khoản về quy tắc dịch vụ, nội dung người dùng, xóa tài khoản, giới hạn trách nhiệm, bảo vệ người chưa thành niên và giải quyết tranh chấp. Khi bấm đồng ý, đăng ký, đăng nhập hoặc tiếp tục sử dụng, bạn xác nhận đã đọc, hiểu và chấp nhận Điều khoản này.'''),
    LegalDocumentBlock(r'''1. Phạm vi dịch vụ'''),
    LegalDocumentBlock(
        r'''Weijie là công cụ nhắn tin tức thời và cộng tác chăm sóc khách hàng cho cá nhân, doanh nghiệp và nhóm hỗ trợ. Các chức năng hiện có gồm đăng ký/đăng nhập, bạn bè và nhóm, danh bạ trong ứng dụng, tin nhắn văn bản/giọng nói/hình ảnh/video/tệp, cuộc gọi âm thanh/video, hiển thị tin nhắn vị trí, quét mã QR, mục yêu thích, tin nhắn hẹn giờ, thông báo, không gian doanh nghiệp, bàn làm việc chăm sóc khách hàng trực tuyến, hồ sơ khách hàng, trả lời nhanh, thông báo/phát sóng, cài đặt và phản hồi.'''),
    LegalDocumentBlock(
        r'''Weijie hỗ trợ iOS, Android và máy tính để bàn. Chức năng, quyền hệ thống và cách hiển thị có thể khác nhau tùy thiết bị, phiên bản hệ điều hành, vai trò tài khoản hoặc cấu hình không gian doanh nghiệp. Một chức năng chưa hiển thị hoặc chưa mở trên một đầu cuối không có nghĩa là chúng tôi đã cam kết cung cấp chức năng đó trên đầu cuối đó.'''),
    LegalDocumentBlock(
        r'''Chúng tôi có thể thay đổi, tạm dừng, giới hạn hoặc chấm dứt một phần dịch vụ vì bảo trì, nâng cấp, an toàn, yêu cầu pháp luật hoặc điều chỉnh kinh doanh. Những thay đổi quan trọng ảnh hưởng đến quyền lợi của bạn sẽ được thông báo bằng thông báo trong ứng dụng, cửa sổ bật lên, tin nhắn, đẩy thông báo hoặc cách hợp lý khác.'''),
    LegalDocumentBlock(r'''2. Tài khoản và an toàn'''),
    LegalDocumentBlock(
        r'''Bạn có thể đăng ký hoặc đăng nhập bằng số điện thoại, email, ID Weijie, mã xác minh, mật khẩu hoặc phương thức được hỗ trợ khác. Thông tin bạn cung cấp phải trung thực, chính xác, đầy đủ và còn hiệu lực.'''),
    LegalDocumentBlock(
        r'''Bạn phải tự bảo quản tài khoản, mật khẩu, mã xác minh, thiết bị và thông tin đăng nhập. Không được bán, cho thuê, cho mượn, chuyển nhượng, chia sẻ tài khoản, mạo danh người khác hoặc phá hoại hệ thống tài khoản bằng tự động hóa, đăng ký hàng loạt, dò mật khẩu hay xác minh ác ý. Khi có rủi ro đăng nhập bất thường, bị đánh cắp, vi phạm pháp luật, xâm phạm quyền hoặc an toàn nền tảng, chúng tôi có thể xác minh, giới hạn đăng nhập/chức năng, đóng băng hoặc xóa tài khoản.'''),
    LegalDocumentBlock(r'''3. Xóa tài khoản và dữ liệu'''),
    LegalDocumentBlock(
        r'''Bạn có thể yêu cầu xóa tài khoản trong ứng dụng di động tại Cài đặt - Tài khoản và bảo mật - Xóa tài khoản, hoặc trên máy tính tại Bảo mật tài khoản - Xóa tài khoản. Đây là lối vào chính. Thông tin liên hệ cuối Điều khoản chỉ dùng khi bạn không thể đăng nhập, không truy cập được lối vào trong ứng dụng hoặc cần hỗ trợ thủ công.'''),
    LegalDocumentBlock(
        r'''Để bảo vệ tài khoản, trước khi xóa chúng tôi có thể yêu cầu xác minh danh tính, kiểm tra trạng thái an toàn, xác nhận mã hoặc xác nhận rủi ro. Quy trình hiện có thời gian chờ 7 ngày; trong thời gian này bạn có thể đăng nhập lại theo hướng dẫn để hủy yêu cầu. Sau thời gian chờ, tài khoản sẽ được xóa hoặc ẩn danh theo quy tắc.'''),
    LegalDocumentBlock(
        r'''Sau khi xóa, hồ sơ cá nhân, thông tin đăng nhập, quan hệ bạn bè, quan hệ không gian doanh nghiệp, trạng thái đăng nhập thiết bị và dữ liệu trực tiếp gắn với tài khoản sẽ bị xóa hoặc ẩn danh. Hồ sơ kiểm toán, an toàn, khiếu nại, tranh chấp, nhật ký cần lưu theo pháp luật hoặc cần thiết sẽ chỉ được giữ cho mục đích tuân thủ, an toàn, xử lý tranh chấp hoặc nghĩa vụ pháp lý. Dữ liệu tại bên xử lý được ủy thác và bản sao sao lưu/nhật ký/khôi phục thảm họa sẽ được yêu cầu xóa, ẩn danh, ngừng xử lý hoặc ghi đè trong chu kỳ hợp lý.'''),
    LegalDocumentBlock(r'''4. Nội dung người dùng và quy tắc liên lạc'''),
    LegalDocumentBlock(
        r'''Bạn chịu trách nhiệm đối với văn bản, hình ảnh, âm thanh, video, tệp, ảnh đại diện, biệt danh, chữ ký, thông báo nhóm, trao đổi chăm sóc khách hàng, phản hồi, khiếu nại và nội dung khác gửi, tải lên, chia sẻ hoặc lưu qua Weijie. Nội dung phải hợp pháp và không xâm phạm quyền hình ảnh, danh dự, quyền riêng tư, sở hữu trí tuệ, bí mật kinh doanh hoặc quyền hợp pháp khác.'''),
    LegalDocumentBlock(
        r'''Không được sử dụng Weijie để tạo, sao chép, đăng, truyền hoặc lưu nội dung bất hợp pháp, độc hại, xâm phạm, gian lận, quấy rối, tiếp thị rác, khiêu dâm, bạo lực/khủng bố, cờ bạc/lừa đảo, xâm hại người chưa thành niên, dẫn lưu ác ý, phần mềm độc hại, thông tin sai lệch, rủi ro an ninh mạng hoặc trái trật tự công cộng, đạo đức xã hội.'''),
    LegalDocumentBlock(
        r'''Chúng tôi cung cấp cơ chế khiếu nại, báo cáo, chặn, danh sách đen, nhận diện và xử lý rủi ro cần thiết. Bạn có thể xử lý nội dung hoặc người dùng không phù hợp bằng khiếu nại, báo cáo, chặn, xóa, rời nhóm hoặc liên hệ hỗ trợ trong ứng dụng.'''),
    LegalDocumentBlock(
        r'''Đối với nội dung nghi ngờ vi phạm pháp luật, quy tắc hoặc xâm phạm quyền, chúng tôi có thể nhắc nhở, hạn chế lan truyền, hạn chế chức năng tài khoản, tạm dừng/chấm dứt dịch vụ, lưu chứng cứ hoặc báo cáo cơ quan có thẩm quyền theo pháp luật.'''),
    LegalDocumentBlock(
        r'''5. Không gian doanh nghiệp và chăm sóc khách hàng'''),
    LegalDocumentBlock(
        r'''Khi bạn sử dụng không gian doanh nghiệp hoặc chức năng chăm sóc khách hàng trực tuyến với tư cách thành viên doanh nghiệp, nhân viên hỗ trợ, khách hàng hoặc khách truy cập, doanh nghiệp, nhóm hỗ trợ hoặc tổ chức của bạn có thể xem, phân công và xử lý hội thoại, hồ sơ khách hàng, bản ghi dịch vụ, trả lời nhanh, thông báo/phát sóng và thông tin cộng tác liên quan đến công việc theo quyền của họ.'''),
    LegalDocumentBlock(
        r'''Doanh nghiệp hoặc tổ chức phải tuân thủ pháp luật và quy tắc thông báo, ủy quyền, quản lý của mình khi quản lý nhân viên, nhân viên hỗ trợ, hồ sơ khách hàng và dữ liệu nghiệp vụ. Nếu bạn đại diện cho doanh nghiệp hoặc tổ chức sử dụng Weijie, bạn phải bảo đảm có quyền tải lên, xử lý hoặc ủy quyền cho chúng tôi xử lý thông tin liên quan, và đã hoàn thành thông báo, ủy quyền cần thiết.'''),
    LegalDocumentBlock(r'''6. Quyền riêng tư và quyền hệ thống'''),
    LegalDocumentBlock(
        r'''Vui lòng đọc Chính sách quyền riêng tư của Weijie để biết cách chúng tôi thu thập, sử dụng, lưu trữ, chia sẻ, bảo vệ thông tin cá nhân và cách bạn thực hiện quyền truy cập, chỉnh sửa, xóa, rút lại ủy quyền, xóa tài khoản.'''),
    LegalDocumentBlock(
        r'''Weijie có thể yêu cầu quyền camera, micro, ảnh/phương tiện, tệp, vị trí, thông báo, mạng, bộ nhớ, quét QR, huy hiệu theo chức năng cụ thể. Chúng tôi thường xin quyền khi bạn kích hoạt chức năng liên quan và không bắt buộc bật quyền không cần thiết cho chức năng bạn không dùng.'''),
    LegalDocumentBlock(
        r'''Bạn có thể từ chối hoặc tắt quyền không thiết yếu. Việc từ chối chỉ ảnh hưởng chức năng tương ứng, không ảnh hưởng chức năng khác. Chúng tôi không từ chối dịch vụ cơ bản chỉ vì bạn từ chối quyền không cần thiết không liên quan đến chức năng hiện tại và không bán thông tin cá nhân cho bên thứ ba.'''),
    LegalDocumentBlock(
        r'''Vị trí chính xác, nội dung cuộc gọi âm thanh/video, giọng nói, hình ảnh, video, tệp, thông tin người chưa thành niên, mật khẩu và mã xác minh có thể là thông tin cá nhân nhạy cảm. Chúng tôi chỉ xử lý trong phạm vi cần thiết cho chức năng cụ thể, an toàn, tranh chấp hoặc nghĩa vụ pháp lý và sẽ thông báo hoặc xin đồng ý riêng khi cần.'''),
    LegalDocumentBlock(r'''7. Hạn chế sử dụng phần mềm và sở hữu trí tuệ'''),
    LegalDocumentBlock(
        r'''Không được đảo ngược, dịch ngược, tháo rời, bẻ khóa, sửa đổi, vượt biện pháp bảo mật, xóa tuyên bố quyền, sao chép thương mại hoặc xâm phạm quyền phần mềm Weijie nếu không có sự cho phép bằng văn bản. Không được dùng plugin, công cụ ngoài, crawler, kịch bản tự động, sửa gói tin, xuất hàng loạt để gây nhiễu dịch vụ, lấy dữ liệu trái phép hoặc ảnh hưởng trải nghiệm người khác.'''),
    LegalDocumentBlock(
        r'''Phần mềm, mã, giao diện, biểu tượng, nhãn hiệu, tên sản phẩm, văn bản, hình ảnh, âm thanh/video, thiết kế tương tác, kiến trúc kỹ thuật và tài liệu liên quan của Weijie thuộc Hunan Hongsi Technology Co., Ltd. hoặc chủ sở hữu quyền. Nội dung gốc hợp pháp của bạn vẫn thuộc về bạn; để cung cấp, đồng bộ, lưu trữ, sao lưu, xử lý khiếu nại, bảo mật và tối ưu dịch vụ, bạn cấp cho chúng tôi quyền lưu, truyền, hiển thị, chuyển định dạng, nén, lưu cache và xử lý kỹ thuật cần thiết trong phạm vi cần thiết.'''),
    LegalDocumentBlock(r'''8. Người chưa thành niên'''),
    LegalDocumentBlock(
        r'''Weijie không chủ động hướng tới trẻ em dưới 14 tuổi. Người dưới 18 tuổi nên sử dụng dưới sự đồng ý và hướng dẫn của cha mẹ hoặc người giám hộ. Nếu phát hiện việc sử dụng của người chưa thành niên không phù hợp pháp luật, quy tắc nền tảng hoặc yêu cầu người giám hộ, chúng tôi có thể giới hạn chức năng, xóa thông tin, xóa tài khoản hoặc áp dụng biện pháp bảo vệ khác.'''),
    LegalDocumentBlock(r'''9. Rủi ro dịch vụ và trách nhiệm'''),
    LegalDocumentBlock(
        r'''Dịch vụ internet có thể bị ảnh hưởng bởi lỗi mạng, nhà mạng, bảo trì hệ thống, tương thích thiết bị, tấn công ác ý, bất khả kháng hoặc thay đổi pháp luật/chính sách. Chúng tôi nỗ lực bảo đảm liên tục và an toàn nhưng không cam kết dịch vụ luôn không gián đoạn hoặc hoàn toàn không lỗi.'''),
    LegalDocumentBlock(
        r'''Bạn phải tự đánh giá tính xác thực, hợp pháp và an toàn của thông tin, tệp, liên kết, mã QR, hồ sơ liên hệ, đề xuất chăm sóc khách hàng nhận hoặc gửi qua Weijie. Điều khoản này không loại trừ hoặc giới hạn trách nhiệm không thể loại trừ hoặc giới hạn theo pháp luật.'''),
    LegalDocumentBlock(
        r'''10. Thay đổi, luật áp dụng, tranh chấp và liên hệ'''),
    LegalDocumentBlock(
        r'''Chúng tôi có thể sửa Điều khoản theo pháp luật, yêu cầu quản lý, chức năng sản phẩm, mô hình kinh doanh hoặc nhu cầu an toàn. Nếu không đồng ý, bạn có thể ngừng sử dụng hoặc yêu cầu xóa tài khoản; nếu tiếp tục sử dụng, bạn được xem là chấp nhận, trừ trường hợp pháp luật yêu cầu đồng ý lại hoặc đồng ý riêng.'''),
    LegalDocumentBlock(
        r'''Việc giao kết, thực hiện, giải thích và giải quyết tranh chấp áp dụng pháp luật Cộng hòa Nhân dân Trung Hoa. Tranh chấp sẽ được thương lượng thiện chí; nếu không thành, một trong hai bên có thể khởi kiện tại tòa án nhân dân có thẩm quyền nơi Hunan Hongsi Technology Co., Ltd. đặt trụ sở.'''),
    LegalDocumentBlock(
        r'''Liên hệ: postmaster@startlig.com; điện thoại: 17570846793; công ty: Hunan Hongsi Technology Co., Ltd.; Mã tín dụng xã hội thống nhất: 91430100MAE5UXKE2R; địa chỉ: Số 46, Tổ Zhantang, Làng Zhongping, Thị trấn Daiyingling, Quận Zhengxiang, Hengyang, Hunan, Trung Quốc.'''),
  ],
);

const privacyLegalDocumentVi = LegalDocumentData(
  appBarTitle: 'Chính sách quyền riêng tư',
  blocks: [
    LegalDocumentBlock(
        r'''Chính sách bảo vệ thông tin cá nhân của Weijie (Chính sách quyền riêng tư)'''),
    LegalDocumentBlock(r'''Cập nhật lần cuối: 01/07/2026'''),
    LegalDocumentBlock(r'''Ngày có hiệu lực: 01/07/2026'''),
    LegalDocumentBlock(
        r'''Hunan Hongsi Technology Co., Ltd. là đơn vị vận hành phần mềm Weijie và các dịch vụ liên quan. Chúng tôi xử lý thông tin cá nhân theo nguyên tắc hợp pháp, chính đáng, cần thiết, thiện chí, mục đích rõ ràng, công khai minh bạch, tối thiểu cần thiết, bảo đảm an toàn và người dùng có thể kiểm soát.'''),
    LegalDocumentBlock(
        r'''Vui lòng đọc chính sách này trước khi đăng ký, đăng nhập hoặc sử dụng. Chính sách được cung cấp trong ứng dụng và, khi nền tảng phân phối yêu cầu, bằng liên kết công khai. Khi đồng ý, đăng ký, đăng nhập hoặc tiếp tục sử dụng, bạn xác nhận đã đọc và đồng ý. Nội dung cần đồng ý riêng hoặc rõ ràng theo pháp luật sẽ được xin riêng.'''),
    LegalDocumentBlock(r'''1. Phạm vi áp dụng'''),
    LegalDocumentBlock(
        r'''Chính sách áp dụng cho Weijie trên iOS, Android, máy tính để bàn và các dịch vụ Weijie được cung cấp qua API, chăm sóc khách hàng, không gian doanh nghiệp hoặc hình thức khác. Chính sách không áp dụng cho sản phẩm/dịch vụ do bên thứ ba cung cấp độc lập; khi truy cập liên kết, trang hoặc năng lực của bên thứ ba, vui lòng đọc chính sách của họ.'''),
    LegalDocumentBlock(
        r'''Thông tin cá nhân là thông tin ghi bằng điện tử hoặc cách khác liên quan đến cá nhân đã được nhận dạng hoặc có thể nhận dạng, không bao gồm thông tin đã ẩn danh. Thông tin cá nhân nhạy cảm là thông tin nếu bị rò rỉ hoặc sử dụng trái phép có thể gây tổn hại đến nhân phẩm hoặc an toàn thân thể, tài sản.'''),
    LegalDocumentBlock(r'''2. Thông tin chúng tôi thu thập'''),
    LegalDocumentBlock(
        r'''Thông tin tài khoản: số điện thoại, email, ID Weijie, tên đăng nhập, mật khẩu hoặc tóm tắt mật khẩu, mã xác minh, ảnh đại diện, biệt danh, giới tính, ngày sinh, khu vực hiển thị trong hồ sơ, chữ ký, trạng thái đăng nhập, trạng thái tài khoản/xóa, bản ghi đăng nhập thiết bị để tạo tài khoản, xác thực, khôi phục, bảo mật và đồng bộ nhiều thiết bị.'''),
    LegalDocumentBlock(
        r'''Thông tin quan hệ và danh bạ trong ứng dụng: ảnh đại diện, biệt danh, ghi chú, nhãn, quan hệ bạn bè, danh sách đen, nhóm, biệt danh nhóm, thông báo nhóm, danh tính thành viên, không gian doanh nghiệp, vai trò/quyền, quan hệ chăm sóc khách hàng. Weijie hiện không xin quyền danh bạ hệ thống.'''),
    LegalDocumentBlock(
        r'''Thông tin liên lạc/tương tác: văn bản, hình ảnh, giọng nói, video, tệp, nội dung tin nhắn vị trí, danh thiếp, biểu tượng, thời gian, trạng thái gửi/đã đọc, thu hồi/thử lại, ID hội thoại/nhóm, hội thoại chăm sóc khách hàng, bản ghi dịch vụ, tài liệu khiếu nại để truyền, đồng bộ, hiển thị, lưu lịch sử, xử lý dịch vụ, tranh chấp và an toàn.'''),
    LegalDocumentBlock(
        r'''Thông tin phương tiện/tệp/ảnh: khi bạn chọn ảnh đại diện, gửi ảnh/video/tệp, chụp ảnh/quay video, lưu ảnh, tạo ảnh thu nhỏ hoặc mở tệp, chúng tôi xử lý nội dung bạn chọn hoặc cho phép như tệp phương tiện, tên, kích thước, loại, ảnh thu nhỏ, trạng thái tải lên/tải xuống. Chúng tôi không đọc toàn bộ thư viện ảnh hoặc tệp khi không được phép hoặc không cần thiết.'''),
    LegalDocumentBlock(
        r'''Camera, micro, quét QR: sau khi được cho phép, dùng cho chụp ảnh đại diện, gửi nội dung chụp, ghi âm, cuộc gọi âm thanh/video, quét mã QR để thêm bạn, vào nhóm hoặc tham gia doanh nghiệp.'''),
    LegalDocumentBlock(
        r'''Vị trí: khi bạn chủ động dùng chức năng vị trí đã mở, chúng tôi có thể lấy vị trí gần đúng hoặc chính xác sau khi được cho phép. Vị trí là thông tin nhạy cảm; từ chối chỉ ảnh hưởng chức năng vị trí, không ảnh hưởng liên lạc cơ bản.'''),
    LegalDocumentBlock(
        r'''Thông báo, thiết bị, mạng và nhật ký: trạng thái quyền thông báo, nội dung thông báo cục bộ, ID đăng ký thiết bị, model, hệ điều hành, phiên bản ứng dụng, loại mạng, IP, ngôn ngữ, múi giờ, nhật ký crash/hiệu năng/chẩn đoán, mã lỗi API, trạng thái kết nối để nhắc tin nhắn, huy hiệu, cuộc gọi, an toàn và vận hành ổn định.'''),
    LegalDocumentBlock(
        r'''Thông tin lưu cục bộ: token truy cập, token làm mới, cài đặt, cache hội thoại/tin nhắn/phương tiện/chẩn đoán để duy trì đăng nhập, bản nháp, cài đặt, xem trước và trải nghiệm ngoại tuyến.'''),
    LegalDocumentBlock(
        r'''Thông tin phản hồi, hỗ trợ, tranh chấp: mô tả vấn đề, liên hệ, ảnh chụp màn hình, nhật ký, tài khoản, thiết bị, trao đổi và kết quả xử lý bạn gửi qua phản hồi, khiếu nại, email, điện thoại hoặc kênh khác.'''),
    LegalDocumentBlock(r'''3. Quyền hệ thống'''),
    LegalDocumentBlock(
        r'''Camera dùng cho ảnh đại diện, chụp/gửi ảnh video, quét QR và video call. Micro dùng cho tin nhắn thoại, nhập giọng nói, cuộc gọi âm thanh/video và ghi âm khi quay video. Ảnh/phương tiện/tệp dùng để chọn ảnh đại diện, chọn/gửi ảnh, video, âm thanh, tệp, lưu ảnh hoặc đọc tệp bạn chọn.'''),
    LegalDocumentBlock(
        r'''Vị trí chỉ dùng cho chức năng vị trí đã mở khi bạn chủ động dùng. Thông báo, huy hiệu, rung dùng cho tin nhắn mới, hội thoại chăm sóc khách hàng, cuộc gọi, nhắc hệ thống, huy hiệu chưa đọc và rung. Mạng dùng để kết nối máy chủ, gửi tin, tải lên/tải xuống, kết nối thời gian thực, phát hiện mạng và cải thiện mạng yếu.'''),
    LegalDocumentBlock(
        r'''Bộ nhớ trên Android 12 trở xuống hoặc một số hệ thống dùng để đọc/lưu ảnh, video, âm thanh, tệp bạn chọn; Android 13 trở lên xin theo loại phương tiện khi áp dụng. Nền dùng cho duy trì đăng nhập, đồng bộ tin nhắn, đăng ký thông báo, dọn cache hoặc tác vụ được hệ thống cho phép; chúng tôi không thu thập thông tin nhạy cảm không liên quan trong nền.'''),
    LegalDocumentBlock(
        r'''Quyền thường được xin khi bạn kích hoạt chức năng. Bạn có thể quản lý hoặc rút lại trong cài đặt hệ thống; rút lại không ảnh hưởng xử lý đã thực hiện trước đó nhưng chức năng tương ứng có thể không dùng được.'''),
    LegalDocumentBlock(r'''4. Cách sử dụng thông tin'''),
    LegalDocumentBlock(
        r'''Chúng tôi dùng thông tin để cung cấp, duy trì và thực hiện chức năng hiện tại của Weijie như đăng ký/đăng nhập, bảo mật tài khoản, gửi và đồng bộ tin nhắn, bạn bè/nhóm, gọi âm thanh/video, truyền tệp, không gian doanh nghiệp, chăm sóc khách hàng trực tuyến, thông báo, hồ sơ, khiếu nại/báo cáo và hỗ trợ.'''),
    LegalDocumentBlock(
        r'''Chúng tôi dùng thông tin để bảo vệ tài khoản, dịch vụ và liên lạc: xác thực, kiểm soát rủi ro đăng nhập, phát hiện bất thường, chống gian lận, spam, quấy rối, tấn công, đăng ký ác ý, bảo mật API, an toàn nội dung và lưu chứng cứ tranh chấp.'''),
    LegalDocumentBlock(
        r'''Chúng tôi dùng thông tin để cải thiện chất lượng: khắc phục sự cố, phân tích hiệu năng, tối ưu tương thích, tối ưu mạng yếu, sửa crash, phản hồi hỗ trợ và cải thiện trải nghiệm; dữ liệu thống kê sẽ được khử định danh hoặc ẩn danh khi có thể.'''),
    LegalDocumentBlock(
        r'''Chúng tôi dùng thông tin để tuân thủ pháp luật, yêu cầu quản lý, tư pháp/hành chính, xử lý khiếu nại, báo cáo, tranh chấp, kiểm toán, sự cố an toàn và bảo vệ quyền lợi hợp pháp. Chúng tôi không bán thông tin cá nhân và không dùng cho mục đích không liên quan đến dịch vụ hiện tại nếu chưa có sự đồng ý.'''),
    LegalDocumentBlock(r'''5. Cache, xử lý ủy thác và chia sẻ'''),
    LegalDocumentBlock(
        r'''Chúng tôi có thể dùng token, cache cục bộ, cơ sở dữ liệu, mã nhật ký, ID đăng ký thiết bị hoặc công nghệ tương tự để giữ đăng nhập, ghi nhớ cài đặt, bảo mật, thống kê chất lượng, cache tin nhắn và cải thiện trải nghiệm.'''),
    LegalDocumentBlock(
        r'''Để cung cấp máy chủ, lưu trữ đám mây, an toàn nội dung, thông báo, cuộc gọi âm thanh/video, năng lực vị trí đã mở, hỗ trợ khách hàng, bảo mật dữ liệu, mã xác minh, chẩn đoán nhật ký, chúng tôi có thể ủy thác đối tác xử lý thông tin cần thiết và sẽ quy định mục đích, thời hạn, cách xử lý, loại thông tin, biện pháp bảo vệ, trách nhiệm.'''),
    LegalDocumentBlock(
        r'''Nếu phiên bản hiện tại dùng SDK bên thứ ba, mã nguồn mở hoặc đối tác cho cuộc gọi, chọn ảnh/video/tệp, vị trí, QR, thông báo cục bộ, crash, an toàn nội dung, mã xác minh, đám mây, chúng tôi sẽ liệt kê tên, mục đích, cách xử lý, loại thông tin, website hoặc chính sách trong chính sách, trang trong ứng dụng, website hoặc hồ sơ phát hành theo yêu cầu. Bạn có thể yêu cầu danh sách chia sẻ/ủy thác hiện tại qua thông tin liên hệ.'''),
    LegalDocumentBlock(
        r'''Ngoài nội dung đã nêu, lựa chọn của bạn hoặc yêu cầu pháp luật, chúng tôi không chia sẻ thông tin cá nhân với bên thứ ba. Khi cần chia sẻ, chúng tôi tuân thủ nguyên tắc tối thiểu cần thiết, xin đồng ý hoặc đồng ý riêng khi cần và yêu cầu bên nhận bảo mật.'''),
    LegalDocumentBlock(
        r'''Trong không gian doanh nghiệp và chăm sóc khách hàng, doanh nghiệp, nhóm hỗ trợ hoặc tổ chức của bạn có thể truy cập thông tin liên quan theo quyền nghiệp vụ. Khi sáp nhập, chia tách, mua lại, chuyển nhượng tài sản, phá sản, bên nhận mới phải tiếp tục tuân thủ chính sách này hoặc xin lại đồng ý. Chúng tôi về nguyên tắc không công khai thông tin cá nhân, trừ khi tuân thủ pháp luật và có đồng ý riêng hoặc cơ quan có thẩm quyền yêu cầu.'''),
    LegalDocumentBlock(r'''6. Ngoại lệ đồng ý và thông tin nhạy cảm'''),
    LegalDocumentBlock(
        r'''Theo pháp luật, việc xử lý có thể không cần xin đồng ý riêng khi cần để giao kết/thực hiện hợp đồng, thực hiện nghĩa vụ pháp lý, ứng phó khẩn cấp để bảo vệ sức khỏe/tài sản, xử lý hợp lý thông tin bạn công khai hoặc đã công khai hợp pháp, vì báo chí/lợi ích công cộng trong phạm vi hợp lý hoặc trường hợp khác theo luật.'''),
    LegalDocumentBlock(
        r'''Vị trí chính xác, nội dung cuộc gọi âm thanh/video, giọng nói, hình ảnh, video, tệp, thông tin người chưa thành niên, mật khẩu, mã xác minh có thể là thông tin nhạy cảm. Chúng tôi chỉ xử lý khi cần cho chức năng cụ thể, an toàn tài khoản, nghĩa vụ pháp lý hoặc tranh chấp và sẽ thông báo bằng hộp quyền, mô tả chức năng, đồng ý riêng hoặc cách hợp lý khác.'''),
    LegalDocumentBlock(r'''7. Lưu trữ và thời hạn'''),
    LegalDocumentBlock(
        r'''Thông tin cá nhân thu thập và phát sinh tại Trung Quốc về nguyên tắc được lưu tại Trung Quốc. Nếu cần cung cấp ra nước ngoài vì kinh doanh, chúng tôi sẽ thực hiện đánh giá an toàn, chứng nhận, hợp đồng hoặc biện pháp tuân thủ khác, thông báo và xin đồng ý riêng khi luật yêu cầu.'''),
    LegalDocumentBlock(
        r'''Chúng tôi chỉ lưu thông tin trong thời gian ngắn nhất cần thiết. Thông tin tài khoản thường lưu đến khi xóa tài khoản hoặc sau khi chấm dứt dịch vụ trong thời gian cần thiết; tin nhắn và phương tiện lưu theo việc sử dụng, đồng bộ, sao lưu và luật; nhật ký/an toàn lưu theo nhu cầu an toàn, kiểm toán, tranh chấp và luật. Hết thời hạn sẽ xóa hoặc ẩn danh.'''),
    LegalDocumentBlock(
        r'''Sau khi bạn yêu cầu xóa tài khoản và hết thời gian chờ 7 ngày, chúng tôi xóa hoặc ẩn danh thông tin trực tiếp gắn với tài khoản. Hồ sơ an toàn, kiểm toán, khiếu nại, tranh chấp, quản lý cần lưu sẽ chỉ lưu trong thời gian cần thiết, hạn chế truy cập và mục đích. Dữ liệu trong sao lưu/khôi phục/nhật ký sẽ được ghi đè, xóa khi đến hạn, ẩn danh hoặc hạn chế truy cập.'''),
    LegalDocumentBlock(r'''8. Quyền của bạn'''),
    LegalDocumentBlock(
        r'''Bạn có thể xem hồ sơ, tài khoản, bạn bè/nhóm, cài đặt, lịch sử tin nhắn và một số bản ghi dịch vụ trong ứng dụng. Nếu không tự truy cập được, bạn có thể liên hệ chúng tôi. Bạn có thể chỉnh sửa thông tin không chính xác/không đầy đủ trong hồ sơ, cài đặt hoặc nhờ chúng tôi hỗ trợ.'''),
    LegalDocumentBlock(
        r'''Bạn có thể yêu cầu xóa thông tin theo luật khi mục đích xử lý đã đạt hoặc không thể đạt, chúng tôi ngừng dịch vụ, hết thời hạn lưu, bạn rút đồng ý, hoặc chúng tôi xử lý trái luật/thỏa thuận. Bạn có thể rút một phần ủy quyền qua quyền hệ thống, cài đặt ứng dụng, thông báo, quyền riêng tư hoặc liên hệ chúng tôi.'''),
    LegalDocumentBlock(
        r'''Xóa tài khoản và dữ liệu: di động tại Cài đặt - Tài khoản và bảo mật - Xóa tài khoản; máy tính tại Bảo mật tài khoản - Xóa tài khoản. Trên Google Play và nền tảng yêu cầu lối vào xóa ngoài ứng dụng, chúng tôi sẽ cung cấp trang web yêu cầu xóa công khai trong thông tin nhà phát triển hoặc website chính thức và điền URL trong hồ sơ phát hành. Email liên hệ dùng khi không thể đăng nhập, không truy cập được lối vào hoặc cần hỗ trợ thủ công.'''),
    LegalDocumentBlock(
        r'''Bạn có quyền yêu cầu giải thích quy tắc xử lý, khiếu nại hoặc báo cáo vấn đề. Sau khi xác minh danh tính, chúng tôi thường phản hồi trong 15 ngày làm việc. Với yêu cầu sao chép, chuyển, xóa tài khoản, xóa nhiều dữ liệu hoặc ảnh hưởng người khác, chúng tôi có thể yêu cầu xác minh hoặc giải thích bổ sung.'''),
    LegalDocumentBlock(
        r'''Chúng tôi có thể không phản hồi trong các trường hợp liên quan trực tiếp đến an ninh quốc gia, an toàn công cộng, điều tra hình sự, thi hành hành chính, tố tụng tư pháp, lợi ích công cộng lớn; có bằng chứng về ác ý/lạm dụng quyền; phản hồi gây thiệt hại nghiêm trọng cho quyền của bạn, người khác hoặc tổ chức; liên quan bí mật thương mại; hoặc trường hợp luật quy định.'''),
    LegalDocumentBlock(r'''9. Người chưa thành niên'''),
    LegalDocumentBlock(
        r'''Weijie không chủ động hướng tới trẻ em dưới 14 tuổi. Người dưới 18 tuổi nên sử dụng với sự đồng ý và hướng dẫn của cha mẹ/người giám hộ. Nếu phát hiện trẻ dưới 14 tuổi sử dụng hoặc cung cấp thông tin khi chưa có đồng ý của người giám hộ, chúng tôi sẽ xóa, giới hạn, xóa tài khoản hoặc áp dụng biện pháp khác. Người giám hộ có thể liên hệ để truy cập, chỉnh sửa, xóa thông tin hoặc xóa tài khoản liên quan sau khi xác minh quan hệ giám hộ và quyền tài khoản.'''),
    LegalDocumentBlock(r'''10. An toàn thông tin'''),
    LegalDocumentBlock(
        r'''Chúng tôi áp dụng biện pháp an toàn phù hợp mức thông dụng trong ngành như truyền HTTPS/TLS, kiểm soát truy cập, cách ly quyền, xác thực, kiểm toán nhật ký, sao lưu, mã hóa hoặc khử định danh thông tin nhạy cảm, giám sát an toàn và ứng phó khẩn cấp.'''),
    LegalDocumentBlock(
        r'''Vui lòng bảo quản tài khoản, mật khẩu, mã xác minh và thiết bị. Internet không an toàn tuyệt đối; nếu xảy ra sự cố an toàn thông tin cá nhân, chúng tôi sẽ thông báo theo luật về tình huống, ảnh hưởng, biện pháp xử lý, khuyến nghị rủi ro và biện pháp khắc phục. Chúng tôi cũng áp dụng kiểm soát quyền, nghĩa vụ bảo mật và kiểm toán đối với nhân viên, bên xử lý ủy thác, đối tác.'''),
    LegalDocumentBlock(r'''11. Cập nhật và liên hệ'''),
    LegalDocumentBlock(
        r'''Chúng tôi có thể cập nhật chính sách do luật, yêu cầu quản lý, chức năng sản phẩm, mô hình kinh doanh, mục đích/cách xử lý, đối tượng chia sẻ hoặc thông tin liên hệ thay đổi. Thay đổi quan trọng sẽ được thông báo bằng cửa sổ bật lên, thông báo, đẩy, tin nhắn hoặc cách hợp lý.'''),
    LegalDocumentBlock(
        r'''Nếu có câu hỏi, ý kiến hoặc yêu cầu về chính sách, bảo vệ thông tin cá nhân, xóa tài khoản, xóa dữ liệu, quyền hệ thống, khiếu nại/báo cáo, danh sách chia sẻ bên thứ ba, thông tin trẻ em hoặc tuyên bố an toàn dữ liệu trên cửa hàng ứng dụng, vui lòng liên hệ. Sau khi xác minh danh tính, chúng tôi thường phản hồi trong 15 ngày làm việc.'''),
    LegalDocumentBlock(r'''Công ty: Hunan Hongsi Technology Co., Ltd.'''),
    LegalDocumentBlock(r'''Email: postmaster@startlig.com'''),
    LegalDocumentBlock(r'''Điện thoại: 17570846793'''),
    LegalDocumentBlock(
        r'''Mã tín dụng xã hội thống nhất: 91430100MAE5UXKE2R'''),
    LegalDocumentBlock(
        r'''Địa chỉ: Số 46, Tổ Zhantang, Làng Zhongping, Thị trấn Daiyingling, Quận Zhengxiang, Hengyang, Hunan, Trung Quốc.'''),
  ],
);

LegalDocumentData termsLegalDocumentForLocale(Locale locale) {
  return switch (_legalLocaleKey(locale)) {
    'zh-TW' => termsLegalDocumentZhTw,
    'en' => termsLegalDocumentEn,
    'ja' => termsLegalDocumentJa,
    'ko' => termsLegalDocumentKo,
    'vi' => termsLegalDocumentVi,
    _ => termsLegalDocumentZh,
  };
}

LegalDocumentData privacyLegalDocumentForLocale(Locale locale) {
  return switch (_legalLocaleKey(locale)) {
    'zh-TW' => privacyLegalDocumentZhTw,
    'en' => privacyLegalDocumentEn,
    'ja' => privacyLegalDocumentJa,
    'ko' => privacyLegalDocumentKo,
    'vi' => privacyLegalDocumentVi,
    _ => privacyLegalDocumentZh,
  };
}

String _legalLocaleKey(Locale locale) {
  if (locale.languageCode == 'zh' && locale.countryCode == 'TW') {
    return 'zh-TW';
  }
  return switch (locale.languageCode) {
    'en' => 'en',
    'ja' => 'ja',
    'ko' => 'ko',
    'vi' => 'vi',
    _ => 'zh-CN',
  };
}

class LegalDocumentScaffold extends StatelessWidget {
  final LegalDocumentData document;

  const LegalDocumentScaffold({required this.document, super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, document.appBarTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: _LegalDocumentCard(document: document),
      ),
    );
  }
}

class _LegalDocumentCard extends StatelessWidget {
  final LegalDocumentData document;

  const _LegalDocumentCard({required this.document});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var index = 0; index < document.blocks.length; index++) ...[
            _LegalBlockText(index: index, text: document.blocks[index].text),
            if (index < document.blocks.length - 1)
              SizedBox(height: _spacingAfter(document.blocks[index].text)),
          ],
        ],
      ),
    );
  }
}

class _LegalBlockText extends StatelessWidget {
  final int index;
  final String text;

  const _LegalBlockText({required this.index, required this.text});

  @override
  Widget build(BuildContext context) {
    final kind = _resolveBlockKind(index, text);
    return Text(
      text,
      style: switch (kind) {
        _LegalBlockKind.title => const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1D2129),
            height: 1.45,
          ),
        _LegalBlockKind.meta => const TextStyle(
            fontSize: 12,
            color: Color(0xFF8E8E93),
            height: 1.45,
          ),
        _LegalBlockKind.section => const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1D2129),
            height: 1.55,
          ),
        _LegalBlockKind.body => const TextStyle(
            fontSize: 14,
            color: Color(0xFF4B5563),
            height: 1.7,
          ),
      },
    );
  }
}

enum _LegalBlockKind { title, meta, section, body }

_LegalBlockKind _resolveBlockKind(int index, String text) {
  if (index == 0) return _LegalBlockKind.title;
  if (text.startsWith('更新日期：') ||
      text.startsWith('最近更新日期：') ||
      text.startsWith('生效日期：') ||
      text.startsWith('协议生效日期：') ||
      RegExp(r'^(Last updated|Updated|Effective|Effective date|最終更新日|発効日|Cập nhật|Ngày có hiệu lực|최종 업데이트|시행일):|^(最近更新日期|生效日期)：')
          .hasMatch(text)) {
    return _LegalBlockKind.meta;
  }
  if (RegExp(r'^[一二三四五六七八九十]+、').hasMatch(text) ||
      RegExp(r'^\d+[.．]\s').hasMatch(text)) {
    return _LegalBlockKind.section;
  }
  return _LegalBlockKind.body;
}

double _spacingAfter(String text) {
  if (text.startsWith('更新日期：') ||
      text.startsWith('最近更新日期：') ||
      text.startsWith('生效日期：') ||
      RegExp(r'^(Last updated|Updated|Effective|Effective date|最終更新日|発効日|Cập nhật|Ngày có hiệu lực|최종 업데이트|시행일):|^(最近更新日期|生效日期)：')
          .hasMatch(text)) {
    return 4;
  }
  if (RegExp(r'^[一二三四五六七八九十]+、').hasMatch(text) ||
      RegExp(r'^\d+[.．]\s').hasMatch(text)) {
    return 8;
  }
  return 12;
}
