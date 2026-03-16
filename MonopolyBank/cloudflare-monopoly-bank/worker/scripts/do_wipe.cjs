const fetch = require('node-fetch') || require('undici').fetch;

async function doWipe() {
    try {
        console.log("Triggering wipe...");
        const res = await fetch('https://monopoly-bank-worker.oopsoops-ty.workers.dev/api/wipe-database-danger');
        const data = await res.json();
        console.log("Wipe result:", data);
    } catch (e) {
        console.error("Wipe failed:", e);
    }
}

doWipe();
