import { zlibSync, unzlibSync, strToU8, strFromU8 } from 'fflate';

// Schema for Array Compression (Order Matters!)
const PROPERTY_SCHEMA = [
    'name', 'price', 'colorGroup', 'colorHex', 'houseCost', 'hotelCost',
    'rentBase', 'rent1House', 'rent2House', 'rent3House', 'rent4House', 'rentHotel',
    'isRailroad', 'isUtility', 'ownerId', 'isMortgaged', 'improvements'
];

// Convert Array to Base64 String
function uint8ToBase64(u8: Uint8Array): string {
    return btoa(String.fromCharCode.apply(null, u8 as any));
}

// Convert Base64 String to Uint8Array
function base64ToUint8(b64: string): Uint8Array {
    return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

function compressToArray(prop: any): any[] {
    return PROPERTY_SCHEMA.map(key => {
        let val = prop[key];
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (val === null || val === undefined) return '';
        return val;
    });
}

function decompressFromArray(arr: any[]): any {
    const prop: any = {};
    PROPERTY_SCHEMA.forEach((key, index) => {
        let val = arr[index];
        if (key.startsWith('is') && (val === 1 || val === 0)) val = Boolean(val);
        // Default ID if missing (for imported props)
        if (key === 'id' && !val) val = `import-${Date.now()}-${Math.random()}`;
        prop[key] = val;
    });
    // Add missing defaults if needed
    if (!prop.id) prop.id = `import-${Date.now()}-${Math.random()}`;
    return prop;
}

export function compressProperties(props: any[] | any): string {
    // 1. Normalize to Array
    const propsArray = Array.isArray(props) ? props : [props];

    // 2. Compress to Value Arrays
    const compressedArrays = propsArray.map(compressToArray);

    // 3. JSON Stringify
    const jsonStr = JSON.stringify(compressedArrays);

    // 4. Zlib Compress
    const compressedBuffer = zlibSync(strToU8(jsonStr), { level: 9 });

    // 5. Base64 Encode
    return uint8ToBase64(compressedBuffer);
}

export function decompressProperties(input: string): any[] {
    try {
        if (!input || typeof input !== 'string') throw new Error("Invalid Input");

        // 1. Inflate
        const buffer = base64ToUint8(input);
        const decompressedBuffer = unzlibSync(buffer);
        const jsonStr = strFromU8(decompressedBuffer);
        const parsed = JSON.parse(jsonStr);

        // 2. Decode Schema
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            return parsed.map(decompressFromArray);
        }

        throw new Error("Invalid Format");
    } catch (e) {
        console.error("QR Decompression Error:", e);
        throw e; // Re-throw to handle in UI
    }
}
