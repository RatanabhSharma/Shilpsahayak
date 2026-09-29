import os

with open("shilp-sahayak-r2/src/index.ts", "r", encoding="utf-8") as f:
    content = f.read()

email_trigger = """        // Trigger webhook
        const webhookUrl = env.MAIL_WEBHOOK_URL;
"""

firestore_save = """        // Save to Firestore using privileged access
        try {
          const firestoreToken = await getPrivilegedFirestoreAccessToken(env);
          const inquiryDocId = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const fbUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID}/databases/(default)/documents/inquiries/${inquiryDocId}`;
          const firestoreBody = {
            fields: {
              name: { stringValue: name },
              email: { stringValue: email },
              phone: { stringValue: phone || "" },
              subject: { stringValue: subject },
              message: { stringValue: message },
              createdAt: { timestampValue: new Date().toISOString() },
              status: { stringValue: "unread" }
            }
          };
          const fsRes = await fetch(fbUrl, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${firestoreToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(firestoreBody)
          });
          if (!fsRes.ok) {
            console.error("Failed to save inquiry to Firestore:", await fsRes.text());
          }
        } catch (e: any) {
          console.error("Error saving inquiry to Firestore:", e.message);
        }

        // Trigger webhook
        const webhookUrl = env.MAIL_WEBHOOK_URL;
"""

if "inquiries/${inquiryDocId}" not in content:
    content = content.replace(email_trigger, firestore_save)

with open("shilp-sahayak-r2/src/index.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.ts with Firestore save")
