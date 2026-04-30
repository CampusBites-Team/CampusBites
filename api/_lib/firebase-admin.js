const admin = require("firebase-admin");

let app;

function getAdminApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is not set");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: " + err.message);
  }

  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  return app;
}

function getDb() {
  return getAdminApp().firestore();
}

module.exports = { admin, getAdminApp, getDb };
