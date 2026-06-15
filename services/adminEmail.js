function getStudyReminderEmailTemplate() {
    try {
        if (!checkAdminRole()) {
            return { success: false, message: "Không có quyền truy cập" };
        }
        const props = PropertiesService.getScriptProperties();
        let subject = props.getProperty("EMAIL_REMINDER_SUBJECT");
        let body = props.getProperty("EMAIL_REMINDER_BODY");

        if (!subject) subject = "Nhắc nhở học tập từ Terracode";
        if (!body) body = `<p>Chào {{userName}},</p>
<p>Bạn đã thiết lập mục tiêu học tập <strong>{{dailyGoal}} phút</strong> mỗi ngày trên Terracode.</p>
<p>Hãy dành chút thời gian đăng nhập và hoàn thành mục tiêu hôm nay để duy trì chuỗi học tập nhé!</p>
<p><a href="{{loginUrl}}" style="padding: 10px 20px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 5px;">Đăng nhập để học ngay</a></p>
<p>Chúc bạn học tốt,<br/>Đội ngũ Terracode</p>`;

        return { success: true, subject: subject, body: body };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

function saveStudyReminderEmailTemplate(data) {
    try {
        if (!checkAdminRole()) {
            return { success: false, message: "Không có quyền truy cập" };
        }
        const props = PropertiesService.getScriptProperties();
        props.setProperty("EMAIL_REMINDER_SUBJECT", data.subject);
        props.setProperty("EMAIL_REMINDER_BODY", data.body);

        return { success: true };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}
