const fs = require('fs');
let code = fs.readFileSync('workflow.md', 'utf8');

// Replace the old email dispatch explanation
const oldEmailPreamble = `Every email in the site is dispatched by writing a JSON payload document to the Firestore \`mail\` collection (used by the official Firebase "Trigger Email" extension). There is **no \`/api/mail/send\` Worker endpoint**; the Cloudflare Worker also writes directly to the Firestore \`mail\` collection via Google REST API`;

const newEmailPreamble = `Every automated order and quote email is dispatched securely by the **Cloudflare Worker** via a direct \`fetch()\` POST request to a dedicated **Google Apps Script Webhook** (running on \`orders.shilpsahayak@gmail.com\`).\n\nThe paid Firebase "Trigger Email" extension and the \`/mail\` Firestore collection have been completely **bypassed and replaced** to avoid Firebase paywalls.\n\nThere is **no \`/api/mail/send\` Worker endpoint**; the Cloudflare Worker writes directly to the webhook via REST API`;

code = code.replace(oldEmailPreamble, newEmailPreamble);

// Replace the Admin-Facing Alerts & Contact Form logic
const oldContactLogic = `  * **Staff Notification**:
    * **NO automatic staff notification**.
    * No email is queued, no webhook is fired, and there is no alert.`;

const newContactLogic = `  * **Staff Notification (UPDATED)**:
    * The frontend triggers a direct, silent \`fetch()\` call to a second **Google Apps Script Webhook** (running on \`info.shilpsahayak@gmail.com\`). 
    * This instantly emails the customer's full inquiry to \`info.shilpsahayak@gmail.com\`, setting the customer's address as the \`Reply-To\` field for easy communication.`;

code = code.replace(oldContactLogic, newContactLogic);

// Replace the outdated fact in "Critical Bugs"
const oldContactBug = `  * **Inquiries Admin Page**:
    * Customer contact messages write to Firestore \`/inquiries\``;

const newContactBug = `  * **Inquiries Admin Page (Partially Mitigated)**:
    * Customer contact messages write to Firestore \`/inquiries\` and trigger an email webhook to \`info.shilpsahayak@gmail.com\``;

code = code.replace(oldContactBug, newContactBug);

// Update Architecture Diagram
code = code.replace(/ColMail\["\/mail\/\{mailId\}\\n\(Email Queue\)"\]/g, 'GoogleWebhook1["Google Apps Script Webhook\\n(orders.shilpsahayak)"]');
code = code.replace(/MailExtension\["Firebase Trigger Email Extension\\n\(SMTP \/ SendGrid\)"\]/g, 'GoogleWebhook2["Google Apps Script Webhook\\n(info.shilpsahayak)"]');
code = code.replace(/Queue Confirmation Email\| ColMail/g, 'Trigger Confirmation Email| GoogleWebhook1');
code = code.replace(/ColMail -->\|Process Queue\| MailExtension\n\s+MailExtension -->\|Deliver to Customer\| UI/g, 'GoogleWebhook1 -->|Deliver to Customer| UI\n      UI -->|Contact Form Submit| GoogleWebhook2\n      GoogleWebhook2 -->|Alert Staff| AdminEmail');

fs.writeFileSync('workflow.md', code);
console.log('workflow.md updated.');
