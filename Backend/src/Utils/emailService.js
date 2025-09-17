const nodemailer = require("nodemailer");

// Validate environment variables
const validateEmailConfig = () => {
    const requiredVars = ["SMTP_USER", "SMTP_PASS"];
    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
    }
};

// Create transporter with proper config
const createTransporter = () => {
    validateEmailConfig();

    // Default to Gmail if host not provided
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT) || 465;
    const secure = port === 465; // true for SSL, false for TLS

    const config = {
        host,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false, // allows self-signed certs
        },
    };

    console.log(
        `Creating transporter → host: ${host}, port: ${port}, secure: ${secure}`
    );
    return nodemailer.createTransport(config);
};

// Generate random verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email, code, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Email attempt ${attempt}/${retries}`);

            const transporter = createTransporter();

            // Verify SMTP connection
            await transporter.verify();
            console.log("✅ SMTP connection verified");

            const mailOptions = {
                from: process.env.SMTP_FROM || `"Your App" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Email Verification Code",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Email Verification</h2>
                        <p>Your verification code is: 
                           <strong style="font-size: 24px; color: #007bff;">${code}</strong>
                        </p>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                `,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("📩 Email sent → %s", info.messageId);

            transporter.close();
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed → ${error.message}`);

            if (error.code === "EAUTH") {
                return { success: false, error: "Authentication failed. Check your email & app password." };
            }
            if (error.code === "ECONNREFUSED") {
                console.error("SMTP connection refused. Check host & port.");
            }
            if (error.message.includes("Connection closed")) {
                console.error("SMTP connection closed → likely wrong secure/port or blocked by provider.");
            }

            if (attempt === retries) {
                return { success: false, error: error.message };
            }

            // Retry with exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
};

// Test config
const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log("✅ Email configuration is valid");
        return true;
    } catch (error) {
        console.error("❌ Email configuration error:", error.message);
        return false;
    }
};

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
    testEmailConfig,
};
