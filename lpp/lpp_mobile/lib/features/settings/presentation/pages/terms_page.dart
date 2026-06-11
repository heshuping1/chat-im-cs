import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';

class TermsPage extends StatelessWidget {
  const TermsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, '用户协议'),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: _TermsContent(),
      ),
    );
  }
}

class _TermsContent extends StatelessWidget {
  const _TermsContent();

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
          _Title('星络用户服务协议'),
          _UpdateDate('更新日期：2026年1月1日'),
          _UpdateDate('生效日期：2026年1月1日'),
          SizedBox(height: 16),
          _Body(
            '欢迎您使用星络！在使用星络服务之前，请您仔细阅读本协议。本协议是您与星络科技有限公司（以下简称"我们"）之间关于您使用星络软件及相关服务所订立的协议。',
          ),
          SizedBox(height: 16),
          _Section('一、服务内容'),
          _Body(
            '1.1 星络是一款即时通讯应用，提供文字、语音、视频通话、文件传输等通讯服务。\n\n'
            '1.2 我们保留随时修改、中断或终止部分或全部服务的权利，且无需对用户或第三方承担任何责任。\n\n'
            '1.3 我们有权定期或不定期地对提供服务的平台进行检修、维护、升级，此类情况可能导致服务在合理时间内中断。',
          ),
          SizedBox(height: 12),
          _Section('二、账号注册与使用'),
          _Body(
            '2.1 您在使用本服务前需要注册一个星络账号。账号注册时，您需要提供真实、准确、完整的个人信息。\n\n'
            '2.2 您应妥善保管账号及密码，不得将账号转让或授权他人使用。因您保管不善导致的账号被盗用，由您自行承担相应责任。\n\n'
            '2.3 您注册的账号仅限本人使用，禁止出售、出租、转让账号。',
          ),
          SizedBox(height: 12),
          _Section('三、用户行为规范'),
          _Body(
            '3.1 您在使用本服务时，必须遵守中华人民共和国相关法律法规。\n\n'
            '3.2 您不得利用本服务从事以下行为：\n'
            '• 发布、传播违法、违规、有害信息\n'
            '• 侵犯他人知识产权、隐私权等合法权益\n'
            '• 发送垃圾信息、广告信息\n'
            '• 从事任何危害网络安全的行为\n'
            '• 其他违反法律法规或本协议的行为\n\n'
            '3.3 如您违反上述规定，我们有权暂停或终止您的账号，并保留追究法律责任的权利。',
          ),
          SizedBox(height: 12),
          _Section('四、知识产权'),
          _Body(
            '4.1 星络软件及相关服务中包含的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、代码等，其知识产权均归我们所有。\n\n'
            '4.2 未经我们书面许可，您不得以任何方式复制、修改、传播或使用上述内容。',
          ),
          SizedBox(height: 12),
          _Section('五、免责声明'),
          _Body(
            '5.1 我们不对因不可抗力或我们无法控制的原因造成的服务中断或其他缺陷承担任何责任。\n\n'
            '5.2 您通过本服务发布的内容，由您自行承担相应的法律责任。\n\n'
            '5.3 对于第三方提供的内容或服务，我们不承担任何责任。',
          ),
          SizedBox(height: 12),
          _Section('六、协议修改'),
          _Body(
            '6.1 我们有权根据需要不定期修订本协议，修订后的协议将在本软件内公告。\n\n'
            '6.2 如您在协议修订后继续使用本服务，则视为您已接受修订后的协议。',
          ),
          SizedBox(height: 12),
          _Section('七、联系我们'),
          _Body(
            '如您对本协议有任何疑问，请通过以下方式联系我们：\n\n'
            '公司名称：星络科技有限公司\n'
            '电子邮件：support@lpp.com\n'
            '客服电话：400-000-0000',
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
