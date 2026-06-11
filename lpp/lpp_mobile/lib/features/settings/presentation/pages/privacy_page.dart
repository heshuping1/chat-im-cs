import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';

class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, '隐私政策'),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: _PrivacyContent(),
      ),
    );
  }
}

class _PrivacyContent extends StatelessWidget {
  const _PrivacyContent();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Title('星络隐私政策'),
          _UpdateDate('更新日期：2026年1月1日'),
          _UpdateDate('生效日期：2026年1月1日'),
          SizedBox(height: 16),
          _Body(
            '星络科技有限公司（以下简称"我们"）深知个人信息对您的重要性，我们将按照法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。',
          ),
          SizedBox(height: 16),
          _Section('一、我们收集的信息'),
          _Body(
            '1.1 账号信息\n'
            '注册时您需提供手机号码或邮箱地址，以及您设置的昵称、头像等个人资料。\n\n'
            '1.2 通讯内容\n'
            '您在使用星络时发送的消息、图片、语音、视频等内容，仅用于提供通讯服务，我们不会主动读取您的私信内容。\n\n'
            '1.3 设备信息\n'
            '为保障服务安全，我们会收集设备型号、操作系统版本、设备标识符等信息。\n\n'
            '1.4 日志信息\n'
            '您使用服务时，我们会自动收集服务日志信息，包括登录时间、使用功能等。',
          ),
          SizedBox(height: 12),
          _Section('二、我们如何使用信息'),
          _Body(
            '2.1 提供、维护和改善我们的服务\n\n'
            '2.2 验证您的身份，保障账号安全\n\n'
            '2.3 向您发送服务通知和重要提醒\n\n'
            '2.4 分析服务使用情况，优化用户体验\n\n'
            '2.5 遵守法律法规要求',
          ),
          SizedBox(height: 12),
          _Section('三、信息共享'),
          _Body(
            '3.1 我们不会向第三方出售您的个人信息。\n\n'
            '3.2 在以下情况下，我们可能共享您的信息：\n'
            '• 获得您的明确同意\n'
            '• 依据法律法规要求\n'
            '• 为保护用户或公众的合法权益\n\n'
            '3.3 我们可能与合作伙伴共享必要的信息以提供服务，但会要求其遵守严格的保密义务。',
          ),
          SizedBox(height: 12),
          _Section('四、信息存储与安全'),
          _Body(
            '4.1 您的个人信息存储于中华人民共和国境内的服务器。\n\n'
            '4.2 我们采用加密传输、访问控制等安全措施保护您的信息。\n\n'
            '4.3 我们会在实现服务目的所必要的期限内保留您的信息，超出期限后将依法删除或匿名化处理。',
          ),
          SizedBox(height: 12),
          _Section('五、您的权利'),
          _Body(
            '5.1 访问权：您可以在"设置 - 我的资料"中查看您的个人信息。\n\n'
            '5.2 更正权：您可以随时修改您的个人资料。\n\n'
            '5.3 删除权：您可以申请注销账号，注销后我们将删除您的个人信息。\n\n'
            '5.4 撤回同意：您可以通过关闭相关功能权限撤回您的授权同意。',
          ),
          SizedBox(height: 12),
          _Section('六、未成年人保护'),
          _Body(
            '6.1 星络不向未满14周岁的未成年人提供服务。\n\n'
            '6.2 如果我们发现在未获得可证实的父母同意的情况下收集了未成年人的个人信息，我们会尽快删除相关信息。',
          ),
          SizedBox(height: 12),
          _Section('七、隐私政策更新'),
          _Body(
            '7.1 我们可能适时修订本隐私政策，修订后将在本软件内公告。\n\n'
            '7.2 重大变更时，我们会通过推送通知等方式提醒您。',
          ),
          SizedBox(height: 12),
          _Section('八、联系我们'),
          _Body(
            '如您对本隐私政策有任何疑问或投诉，请联系：\n\n'
            '公司名称：星络科技有限公司\n'
            '电子邮件：privacy@lpp.com\n'
            '客服电话：400-000-0000\n'
            '我们将在15个工作日内回复您的请求。',
          ),
          SizedBox(height: 24),
          _Footer('© 2026 星络科技有限公司 保留所有权利'),
        ],
      ),
    );
  }
}

class _Title extends StatelessWidget {
  final String text;
  const _Title(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: const TextStyle(
                fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1D2129))),
      );
}

class _UpdateDate extends StatelessWidget {
  final String text;
  const _UpdateDate(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(fontSize: 12, color: Color(0xFF8E8E93)));
}

class _Section extends StatelessWidget {
  final String text;
  const _Section(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: const TextStyle(
                fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF1D2129))),
      );
}

class _Body extends StatelessWidget {
  final String text;
  const _Body(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          fontSize: 14, color: Color(0xFF4B5563), height: 1.7));
}

class _Footer extends StatelessWidget {
  final String text;
  const _Footer(this.text);

  @override
  Widget build(BuildContext context) => Center(
        child: Text(text,
            style: const TextStyle(fontSize: 12, color: Color(0xFFAEAEB2))),
      );
}
