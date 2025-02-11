<?php
// ตั้งค่าการเชื่อมต่อฐานข้อมูล
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_username';
$password = 'your_password';

// ฟังก์ชันสำหรับทำความสะอาดข้อมูล
function clean_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// ตรวจสอบว่ามีการส่งฟอร์มหรือไม่
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // รับและทำความสะอาดข้อมูล
    $name = clean_input($_POST['name']);
    $email = clean_input($_POST['email']);
    $phone = clean_input($_POST['phone']);
    $message = clean_input($_POST['message']);

    // ตรวจสอบข้อมูลที่จำเป็น
    if (empty($name) || empty($email) || empty($message)) {
        echo "กรุณากรอกข้อมูลให้ครบถ้วน";
        exit;
    }

    // ตรวจสอบรูปแบบอีเมล
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "รูปแบบอีเมลไม่ถูกต้อง";
        exit;
    }

    try {
        // เชื่อมต่อฐานข้อมูล
        $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // เตรียมและรันคำสั่ง SQL
        $stmt = $pdo->prepare("INSERT INTO contacts (name, email, phone, message) VALUES (:name, :email, :phone, :message)");
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':message' => $message
        ]);

        // ส่งอีเมลแจ้งเตือน
        $to = "your_email@example.com";
        $subject = "ข้อความติดต่อใหม่จากเว็บไซต์";
        $email_message = "คุณได้รับข้อความใหม่จากเว็บไซต์:\n\n";
        $email_message .= "ชื่อ: $name\n";
        $email_message .= "อีเมล: $email\n";
        $email_message .= "เบอร์โทรศัพท์: $phone\n";
        $email_message .= "ข้อความ: $message\n";

        $headers = "From: webmaster@example.com";

        mail($to, $subject, $email_message, $headers);

        // แสดงข้อความสำเร็จ
        echo "ส่งข้อความเรียบร้อยแล้ว ขอบคุณที่ติดต่อเรา!";
    } catch(PDOException $e) {
        // แสดงข้อผิดพลาด (ในการใช้งานจริงควรบันทึกข้อผิดพลาดแทนการแสดงผล)
        echo "เกิดข้อผิดพลาด: " . $e->getMessage();
    }
} else {
    // ถ้าไม่ใช่การ POST ให้เปลี่ยนเส้นทางกลับไปหน้าหลัก
    header("Location: index.html");
    exit;
}
?>