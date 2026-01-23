const http = require('http');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

const PORT = 5001;

// 1. MySQL Connection Pool
// Using a pool is better for performance than a single connection
const pool = mysql.createPool({
    host: 'auth-db1278.hstgr.io',
    user: 'u287260207_upsc_user',
    password: 'becomeIAS@2k26',
    database: 'u287260207_upsc',
    waitForConnections: true,
    
});

// 2. Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bluestonesoftwaredeveloper@gmail.com',
        pass: 'phkf paga sdhm bfmq' // Your App Password
    },
    tls: {
        rejectUnauthorized: false // Helps with local development certificate issues
    }
});

// 3. Create the Server
const server = http.createServer((req, res) => {
    // Standard CORS Headers to allow your HTML to talk to this server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Pre-flight request (CORS handshake)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Handle Routes: /submit-enquiry (Modal) or /submit-contact (Main Form)
    if (req.method === 'POST' && (req.url === '/submit-enquiry' || req.url === '/submit-contact')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const formType = req.url === '/submit-enquiry' ? 'SYLLABUS_MODAL' : 'CONTACT_FORM';
                
                // Prepared Statement Values
                // 'service' will contain the comma-separated string of courses from the frontend
               const values = [
    formType,
    data.name || null,
    data.email || null,
    data.phone || null,
    data.qualification || null,
    data.city || null,
    data.service || data.courses || "Not Specified", // Fallback if name is different
    data.message || null
];

                const query = `INSERT INTO leads 
                    (form_type, name, email, phone, qualification, city, service, message) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                // Execute Database Insert
                pool.execute(query, values, (err, results) => {
                    if (err) {
                        console.error("❌ SQL ERROR:", err.sqlMessage);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Database error', details: err.sqlMessage }));
                        return;
                    }

                    console.log(`🚀 Success: ${formType} saved (ID: ${results.insertId})`);

                    // --- EMAIL LOGIC ---
                    const adminEmail = 'bluestonesoftwaredeveloper@gmail.com'; // Change to your official receiver
                    const systemSender = 'bluestonesoftwaredeveloper@gmail.com';

                    // 1. Notification to Admin
                    const mailToAdmin = {
                        from: `"Bluestone WebBot" <${systemSender}>`,
                        to: adminEmail,
                        subject: `New Lead: ${formType} - ${data.name}`,
                        html: `
                            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
                                <h2 style="color: #0c2340;">New Website Enquiry</h2>
                                <hr>
                                <p><strong>Source:</strong> ${formType}</p>
                                <p><strong>Name:</strong> ${data.name}</p>
                                <p><strong>Email:</strong> ${data.email}</p>
                                <p><strong>Phone:</strong> ${data.phone}</p>
                                <p><strong>Qualification:</strong> ${data.qualification}</p>
                                <p><strong>City:</strong> ${data.city}</p>
                                <p><strong>Interested In:</strong> ${data.service}</p>
                                <p><strong>Message:</strong> ${data.message || 'N/A'}</p>
                            </div>`
                    };

                    // 2. Auto-reply to Student
                    const mailToUser = {
                        from: `"Bluestone IAS" <${systemSender}>`,
                        to: data.email,
                        subject: 'Application Received - Bluestone IAS',
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h3>Dear ${data.name},</h3>
                                <p>Thank you for choosing <strong>Bluestone IAS Academy</strong>.</p>
                                <p>Our academic mentors have received your interest in <b>${data.service}</b>. We will call you shortly at <b>${data.phone}</b> to discuss the curriculum and batch timings.</p>
                                <p>Best Regards,<br><strong>Admissions Team</strong><br>Race Course, Coimbatore</p>
                            </div>`
                    };

                    // Execute Sending (Async)
                    transporter.sendMail(mailToAdmin);
                    transporter.sendMail(mailToUser);

                    // Send Success Response back to Frontend
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'Success', message: 'Lead recorded' }));
                });
            } catch (err) {
                console.error("❌ Request Parsing Error:", err.message);
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON data' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Start Server
server.listen(PORT, () => {
    console.log(`\n✅ Bluestone IAS Backend Active`);
    console.log(`📡 Local Access: http://localhost:${PORT}`);
});