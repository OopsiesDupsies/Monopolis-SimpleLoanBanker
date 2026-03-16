const QRCode = require('qrcode');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const jsqr = require('jsqr');

// Dummy Property Data (mimicking BankView)
const sampleProperty = {
    id: "prop-123456789",
    name: "Boardwalk (Test Property with Long Name)",
    price: 400,
    colorGroup: "Dark Blue",
    colorHex: "#00008B",
    houseCost: 200,
    hotelCost: 200,
    rentBase: 50,
    rent1House: 200,
    rent2House: 600,
    rent3House: 1400,
    rent4House: 1700,
    rentHotel: 2000,
    isRailroad: false,
    isUtility: false,
    ownerId: null, // "FOR SALE"
    isMortgaged: false,
    improvements: 0
};

// Compression Keys Map
const COMPRESS_MAP = {
    name: 'n',
    price: 'p',
    colorGroup: 'g',
    colorHex: 'h',
    houseCost: 'hc',
    hotelCost: 'hoc',
    rentBase: 'rb',
    rent1House: 'r1',
    rent2House: 'r2',
    rent3House: 'r3',
    rent4House: 'r4',
    rentHotel: 'rh',
    isRailroad: 'rr',
    isUtility: 'u',
    // We don't need id/ownerId/isMortgaged/improvements for template creation usually, 
    // but preserving them if exporting owned properties is good.
    id: 'id',
    ownerId: 'oid',
    isMortgaged: 'im',
    improvements: 'imp'
};

// Reverse Map for Decompression
const DECOMPRESS_MAP = Object.fromEntries(
    Object.entries(COMPRESS_MAP).map(([k, v]) => [v, k])
);

function compressProperty(prop) {
    const compressed = {};
    for (const key in prop) {
        if (COMPRESS_MAP[key]) {
            compressed[COMPRESS_MAP[key]] = prop[key];
        } else {
            compressed[key] = prop[key];
        }
    }
    return compressed;
}

function decompressProperty(compressed) {
    const prop = {};
    for (const key in compressed) {
        if (DECOMPRESS_MAP[key]) {
            prop[DECOMPRESS_MAP[key]] = compressed[key];
        } else {
            prop[key] = compressed[key];
        }
    }
    return prop;
}

async function testQR(payload, filename) {
    const jsonPayload = JSON.stringify(payload);
    console.log(`\nTesting payload size: ${jsonPayload.length} chars`);
    console.log(`Payload preview: ${jsonPayload.substring(0, 50)}...`);

    try {
        // Generate QR
        await QRCode.toFile(filename, jsonPayload, {
            errorCorrectionLevel: 'M',
            width: 400 // Simulate reasonable size
        });
        console.log(`Generated QR: ${filename}`);

        // Read QR back
        const buffer = fs.readFileSync(filename);
        const png = PNG.sync.read(buffer);

        const code = jsqr(png.data, png.width, png.height);

        if (code) {
            console.log("SCAN SUCCESS!");
            console.log("Decoded Data Length:", code.data.length);
            if (code.data === jsonPayload) {
                console.log("Data Match: PERFECT");
            } else {
                console.error("Data Match: FAILED");
                console.error("Expected:", jsonPayload);
                console.error("Got:", code.data);
            }
        } else {
            console.error("SCAN FAILED: Could not detect QR code.");
        }
    } catch (e) {
        console.error("Error generating/scanning QR:", e);
    }
}

// Schema for Array Compression (Order Matters!)
const PROPERTY_SCHEMA = [
    'name', 'price', 'colorGroup', 'colorHex', 'houseCost', 'hotelCost',
    'rentBase', 'rent1House', 'rent2House', 'rent3House', 'rent4House', 'rentHotel',
    'isRailroad', 'isUtility', 'ownerId', 'isMortgaged', 'improvements'
];

function compressToArray(prop) {
    return PROPERTY_SCHEMA.map(key => {
        let val = prop[key];
        // simple boolean compression
        if (typeof val === 'boolean') return val ? 1 : 0;
        // null/undefined check
        if (val === null || val === undefined) return '';
        return val;
    });
}

async function run() {
    console.log("=== QR Code Verification Test (High Volume) ===");

    // 1. Array Compression Single
    console.log("\n--- ARRAY COMPRESSED (Single) ---");
    const arraySingle = compressToArray(sampleProperty);
    await testQR(arraySingle, 'qr_array_single.png');

    // 2. Array Compression 100 Items
    console.log("\n--- ARRAY COMPRESSED (100 Items) ---");
    const manyProps = Array(100).fill(sampleProperty);
    const compressedMany = manyProps.map(compressToArray);

    // Check JSON length
    const payloadStr = JSON.stringify(compressedMany);
    console.log(`Raw JSON payload length: ${payloadStr.length}`);

    // Zlib Compression Test
    const zlib = require('zlib');
    const buffer = zlib.deflateSync(payloadStr);
    const base64 = buffer.toString('base64');
    console.log(`Compressed Base64 length: ${base64.length}`);

    if (base64.length < 4296) {
        console.log("SUCCESS: Fits in Version 40 QR (Alphanumeric Mode)!");
        // Try generating it
        await QRCode.toFile('qr_zlib_100.png', base64, {
            errorCorrectionLevel: 'L',
            width: 800
        });
        console.log("Generated qr_zlib_100.png");
    } else {
        console.error("FAILURE: Too large for Version 40 QR.");
    }
}

run();
