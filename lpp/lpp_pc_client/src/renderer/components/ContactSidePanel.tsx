import type { ContactFilter, ContactItem } from "../data/types";

export function ContactSidePanel({
  filter,
  contact,
}: {
  filter: ContactFilter;
  contact?: ContactItem;
}) {
  if (contact?.kind === "staff") {
    return (
      <aside className="contacts-profile-panel contacts-side-empty">
        <h2>组织成员资料</h2>
        <p>组织成员只展示部门、职位、角色和会话入口，不展示客户画像或好友危险操作。</p>
        <div className="contacts-mini-rows">
          <InfoLine label="姓名" value={contact.name} />
          <InfoLine label="角色" value={contact.roleLabel || "--"} />
          <InfoLine label="部门" value={contact.departmentName || "--"} />
        </div>
      </aside>
    );
  }
  if (contact?.kind === "group") {
    return (
      <aside className="contacts-profile-panel contacts-side-empty">
        <h2>群聊资料</h2>
        <p>群聊展示成员、提醒和最近消息；成员管理、群公告、群文件等待群详情接口接入。</p>
        <div className="contacts-mini-rows">
          <InfoLine label="群名" value={contact.name} />
          <InfoLine label="成员数" value={contact.members ? `${contact.members} 人` : "--"} />
          <InfoLine label="提醒" value={contact.muted ? "免打扰" : "正常提醒"} />
        </div>
      </aside>
    );
  }
  return (
    <aside className="contacts-profile-panel contacts-side-empty">
      <h2>{filter === "requests" ? "申请说明" : "资料"}</h2>
      <p>
        {filter === "requests"
          ? "好友申请支持通过或拒绝，处理后会刷新申请列表。"
          : "请选择联系人查看资料。"}
      </p>
    </aside>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}
